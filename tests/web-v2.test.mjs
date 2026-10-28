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

test('unified Agent V2 run/read contracts are provider-neutral and versioned',()=>{
  const params={api_version:2,client_key:'client-task-123',
    prompt:'Summarize a fictional meeting',agent:'workbuddy',
    model:'auto',think_mode:'auto',agent_mode:'require'};
  const request={...base,requestId:'agent-run-1',action:'agent.run',params};
  assert.equal(validWebV2Request(request),true);
  const native=nativeV2Request('web.v2.agent.run',
    {origin:'https://app.example.test',...params},'agent-run-1');
  assert.equal(native.protocol_version,2);
  for(const bad of [
    {...params,api_version:1},
    {...params,api_version:undefined},
    {...params,agent:'shell'},
    {...params,client_key:'../unsafe'},
    {...params,prompt:'x'.repeat(13000)},
    {...params,tools:['write']},
  ]) assert.equal(validWebV2Request({...request,params:bad}),false);
  const read={...base,requestId:'agent-read-1',action:'agent.read',
    params:{task_id:'wb-abcde-1234-0',cursor:0}};
  assert.equal(validWebV2Request(read),true);
  assert.equal(nativeV2Request('web.v2.agent.read',
    {origin:'https://app.example.test',...read.params},'agent-read-1').protocol_version,2);
  for(const task of ['codex-job-1','pi-job-1','wb-job-1']) {
    assert.equal(validWebV2Request({...read,params:{task_id:task,cursor:0}}),true);
  }
  assert.equal(validWebV2Request({...read,params:{...read.params,cursor:-1}}),false);
  assert.equal(validWebV2Request({...read,params:{...read.params,cursor:'0'}}),false);
  const response=parseNativeV2Response({protocol_version:2,request_id:'agent-read-1',
    ok:true,result:{status:'running',next_seq:2,events:[
      {seq:1,type:'message.delta',message_id:'m1',text:'Hello'},
      {seq:2,type:'message.final',message_id:'m1'}]}},'agent-read-1');
  assert.equal(response.result.status,'running');
  assert.equal(response.result.events.length,2);
  assert.notEqual(response.result.status,'completed');
  for(const old of ['web.v2.agent.start','web.v2.agent.poll']) {
    assert.throws(()=>nativeV2Request(old,
      {origin:'https://app.example.test',...params},'old-client'));
  }
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

test('unified agent.run options are bounded, never arbitrary shell or model URLs',()=>{
  const valid={api_version:2,client_key:'task-123',prompt:'Summarize a synthetic note',
    agent:'codex',model:'auto',think_mode:'high',agent_mode:'prefer'}
  const envelope={channel:WEB_V2_CHANNEL,version:2,type:'REQUEST',
    requestId:'unified-1',action:'agent.run',params:valid}
  assert.equal(validWebV2Request(envelope),true)
  const native=nativeV2Request('web.v2.agent.run',
    {origin:'https://app.example.test',...valid},'unified-1')
  assert.equal(native.protocol_version,2)
  for(const invalid of [
    {...valid,api_version:1},
    {...valid,agent:'shell'},
    {...valid,model:'https://user:secret@example.com/v1?token=x'},
    {...valid,model:'https://evil.example'},
    {...valid,think_mode:'unlimited'},
    {...valid,agent_mode:'force'},
    {...valid,agent:'auto',agent_mode:'require'},
    {...valid,command:'rm'},
  ]) {
    assert.equal(validWebV2Request({...envelope,params:invalid}),false)
  }
  assert.throws(()=>nativeV2Request('web.v2.agent.run',
    {origin:'https://app.example.test',...valid,command:'rm'},'unified-1'))
})
