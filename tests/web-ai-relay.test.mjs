import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEB_AI_TARGETS, webAiUrl, validTaskRef,
  createPendingRelay, webAiPrompt, validatePendingRelay,
  relayReturnPayload, relayReturnText
} from '../extension/lib/web-ai-relay.js';

test('Web chat destinations only open predefined sites or explicit HTTPS custom URL',()=>{
  assert.equal(webAiUrl('chatgpt'),'https://chatgpt.com/');
  assert.equal(webAiUrl('gemini'),'https://gemini.google.com/app');
  assert.equal(webAiUrl('custom','https://my-ai.example/chat'),'https://my-ai.example/chat');
  for(const bad of [
    'http://example.com/chat', 'javascript:alert(1)', 'https://me:password@example.com/',
    'https://example.com/?token=secret','https://localhost/chat','file:///etc/passwd'
  ]) assert.throws(()=>webAiUrl('custom',bad),bad);
  assert.throws(()=>webAiUrl('unknown'));
  assert.equal(Object.keys(WEB_AI_TARGETS).length,5);
});

test('copyable prompt strips URL secrets, preserves context and never claims local work',()=>{
  const raw={title:'Test article',url:'https://user:pass@example.test/page?auth=secret#frag',selection:'Fix compilation issue: missing import.'};
  const p=webAiPrompt(raw,'ctx-abcdef012345');
  assert.ok(p.includes('Fix compilation issue'));
  assert.ok(p.includes('ctx-abcdef012345'));
  assert.ok(p.includes('cannot access or change my local files'));
  assert.ok(!p.includes('auth=secret'));
  assert.ok(!p.includes('user:pass'));
  assert.equal(validTaskRef('../etc/passwd'),false);
  assert.throws(()=>webAiPrompt(raw,'../bad'));
  assert.throws(()=>webAiPrompt({...raw,selection:' '}));
});

test('only one lightweight pending relation stored, never full prompt or response',()=>{
  const raw={title:'test',url:'https://example.test/source?secret=x',selection:'Private content is not stored in Chrome.'};
  const pending=createPendingRelay(raw,'chatgpt','ctx-abcdef012345',
    'rel-0123456789abcdef0123456789abcdef',10000);
  assert.equal(pending.source.url,'https://example.test/source');
  assert.equal(pending.task_ref,'ctx-abcdef012345');
  assert.ok(!JSON.stringify(pending).includes('Private content'));
  assert.equal(validatePendingRelay(pending).relay_id,pending.relay_id);
  assert.throws(()=>createPendingRelay(raw,'chatgpt','','../bad',10000));
});

test('manual return is bounded, linked and is a suggestion not executed work',()=>{
  const pending=createPendingRelay({title:'Original',url:'https://example.test/',selection:'Task'},
    'gemini','ctx-abcdef012345','rel-0123456789abcdef0123456789abcdef',10000);
  const reply={title:'Gemini answer',url:'https://gemini.google.com/app?session=private#part',
    selection:'Here is a proposed diff. Not executed.'};
  const payload=relayReturnPayload(pending,reply);
  assert.equal(payload.reply.url,'https://gemini.google.com/app');
  assert.equal(payload.task_ref,'ctx-abcdef012345');
  assert.equal(payload.web_ai,'gemini');
  assert.ok(relayReturnText(pending,reply).includes('Response (unverified):'));
  assert.throws(()=>relayReturnPayload(pending,{...reply,selection:' '}));
  assert.throws(()=>relayReturnPayload(pending,{...reply,selection:'x'.repeat(16001)}));
});
