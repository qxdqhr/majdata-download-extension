#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createInflateRaw } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST_ROOT = resolve(__dirname, '..');
const PID_FILE = join(HOST_ROOT, '.http-server.pid');

/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null;
/** @type {string | null} */
let currentUrl = null;

function writeMessage(payload) {
  const json = JSON.stringify(payload);
  const header = Buffer.alloc(4);
  header.writeUInt32LE(Buffer.byteLength(json, 'utf8'), 0);
  process.stdout.write(header);
  process.stdout.write(json, 'utf8');
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    try {
      process.kill(-serverProcess.pid, 'SIGTERM');
    } catch {
      serverProcess.kill('SIGTERM');
    }
  }
  serverProcess = null;
  currentUrl = null;
  void fs.unlink(PID_FILE).catch(() => undefined);
}

async function stopServerFromPidFile() {
  try {
    const raw = await fs.readFile(PID_FILE, 'utf8');
    const pid = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(pid) && pid > 0) {
      process.kill(-pid, 'SIGTERM');
    }
  } catch {
    // no previous server
  }
  serverProcess = null;
  currentUrl = null;
  await fs.unlink(PID_FILE).catch(() => undefined);
}

function httpServerBin() {
  return join(HOST_ROOT, 'node_modules', '.bin', 'http-server');
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function extractZipWithUnzip(zipPath, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  await new Promise((resolvePromise, reject) => {
    const child = spawn('unzip', ['-q', '-o', zipPath, '-d', targetDir], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise(undefined);
      else reject(new Error(stderr.trim() || `unzip exited with code ${code}`));
    });
  });
}

function readUInt16LE(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

async function extractZipEntry(stream, entry, targetDir) {
  const outPath = join(targetDir, entry.name);
  await fs.mkdir(dirname(outPath), { recursive: true });

  if (entry.compression === 0) {
    await pipeline(stream, createWriteStreamSafe(outPath));
    return;
  }
  if (entry.compression === 8) {
    await pipeline(stream, createInflateRaw(), createWriteStreamSafe(outPath));
    return;
  }
  throw new Error(`Unsupported ZIP compression method ${entry.compression} for ${entry.name}`);
}

function createWriteStreamSafe(outPath) {
  return createWriteStream(outPath);
}

async function parseZipCentralDirectory(zipPath) {
  const stat = await fs.stat(zipPath);
  const tailSize = Math.min(stat.size, 65557);
  const tail = Buffer.alloc(tailSize);
  const fd = await fs.open(zipPath, 'r');
  try {
    await fd.read(tail, 0, tailSize, stat.size - tailSize);

    let eocdOffset = -1;
    for (let i = tail.length - 22; i >= 0; i -= 1) {
      if (tail.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) throw new Error('Invalid ZIP: EOCD not found');

    const centralDirOffset = tail.readUInt32LE(eocdOffset + 16);
    const totalEntries = tail.readUInt16LE(eocdOffset + 10);

    const entries = [];
    let offset = centralDirOffset;
    const header = Buffer.alloc(46);

    for (let i = 0; i < totalEntries; i += 1) {
      await readExact(fd, header, 0, 46, offset);
      const signature = header.readUInt32LE(0);
      if (signature !== 0x02014b50) throw new Error('Invalid ZIP central directory');

      const compression = header.readUInt16LE(10);
      const compressedSize = header.readUInt32LE(20);
      const fileNameLength = header.readUInt16LE(28);
      const extraLength = header.readUInt16LE(30);
      const commentLength = header.readUInt16LE(32);
      const localHeaderOffset = header.readUInt32LE(42);

      const nameBuffer = Buffer.alloc(fileNameLength);
      await readExact(fd, nameBuffer, 0, fileNameLength, offset + 46);
      const name = nameBuffer.toString('utf8').replace(/\\/g, '/');
      if (name.endsWith('/')) {
        offset += 46 + fileNameLength + extraLength + commentLength;
        continue;
      }

      entries.push({
        name,
        compression,
        compressedSize,
        localHeaderOffset,
      });
      offset += 46 + fileNameLength + extraLength + commentLength;
    }

    return entries;
  } finally {
    await fd.close();
  }
}

async function readExact(fd, buffer, offset, length, position) {
  let read = 0;
  while (read < length) {
    const result = await fd.read(buffer, offset + read, length - read, position + read);
    if (result.bytesRead === 0) throw new Error('Unexpected EOF while reading ZIP');
    read += result.bytesRead;
  }
}

async function extractZipWithNode(zipPath, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await parseZipCentralDirectory(zipPath);
  const fd = await fs.open(zipPath, 'r');
  try {
    for (const entry of entries) {
      const localHeader = Buffer.alloc(30);
      await readExact(fd, localHeader, 0, 30, entry.localHeaderOffset);
      const fileNameLength = readUInt16LE(localHeader, 26);
      const extraLength = readUInt16LE(localHeader, 28);
      const dataOffset = entry.localHeaderOffset + 30 + fileNameLength + extraLength;
      const stream = createReadStream(zipPath, {
        start: dataOffset,
        end: dataOffset + entry.compressedSize - 1,
      });
      await extractZipEntry(stream, entry, targetDir);
    }
  } finally {
    await fd.close();
  }
}

async function extractZip(zipPath, targetDir) {
  if (await pathExists('/usr/bin/unzip') || await pathExists('/bin/unzip')) {
    try {
      await extractZipWithUnzip(zipPath, targetDir);
      return;
    } catch {
      // fall back to built-in extractor
    }
  }
  await extractZipWithNode(zipPath, targetDir);
}

async function resolveServeRoot({ path, zipPath, extractZip: shouldExtract }) {
  if (zipPath) {
    const zip = resolve(zipPath);
    if (!(await pathExists(zip))) {
      throw new Error(`ZIP 不存在: ${zip}`);
    }
    if (!shouldExtract) {
      return dirname(zip);
    }
    const targetDir = zip.endsWith('.zip') ? zip.slice(0, -4) : `${zip}-extracted`;
    await extractZip(zip, targetDir);
    return targetDir;
  }

  if (!path) {
    throw new Error('缺少 path 或 zipPath');
  }

  const root = resolve(path);
  if (!(await pathExists(root))) {
    throw new Error(`目录不存在: ${root}`);
  }
  return root;
}

async function startHttpServer(root, port) {
  await stopServerFromPidFile();

  const bin = httpServerBin();
  if (!(await pathExists(bin))) {
    throw new Error('未找到 http-server，请在 native-host 目录运行 npm install');
  }

  serverProcess = spawn(bin, [root, '-p', String(port), '-a', '127.0.0.1', '-c-1'], {
    detached: true,
    stdio: 'ignore',
    cwd: HOST_ROOT,
  });

  if (!serverProcess.pid) {
    throw new Error('http-server 启动失败');
  }

  await fs.writeFile(PID_FILE, String(serverProcess.pid), 'utf8');
  serverProcess.unref();
  currentUrl = `http://127.0.0.1:${port}`;

  await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));

  return currentUrl;
}

