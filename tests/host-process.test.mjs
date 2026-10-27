import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {encodeFrame,FrameParser} from '../native-host/reference-protocol.mjs';

test('reference host responds over true Chrome Native Messaging framing',async()=>{
  const host=fileURLToPath(new URL('../native-host/reference-host.mjs',import.meta.url));
  const child=spawn(process.execPath,[host],{stdio:['pipe','pipe','pipe']});
  const messages=[];const parse=new FrameParser(value=>messages.push(value));
  let stderr='';child.stderr.on('data',d=>{stderr+=String(d)});
  child.stdout.on('data',bytes=>parse.push(bytes));
  child.stdin.end(encodeFrame({protocol_version:1,request_id:'hello',action:'host.status',payload:{}}));
  const exit=await new Promise((resolve,reject)=>{
    child.on('error',reject);child.on('close',resolve);
  });
  assert.equal(exit,0,stderr);
  assert.equal(messages.length,1);
  assert.equal(messages[0].ok,true);
  assert.equal(messages[0].request_id,'hello');
  assert.equal(messages[0].result.connected_to_local_bridge,false);
});
