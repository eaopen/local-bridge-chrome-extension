import test from 'node:test';
import assert from 'node:assert/strict';
import {validRequestId, validatedOrigin, hostMatch, sanitizePage, formatContext,
  nativeRequest, parseNativeResponse, validWebRequest, validateHostName, WEB_CHANNEL} from '../extension/lib/protocol.js';

test('page context sanitization is bounded and strips query, fragment and credentials', () => {
  const c=sanitizePage({url:'https://user:password@example.com/folder/?token=secret#part',
    title:'Hello',selection:'x'.repeat(30000)});
  assert.equal(c.url,'https://example.com/folder/');
  assert.equal(c.selection.length,16000);
  assert.ok(!formatContext(c).includes('secret'));
  assert.ok(!formatContext(c).includes('password'));
});
test('origin validation is strict', () => {
  assert.equal(validatedOrigin('https://example.com/'),'https://example.com');
  assert.equal(validatedOrigin('http://localhost:4000/'),'http://localhost:4000');
  for(const bad of ['https://example.com/path','file:///etc/hosts','https://u:p@example.com/',
    'http://example.com/?q=1','https://example.com.evil.test/path','chrome://settings']) {
    assert.equal(validatedOrigin(bad),null,bad);
  }
  assert.equal(hostMatch('https://example.com'),'https://example.com/*');
  assert.equal(hostMatch('http://localhost:4000'),'http://localhost/*');
  assert.equal(hostMatch('http://[::1]:4000'),null);
});
test('native protocol only has approved operations, correlated responses', () => {
  const r=nativeRequest('context.share',{title:'t',url:'u',selection:'s'},'id_1');
  assert.equal(r.action,'context.share');
  assert.throws(()=>nativeRequest('shell.exec',{},'id1'));
  assert.throws(()=>nativeRequest('context.share',{title:'x'.repeat(70000)},'id1'));
  assert.equal(parseNativeResponse({protocol_version:1,request_id:'id_1',ok:true,result:{received:true}},'id_1').ok,true);
  assert.throws(()=>parseNativeResponse({protocol_version:1,request_id:'other',ok:true},'id_1'));
  assert.equal(validRequestId('a.b-c_1'),true);
  assert.equal(validRequestId('bad id'),false);
});
test('web contract allows discovery only',()=>{
  const base={channel:WEB_CHANNEL,type:'REQUEST',version:1,requestId:'request-1',params:{}};
  assert.equal(validWebRequest({...base,action:'extension.status'}),true);
  assert.equal(validWebRequest({...base,action:'native.status'}),true);
  for(const action of ['native.invoke','context.share','shell.exec','file.open'])
    assert.equal(validWebRequest({...base,action}),false);
  assert.equal(validWebRequest({...base,action:'extension.status',params:{command:'rm'}}),false);
  assert.equal(validWebRequest({...base,action:'extension.status',shell:'rm'}),false);
});

test('user-configured native host name must be an installed-host identifier, not a URL or command', () => {
  for (const name of ['com.eaopen.browser_bridge', 'org.example.local_adapter'])
    assert.equal(validateHostName(name), true);
  for (const name of ['com', 'HTTP://localhost', 'org.example;rm', '../bin/sh',
    'Com.UPPER.host', 'com.example..host', '.host', 'com.example/other', ''])
    assert.equal(validateHostName(name), false, name);
});
