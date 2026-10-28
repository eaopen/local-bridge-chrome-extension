import test from 'node:test';
import assert from 'node:assert/strict';

const site='https://example.test';
const listeners={};const granted=new Set([`${site}/*`]);
let stored=[];let aiSitesStored=[];let selectedNativeHost=null;let nativePermission=false;let nativeMessages=[];let registered=[];
const id='chrome-test-extension';
const popupUrl=`chrome-extension://${id}/popup.html`;
globalThis.chrome={
  runtime:{id,getURL(path){return `chrome-extension://${id}/${path}`;},
    getManifest(){return {version:'0.1.0'};},
    onMessage:{addListener(fn){listeners.message=fn;}},
    onInstalled:{addListener(fn){listeners.installed=fn;}},
    onStartup:{addListener(fn){listeners.startup=fn;}},
    async sendNativeMessage(host,request){nativeMessages.push({host,request});return {
      protocol_version:1,request_id:request.request_id,ok:true,
      result: request.action==='host.status'
        ? {provider:'test-host',capabilities:['host.status','context.share','context.summarize','relay.return','enterprise.pi.run']}
        : request.action==='context.summarize'
          ? {status:'completed',summary:'A brief summary.'}
          : request.action==='enterprise.pi.run'
            ? {status:'completed',result:'MOCK_ENTERPRISE_OK'}
          : request.action==='relay.return'
            ? {stored:true,status:'received',task_id:'ctx-returned12345'}
            : {received:true,forwarded:false}};}
  },
  storage:{local:{
    async get(){return {trustedSites:stored,enterpriseAiSites:aiSitesStored,nativeHost:selectedNativeHost};},
    async set(x){
      if ('trustedSites' in x) stored=x.trustedSites;
      if ('enterpriseAiSites' in x) aiSitesStored=x.enterpriseAiSites;
      if ('nativeHost' in x) selectedNativeHost=x.nativeHost;
    }
  }},
  permissions:{async contains(q){return q.permissions ? nativePermission : granted.has(q.origins[0]);},
    onRemoved:{addListener(fn){listeners.permissionRemoved=fn;}}},
  scripting:{async getRegisteredContentScripts(){return registered;},
    async registerContentScripts(x){registered=x;},
    async unregisterContentScripts(){registered=[];}}
};
await import('../extension/background.js');
function send(message,sender){return new Promise(resolve=>listeners.message(message,sender,resolve));}
const popup={id,url:popupUrl};
const trustedPage={id,origin:site,url:`${site}/workspace`,frameId:0,tab:{id:5}};
const untrustedPage={...trustedPage,origin:'https://evil.test',url:'https://evil.test'};

test('website cannot activate itself or share content',async()=>{
  assert.equal((await send({type:'SITE_TOGGLE',origin:site,enabled:true},trustedPage)).code,'caller_not_allowed');
  assert.equal((await send({type:'SHARE_CONTEXT',context:{title:'x',url:'a',selection:'s'}},trustedPage)).code,'caller_not_allowed');
  assert.equal((await send({type:'SUMMARIZE_CONTEXT',context:{title:'x',url:'a',selection:'s'}},trustedPage)).code,'caller_not_allowed');
  assert.equal((await send({type:'RELAY_RETURN',pending:{},reply:{}},trustedPage)).code,'caller_not_allowed');
});
test('popup permission enables EXACT origin, refuses other origin/frame',async()=>{
  const r=await send({type:'SITE_TOGGLE',origin:site,enabled:true},popup);
  assert.equal(r.ok,true);assert.deepEqual(stored,[site]);
  assert.equal((await send({type:'SITE_ALLOWED'},trustedPage)).allowed,true);
  assert.equal((await send({type:'SITE_ALLOWED'},untrustedPage)).allowed,false);
  assert.equal(registered.length,1);
  const req={channel:'local-tool-bridge:web:v1',type:'REQUEST',version:1,requestId:'req1',action:'extension.status',params:{}};
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).ok,true);
  assert.equal((await send({type:'WEB_REQUEST',request:req},untrustedPage)).code,'site_not_allowed');
  assert.equal((await send({type:'WEB_REQUEST',request:req},{...trustedPage,frameId:1})).code,'site_not_allowed');
  assert.equal((await send({type:'WEB_REQUEST',request:{...req,action:'shell.run'}},trustedPage)).code,'unsupported_action');
});
test('native feature is optional, cannot be enabled by website',async()=>{
  const req={channel:'local-tool-bridge:web:v1',type:'REQUEST',version:1,requestId:'req2',action:'native.status',params:{}};
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).code,'native_permission_required');
  nativePermission=true;
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).ok,true);
  assert.equal(nativeMessages.length,1);
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).code,'rate_limited');
  const handoff=await send({type:'SHARE_CONTEXT',context:{title:'Page',url:'https://example.test/',selection:'x'}},popup);
  assert.equal(handoff.ok,true);
  assert.equal(nativeMessages[1].request.action,'context.share');
});
test('disabled site no longer forwards requests',async()=>{
  assert.equal((await send({type:'SITE_TOGGLE',origin:site,enabled:false},popup)).ok,true);
  const req={channel:'local-tool-bridge:web:v1',type:'REQUEST',version:1,requestId:'req3',action:'extension.status'};
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).code,'site_not_allowed');
});