async function handleRequest(message) {
  const cmd = message?.cmd;
  if (cmd === 'ping') {
    return { ok: true, running: Boolean(serverProcess), url: currentUrl ?? undefined };
  }
  if (cmd === 'status') {
    return { ok: true, running: Boolean(serverProcess), url: currentUrl ?? undefined };
  }
  if (cmd === 'stop') {
    await stopServerFromPidFile();
    return { ok: true, running: false };
  }
  if (cmd === 'servePath' || cmd === 'serveZip') {
    const port = Number.isFinite(message.port) ? Number(message.port) : 8080;
    const root = await resolveServeRoot({
      path: message.path,
      zipPath: message.zipPath,
      extractZip: cmd === 'serveZip' ? message.extractZip !== false : false,
    });
    const url = await startHttpServer(root, port);
    return { ok: true, url, root, running: true };
  }
  throw new Error(`未知命令: ${cmd}`);
}

let stdinEnded = false;
/** @type {number} */
let pendingRequests = 0;

function maybeExit() {
  if (stdinEnded && pendingRequests === 0) {
    process.exit(0);
  }
}

function startNativeMessagingLoop() {
  let pending = Buffer.alloc(0);

  process.stdin.on('readable', () => {
    let chunk;
    while ((chunk = process.stdin.read()) !== null) {
      pending = Buffer.concat([pending, chunk]);
      while (pending.length >= 4) {
        const length = pending.readUInt32LE(0);
        if (pending.length < 4 + length) break;
        const json = pending.subarray(4, 4 + length).toString('utf8');
        pending = pending.subarray(4 + length);
        pendingRequests += 1;
        void (async () => {
          try {
            const request = JSON.parse(json);
            const response = await handleRequest(request);
            writeMessage(response);
          } catch (error) {
            writeMessage({
              ok: false,
              error: error instanceof Error ? error.message : 'Native host error',
            });
          } finally {
            pendingRequests -= 1;
            maybeExit();
          }
        })();
      }
    }
  });

  process.stdin.on('end', () => {
    stdinEnded = true;
    maybeExit();
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  startNativeMessagingLoop();
}
