'use strict';
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const client = path.join(root, 'dist/client');
fs.mkdirSync(client, { recursive: true });
fs.cpSync(path.join(root, 'app'), client, { recursive: true });
fs.copyFileSync(path.join(root, 'LICENSE.md'), path.join(client, 'LICENSE.md'));
fs.mkdirSync(path.join(root, 'dist/server'), { recursive: true });
fs.copyFileSync(path.join(root, 'server/rooms.mjs'), path.join(root, 'dist/server/index.js'));
if (fs.existsSync(path.join(root, '.openai/hosting.json'))) {
  fs.mkdirSync(path.join(root, 'dist/.openai'), { recursive: true });
  fs.copyFileSync(path.join(root, '.openai/hosting.json'), path.join(root, 'dist/.openai/hosting.json'));
}
fs.cpSync(path.join(root, 'drizzle'), path.join(root, 'dist/drizzle'), { recursive: true });
// Keep the portable, ready-to-play dist entry in sync too.
for (const entry of fs.readdirSync(path.join(root, 'app'))) {
  fs.cpSync(path.join(root, 'app', entry), path.join(root, 'dist', entry), { recursive: true });
}
console.log('Built cooperative client, Worker and D1 migrations.');
