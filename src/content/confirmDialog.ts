import type { ConfirmChoice } from '@/shared/types';

const HOST_ID = 'majdata-ext-confirm-host';

function ensureHost(): HTMLElement {
  let host = document.getElementById(HOST_ID);
  if (host) return host;

  host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  return host;
}

export function showConfirmDialog(title: string): Promise<ConfirmChoice> {
  return new Promise((resolve) => {
    const host = ensureHost();
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        :host, * { box-sizing: border-box; }
        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483646;
          font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .dialog {
          width: min(92vw, 420px);
          background: #fff;
          color: #111;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
        }
        .title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 700;
        }
        .song {
          margin: 0 0 16px;
          font-size: 14px;
          color: #444;
          word-break: break-word;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }
        button {
          border: none;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          cursor: pointer;
        }
        .primary { background: #2563eb; color: #fff; }
        .secondary { background: #059669; color: #fff; }
        .ghost { background: #e5e7eb; color: #111; }
        button:hover { filter: brightness(0.95); }
      </style>
      <div class="backdrop" part="backdrop">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="majdata-ext-title">
          <h2 class="title" id="majdata-ext-title">选择下载方式</h2>
          <p class="song">${escapeHtml(title)}</p>
          <div class="actions">
            <button type="button" class="ghost" data-choice="cancel">取消</button>
            <button type="button" class="secondary" data-choice="queue">加入下载列表</button>
            <button type="button" class="primary" data-choice="direct">直接下载</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = shadow.querySelector('.backdrop') as HTMLElement;

    const cleanup = (choice: ConfirmChoice) => {
      shadow.innerHTML = '';
      document.removeEventListener('keydown', onKeyDown);
      resolve(choice);
    };

    shadow.querySelectorAll<HTMLButtonElement>('button[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        cleanup(btn.dataset.choice as ConfirmChoice);
      });
    });

    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) cleanup('cancel');
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cleanup('cancel');
    };
    document.addEventListener('keydown', onKeyDown);
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
