import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.PORT, config.HOST, () => {
  console.log('SHARKS backend listening on http://' + config.HOST + ':' + config.PORT);
});