test('only the extension popup can change the selected generic provider host', async () => {
  const page={...trustedPage};
  const fromPage=await send({type:'HOST_SET',host:'org.example.provider'},page);
  assert.equal(fromPage.code,'caller_not_allowed');
  assert.equal((await send({type:'HOST_SET',host:'org.example;evil'},popup)).code,'invalid_host_name');
  assert.equal((await send({type:'HOST_SET',host:'org.example.provider'},popup)).ok,true);
  assert.equal((await send({type:'HOST_GET'},popup)).host,'org.example.provider');
  nativePermission=true;
  const result=await send({type:'NATIVE_STATUS'},popup);
  assert.equal(result.ok,true);
  assert.equal(nativeMessages.at(-1).host,'org.example.provider');
});
test('editable preview values are sanitized before sending to native provider', async () => {
  nativePermission=true;
  const input={title:'Edited draft',url:'https://someone:secret@example.test/item?token=abc#frag',selection:'Local note'};
  const sent=await send({type:'SHARE_CONTEXT',context:input},popup);
  assert.equal(sent.ok,true);
  const payload=nativeMessages.at(-1).request.payload;
  assert.equal(payload.selection,'Local note');
  assert.equal(payload.url,'https://example.test/item');
  assert.equal(payload.title,'Edited draft');
  assert.equal((await send({type:'SHARE_CONTEXT',context:{...input,selection:'  '}},popup)).code,'invalid_context');
});

test('only popup can explicitly summarize, via capability-checked native host',async()=>{
  nativePermission=true;
  const ctx={title:'Note',url:'https://example.test/notes',selection:'Summarize this user-selected text.'};
  const result=await send({type:'SUMMARIZE_CONTEXT',context:ctx},popup);
  assert.equal(result.ok,true);
  assert.equal(result.result.status,'completed');
  assert.equal(result.result.summary,'A brief summary.');
  assert.equal(nativeMessages.at(-2).request.action,'host.status');
  assert.equal(nativeMessages.at(-1).request.action,'context.summarize');
  assert.equal((await send({type:'SUMMARIZE_CONTEXT',context:ctx},trustedPage)).code,'caller_not_allowed');
  assert.equal((await send({type:'SUMMARIZE_CONTEXT',context:{...ctx,selection:' '}},popup)).code,'invalid_context');
});

test('user-reviewed Web AI return is popup-only and retains task reference',async()=>{
  nativePermission=true;
  const pending={
    relay_id:'rel-0123456789abcdef0123456789abcdef',
    web_ai:'chatgpt',
    task_ref:'ctx-123456789abc',
    created_at:Date.now(),
    source:{title:'Source',url:'https://example.test/context'}
  };
  const reply={title:'ChatGPT',url:'https://chatgpt.com/c/123?token=secret#scroll',selection:'Proposed fix; not executed.'};
  const returned=await send({type:'RELAY_RETURN',pending,reply},popup);
  assert.equal(returned.ok,true);
  assert.equal(returned.result.status,'received');
  assert.equal(returned.result.stored,true);
  assert.equal(nativeMessages.at(-2).request.action,'host.status');
  assert.equal(nativeMessages.at(-1).request.action,'relay.return');
  const wire=nativeMessages.at(-1).request.payload;
  assert.equal(wire.task_ref,'ctx-123456789abc');
  assert.equal(wire.reply.url,'https://chatgpt.com/c/123');
  assert.equal(wire.reply.selection,'Proposed fix; not executed.');
  assert.equal((await send({type:'RELAY_RETURN',pending,reply},trustedPage)).code,'caller_not_allowed');
  assert.equal((await send({type:'RELAY_RETURN',pending,reply:{...reply,selection:' '}},popup)).code,'invalid_relay');
});

test('enterprise Pi requires separate local AI grant, original signed ticket and exact Chrome origin',async()=>{
  const req={
    channel:'local-tool-bridge:web:v1',type:'REQUEST',version:1,
    requestId:'enterprise_1',action:'enterprise.pi.run',
    params:{
      api_path:'/api/local-ai/v1',model:'team-chat',
      ticket:'test-short-lived-ticket',prompt:'Summarize a synthetic project note'
    }
  };
  nativePermission=true;
  assert.equal((await send({type:'SITE_AI_TOGGLE',origin:site,enabled:true},popup)).code,
    'site_permission_required');
  assert.equal((await send({type:'SITE_TOGGLE',origin:site,enabled:true},popup)).ok,true);
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).code,
    'site_ai_permission_required');
  assert.equal((await send({type:'SITE_AI_TOGGLE',origin:site,enabled:true},trustedPage)).code,
    'caller_not_allowed');
  assert.equal((await send({type:'SITE_AI_TOGGLE',origin:site,enabled:true},popup)).ok,true);
  assert.equal((await send({type:'GET_SITE',origin:site},popup)).ai_enabled,true);
  const result=await send({type:'WEB_REQUEST',request:req},trustedPage);
  assert.equal(result.ok,true);
  assert.equal(result.result.status,'completed');
  assert.equal(result.result.result,'MOCK_ENTERPRISE_OK');
  assert.ok(!JSON.stringify(result).includes('test-short-lived-ticket'));
  assert.equal(nativeMessages.at(-1).request.action,'enterprise.pi.run');
  assert.equal(nativeMessages.at(-1).request.payload.origin,site);
  assert.equal(nativeMessages.at(-1).request.payload.api_path,'/api/local-ai/v1');
  assert.equal(nativeMessages.at(-1).request.payload.ticket,'test-short-lived-ticket');
  assert.equal((await send({type:'WEB_REQUEST',request:req},untrustedPage)).code,
    'site_not_allowed');
  assert.equal((await send({type:'WEB_REQUEST',request:req},{...trustedPage,frameId:1})).code,
    'site_not_allowed');
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).code,
    'rate_limited');
  assert.equal((await send({type:'SITE_TOGGLE',origin:site,enabled:false},popup)).ok,true);
  assert.equal((await send({type:'GET_SITE',origin:site},popup)).ai_enabled,false);
  assert.equal((await send({type:'WEB_REQUEST',request:req},trustedPage)).code,'site_not_allowed');
});
