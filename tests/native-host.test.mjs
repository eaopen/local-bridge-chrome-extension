import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeFrame,FrameParser,handleNative} from '../native-host/reference-protocol.mjs';

test('native frame parser accepts split/concatenated messages',()=>{
  const out=[];const parser=new FrameParser(x=>out.push(x));
  const a=encodeFrame({id:1}),b=encodeFrame({id:2});
  const both=Buffer.concat([a,b]);parser.push(both.subarray(0,2));
  assert.equal(out.length,0);parser.push(both.subarray(2));
  assert.deepEqual(out,[{id:1},{id:2}]);
});
test('native frame refuses excess length',()=>{
  const parser=new FrameParser(()=>{});const bad=Buffer.alloc(4);bad.writeUInt32LE(1024*1024,0);
  assert.throws(()=>parser.push(bad));
});
test('reference host never claims real local bridge execution',()=>{
  const base={protocol_version:1,request_id:'a1'};
  const status=handleNative({...base,action:'host.status',payload:{}});
  assert.equal(status.ok,true);assert.equal(status.result.connected_to_local_bridge,false);
  const share=handleNative({...base,action:'context.share',payload:{title:'a',url:'b',selection:'c'}});
  assert.equal(share.ok,true);assert.equal(share.result.forwarded,false);
  assert.equal(handleNative({...base,action:'shell.run'}).ok,false);
});
