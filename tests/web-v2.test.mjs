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

test('WorkBuddy start and multiple poll replies have bounded v2 contracts',()=>{
  const start={...base,requestId:'wb-start-1',action:'agent.start',
    params:{provider:'workbuddy',client_key:'client-task-123',
      prompt:'Summarize this fictional meeting'}};
  assert.equal(validWebV2Request(start),true);
  const native=nativeV2Request('web.v2.agent.start',
    {origin:'https://app.example.test',...start.params},'wb-start-1');
  assert.equal(native.protocol_version,2);
  for(const bad of [
    {...start,params:{...start.params,provider:'shell'}},
    {...start,params:{...start.params,client_key:'../unsafe'}},
    {...start,params:{...start.params,prompt:'x'.repeat(13000)}},
    {...start,params:{...start.params,tools:['write']}},
  ]) assert.equal(validWebV2Request(bad),false);
  const poll={...base,requestId:'wb-poll-1',action:'agent.poll',
    params:{task_id:'wb-abcde-1234-0',cursor:0}};
  assert.equal(validWebV2Request(poll),true);
  assert.equal(nativeV2Request('web.v2.agent.poll',
    {origin:'https://app.example.test',...poll.params},'wb-poll-1').protocol_version,2);
  assert.equal(validWebV2Request({...poll,params:{...poll.params,cursor:-1}}),false);
  assert.equal(validWebV2Request({...poll,params:{...poll.params,cursor:'0'}}),false);
  const response=parseNativeV2Response({protocol_version:2,request_id:'wb-poll-1',
    ok:true,result:{status:'running',next_seq:2,events:[
      {seq:1,type:'message.delta',message_id:'m1',text:'Hello'},
      {seq:2,type:'message.final',message_id:'m1'}]}},'wb-poll-1');
  assert.equal(response.result.status,'running');
  assert.equal(response.result.events.length,2);
  assert.notEqual(response.result.status,'completed');
});

test('bootstrap is separate and cannot accept page-supplied origin or command',()=>{
 const req={...base,action:'local.connect',params:{}};
 assert.equal(validWebV2Request(req),true);
 assert.equal(validWebV2Request({...req,params:{origin:'https://attacker.test'}}),false);
 const native=nativeV2Request('web.v2.session.issue',
   {origin:'https://app.example.test'},'connect-1');
 assert.equal(native.protocol_version,2);
 assert.throws(()=>nativeV2Request('web.v2.session.issue',
   {origin:'https://app.example.test',command:'shell'},'connect-1'));
});
