import { installDownloadInterceptor } from '@/content/intercept';
import { defineContentScript } from 'wxt/utils/define-content-script';

export default defineContentScript({
  matches: ['https://majdata.net/*', 'https://www.majdata.net/*'],
  runAt: 'document_idle',
  main() {
    installDownloadInterceptor();
  },
});
