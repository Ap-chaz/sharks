import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.PORT, '127.0.0.1', () => {
  console.log('SHARKS backend listening on http://127.0.0.1:' + config.PORT);
});
