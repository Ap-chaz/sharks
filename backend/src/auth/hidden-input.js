import { stdin, stdout } from 'node:process';

export function askHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      return reject(new Error('A real terminal is required for hidden input.'));
    }
    stdout.write(prompt);
    let value = '';
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const finish = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };

    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === '\r' || c === '\n') {
          finish();
          return resolve(value);
        }
        if (c === '\u0003') {
          finish();
          return reject(new Error('Cancelled.'));
        }
        if (c === '\u007f' || c === '\b') {
          value = value.slice(0, -1);
        } else {
          value += c;
        }
      }
    };

    stdin.on('data', onData);
  });
}
