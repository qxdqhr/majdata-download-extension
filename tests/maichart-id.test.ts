// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  extractSongIdFromElement,
  extractSongIdFromHref,
  extractSongIdFromListCard,
  extractSongIdFromLocation,
  extractSongIdFromMaichartUrl,
  findSongContainer,
} from '@/shared/maichart-id';

const DOWNLOAD_PATH =
  'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z';

describe('maichart-id', () => {
  it('extracts id from maichart image url', () => {
    expect(extractSongIdFromMaichartUrl('/api3/api/maichart/abc123/image')).toBe('abc123');
  });

  it('extracts id from song href', () => {
    expect(extractSongIdFromHref('/song?id=hello')).toBe('hello');
  });

  it('extracts id from location on detail page', () => {
    const location = { pathname: '/song', search: '?id=xyz' } as Location;
    expect(extractSongIdFromLocation(location)).toBe('xyz');
  });

  it('extracts id from location with trailing slash', () => {
    const location = { pathname: '/song/', search: '?id=xyz' } as Location;
    expect(extractSongIdFromLocation(location)).toBe('xyz');
  });

  it('finds song id from card cover image when title is span only', () => {
    document.body.innerHTML = `
      <div class="song-card">
        <img src="https://majdata.net/api3/api/maichart/card-id-1/image" alt="cover" />
        <span class="font-bold">曲名测试</span>
        <div class="cursor-pointer download-btn">
          <svg><path d="${DOWNLOAD_PATH}" /></svg>
        </div>
      </div>
    `;
    const button = document.querySelector('.download-btn') as HTMLElement;
    const container = findSongContainer(button);
    expect(container).not.toBeNull();
    expect(extractSongIdFromElement(container!)).toBe('card-id-1');
  });

  it('finds song id from majdata SongCard outer div id', () => {
    document.body.innerHTML = `
      <div id="00477a07-8cf6-4be4-a950-5b93fc7e66f3" class="flex w-full">
        <div class="card-inner">
          <img src="/api3/api/maichart/00477a07-8cf6-4be4-a950-5b93fc7e66f3/image" alt="" />
          <div class="ml-[8.9rem]">
            <span class="truncate">Title only no link</span>
            <div class="cursor-pointer download-btn">
              <svg><path d="${DOWNLOAD_PATH}" /></svg>
            </div>
          </div>
        </div>
      </div>
    `;
    const button = document.querySelector('.download-btn') as HTMLElement;
    expect(extractSongIdFromListCard(button)).toBe('00477a07-8cf6-4be4-a950-5b93fc7e66f3');
  });

  it('finds song id from h1 id on detail page', () => {
    document.body.innerHTML = `
      <main>
        <h1 id="detail-song-id">测试谱面</h1>
        <button title="Download"><span>下载</span></button>
      </main>
    `;
    const root = document.querySelector('main')!;
    expect(extractSongIdFromElement(root)).toBe('detail-song-id');
  });
});
