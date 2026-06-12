#!/usr/bin/env node
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'native-host');
const target = join(root, 'public', 'native-host');

rmSync(target, { recursive: true, force: true });
mkdirSync(join(target, 'src'), { recursive: true });
cpSync(join(source, 'package.json'), join(target, 'package.json'));
cpSync(join(source, 'src', 'host.mjs'), join(target, 'src', 'host.mjs'));

console.log('synced native-host → public/native-host');
