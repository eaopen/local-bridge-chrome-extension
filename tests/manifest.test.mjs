import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const m=JSON.parse(readFileSync(new URL('../extension/manifest.json',import.meta.url)));

test('MV3 store-first minimal permissions and no blanket page access',()=>{
  assert.equal(m.manifest_version,3);
  assert.deepEqual(m.permissions,['activeTab','scripting','storage']);
  assert.deepEqual(m.optional_permissions,['nativeMessaging']);
  assert.equal(m.externally_connectable,undefined);
  assert.equal(m.host_permissions,undefined);
  assert.equal(m.content_scripts,undefined);
  assert.equal(m.background.type,'module');
});
