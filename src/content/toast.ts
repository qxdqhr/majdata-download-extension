const TOAST_HOST_ID = 'majdata-ext-toast-host';

export function showToast(message: string, durationMs = 2800): void {
  let host = document.getElementById(TOAST_HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = TOAST_HOST_ID;
    document.documentElement.appendChild(host);
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      .toast {
        position: fixed;
        left: 50%;
        bottom: 28px;
        transform: translateX(-50%);
        background: rgba(17, 24, 39, 0.92);
        color: #fff;
        padding: 10px 16px;
        border-radius: 999px;
        font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
        z-index: 2147483647;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      }
    </style>
    <div class="toast">${escapeHtml(message)}</div>
  `;

  window.setTimeout(() => {
    shadow.innerHTML = '';
  }, durationMs);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
