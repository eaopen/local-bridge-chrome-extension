import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('extension');
const m = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
assert.equal(m.manifest_version, 3);
assert.equal(m.background?.type, 'module');
assert.equal(m.background?.service_worker, 'background.js');
assert.deepEqual(m.permissions.sort(), ['activeTab', 'scripting', 'storage'].sort());
assert.deepEqual(m.optional_permissions, ['nativeMessaging']);
assert.deepEqual(m.optional_host_permissions.sort(), ['http://*/*', 'https://*/*'].sort());
assert.ok(!m.host_permissions);
assert.ok(!m.externally_connectable);
assert.ok(!m.content_scripts);
assert.ok(m.minimum_chrome_version >= '116');
assert.match(m.version, /^\d+\.\d+\.\d+$/);

const required = ['background.js', 'content.js', 'lib/protocol.js', 'popup.html',
  'popup.js', 'popup.css', 'icons/icon16.png', 'icons/icon32.png',
  'icons/icon48.png', 'icons/icon128.png'];
for (const name of required) {
  assert.ok(statSync(join(root, name)).isFile(), `Missing ${name}`);
}
for (const [size, file] of [[16,'icons/icon16.png'],[32,'icons/icon32.png'],
  [48,'icons/icon48.png'],[128,'icons/icon128.png']]) {
  const bytes = readFileSync(join(root, file));
  assert.equal(bytes.subarray(1,4).toString(), 'PNG');
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.(m?js|html)$/.test(file)) {
      const data = readFileSync(file, 'utf8');
      assert.doesNotMatch(data, /<script[^>]+src=["']https?:/i);
      assert.doesNotMatch(data, /\b(?:eval|new Function)\s*\(/);
    }
  }
}
walk(root);
console.log(`Manifest v${m.version}, permissions, packaged assets and icons: OK`);
