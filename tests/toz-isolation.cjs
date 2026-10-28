const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('supabase/functions/toz-sync/index.ts','utf8');
assert(source.includes('public.toz_documents'));assert(source.includes('public.toz_allowed_users'));assert(!source.includes('public.pworks_'));
const client=fs.readFileSync('cloud/client.js','utf8');assert(client.includes("cfg.functionName||'toz-sync'"));assert(client.includes('toz-cloud-auth-v1:'));assert(client.includes('toz-cloud-draft-v1:'));assert(!client.includes('/functions/v1/pworks-sync'));
const schema=fs.readFileSync('cloud/schema.sql','utf8');assert(!schema.includes('pworks_'));assert(schema.includes('enable row level security'));assert(schema.includes('revoke all'));
const ctx={Request,Response,TextDecoder,Uint8Array};vm.createContext(ctx);vm.runInContext(source.replace(/^import .*;$/m,'').split('// Runtime adapter:')[0].replaceAll('export function','function'),ctx);
(async()=>{
 const payload={version:3,tasks:[],projects:[],vacations:[],projectColors:{},projectDeadlines:{},projectCompletions:{},journals:{'2026-10-25':{summary:'하루기록',body:'일기'}},stickyNotes:[{id:'note',closed:true,closedDate:'2026-10-25'}],workHoursByDate:{'2026-10-26':{holiday:true,weekendStart:'08:30'}},meetings:[{id:'appointment',moveHoursBefore:2}]};
 let storage={},rev={};const handler=ctx.createHandler({origins:['https://jinhee-hong-test.github.io'],authenticate:async a=>a==='Bearer user-a'?'user-a':a==='Bearer user-b'?'user-b':null,execute:async(user,body)=>{if(body.action==='save'){assert.equal(body.expected_revision,rev[user]||0);storage[user]=body.new_payload;rev[user]=(rev[user]||0)+1;}return {revision:rev[user]||0,payload:storage[user]||{}};}});
 const request=(body,user='user-a',origin='https://jinhee-hong-test.github.io')=>new Request('https://edge.test',{method:'POST',headers:{authorization:'Bearer '+user,origin},body:JSON.stringify(body)});
 const save=await handler(request({action:'save',expected_revision:0,request_id:'12345678-1234-1234-1234-123456789abc',new_payload:payload,user_id:'user-b'}));assert.equal(save.status,200);
 const row=(await (await handler(request({action:'read'}))).json()).data;assert.deepEqual(row.payload,payload);
 assert.deepEqual((await (await handler(request({action:'read'},'user-b'))).json()).data.payload,{});
 assert.equal((await handler(request({action:'read'},'invalid'))).status,401);
 assert.equal((await handler(request({action:'read'},'user-a','https://other.test'))).status,403);
 const localCtx={};vm.createContext(localCtx);const start=client.indexOf('  const hasLocalData=');const end=client.indexOf('\n',start);vm.runInContext(client.slice(start,end)+';this.has=hasLocalData',localCtx);
 assert(localCtx.has({journals:{today:{}}}));assert(localCtx.has({stickyNotes:[{}]}));assert(localCtx.has({workHoursByDate:{today:{}}}));assert(!localCtx.has({tasks:[],projects:[]}));
 console.log('PASS: TO Z storage isolation, authenticated account boundaries, complete payload round trip, origin rejection, notes/journal-only local migration.');
})().catch(e=>{console.error(e);process.exitCode=1});
