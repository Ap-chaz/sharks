import { createApp } from './app.js';
import { config } from './config.js';
import { cleanupOldRows } from './auth/cleanup.js';

const app = createApp();

async function runCleanup() {
  try {
    const r = await cleanupOldRows();
    console.log('Cleanup removed:', JSON.stringify(r));
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }
}

app.listen(config.PORT, config.HOST, () => {
  runCleanup();
  setInterval(runCleanup, 24 * 60 * 60 * 1000).unref();
  console.log('SHARKS backend listening on http://' + config.HOST + ':' + config.PORT);
});
