// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { parseSongContext } from '@/content/parseSongContext';
import { findDownloadButton } from '@/content/findDownloadButton';

// Snapshot structure from live majdata.net homepage (2026-06-04)
const MAJDATA_CARD_HTML = `
<div id="00477a07-8cf6-4be4-a950-5b93fc7e66f3" class="flex justify-center w-full">
  <div style="min-height:165px;min-width:352px">
    <div class="bg-[rgb(var(--background-start)/0.8)] m-auto p-[0.8rem] rounded-[10px] w-[20rem] h-40 overflow-hidden">
      <img class="float-left rounded-[10px] h-full aspect-square object-cover" src="/api3/api/maichart/00477a07-8cf6-4be4-a950-5b93fc7e66f3/image" alt="" />
      <div class="ml-[8.9rem]">
        <div class="mb-1.25 font-bold text-base truncate" id="00477a07-8cf6-4be4-a950-5b93fc7e66f3">
          <a href="/song?id=00477a07-8cf6-4be4-a950-5b93fc7e66f3">测试歌曲</a>
        </div>
        <div class="mb-[0.3rem] text-[0.8rem] truncate italic">
          <a href="/song?id=00477a07-8cf6-4be4-a950-5b93fc7e66f3">Artist Name</a>
        </div>
        <div class="float-left m-[0.1rem] mt-2 border cursor-pointer select-none download-btn">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 -960 960 960">
            <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</div>
`;

describe('parseSongContext integration', () => {
  it('parses majdata homepage SongCard from download button click target', () => {
    document.body.innerHTML = MAJDATA_CARD_HTML;
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://majdata.net', pathname: '/', search: '', href: 'https://majdata.net/' },
      writable: true,
    });

    const path = document.querySelector('path[d*="480-320"]')!;
    const button = findDownloadButton(path);
    expect(button).not.toBeNull();

    const ctx = parseSongContext(button!);
    expect(ctx).not.toBeNull();
    expect(ctx!.songId).toBe('00477a07-8cf6-4be4-a950-5b93fc7e66f3');
    expect(ctx!.title).toBe('测试歌曲');
    expect(ctx!.assets.track).toContain('00477a07-8cf6-4be4-a950-5b93fc7e66f3');
  });
});
