import test from 'node:test';
import assert from 'node:assert/strict';
import {WEB_V2_CHANNEL, validWebV2Request, nativeV2Request, parseNativeV2Response} from '../extension/lib/protocol.js';

const base = {channel:WEB_V2_CHANNEL,type:'REQUEST',version:2,requestId:'test-1'};
test('V2 only permits bounded capabilities and MCP status',()=>{
  assert.equal(validWebV2Request({...base,action:'local.capabilities',params:{}}),true);
  assert.equal(validWebV2Request({...base,action:'mcp.status',
    params:{provider:'wechat',tool:'wechat_status'}}),true);
  for(const action of ['mcp.call','agent.run','wechat_send_message','shell.exec','file.write']){
    assert.equal(validWebV2Request({...base,action,params:{provider:'wechat',tool:'wechat_status'}}),false);
  }
  for(const params of [
    {provider:'wechat',tool:'wechat_send_message'},
    {provider:'wechat',tool:'wechat_get_messages'},
    {provider:'wechat',tool:'wechat_status',args:{}},
    {provider:'../../evil',tool:'wechat_status'},
    {provider:'wechat',tool:'status',command:'exec'},
  ]) assert.equal(validWebV2Request({...base,action:'mcp.status',params}),false);
});

test('V2 Native requests are separately versioned and origin bounded',()=>{
  const req=nativeV2Request('web.v2.mcp.status',
    {origin:'https://app.example.test',provider:'wechat',tool:'wechat_status'},'task-1');
  assert.equal(req.protocol_version,2);
  assert.equal(req.request_id,'task-1');
  for(const payload of [
    {origin:'https://evil.test/path',provider:'wechat',tool:'wechat_status'},
    {origin:'file:///etc',provider:'wechat',tool:'wechat_status'},
    {origin:'https://app.example.test',provider:'wechat',tool:'wechat_send_message'},
  ]) assert.throws(()=>nativeV2Request('web.v2.mcp.status',payload,'task-1'));
  assert.throws(()=>nativeV2Request('web.v2.agent.run',
    {origin:'https://app.example.test'},'task-1'));
  assert.equal(parseNativeV2Response({protocol_version:2,request_id:'task-1',
    ok:true,result:{ok:true}},'task-1').ok,true);
  assert.throws(()=>parseNativeV2Response({protocol_version:1,request_id:'task-1',
    ok:true},'task-1'));
});
