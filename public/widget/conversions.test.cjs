const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/conversions.js', 'utf8');
const token = 'a'.repeat(64);

async function fixture({ gpc = false, rejectFirst = false } = {}) {
  const stored = new Map(), listeners = {}, requests = [], timers = [];
  const window = { location: { href: 'https://partner.example/?_sbref=' + token, search: '?_sbref=' + token, pathname: '/' }, addEventListener: (n,f) => { listeners[n] = f; }, dispatchEvent: () => {} };
  window.top = window;
  const document = { currentScript: { src: 'https://startupbar.co/widget/conversions.js', getAttribute: n => n === 'data-startup-id' ? 'startup-id' : null }, visibilityState: 'visible', addEventListener: (n,f) => { listeners[n] = f; } };
  const context = { window, document, navigator: { globalPrivacyControl: gpc }, URL, URLSearchParams, Date, JSON, Math, CustomEvent: class { constructor(name,options) { this.detail=options.detail; } }, localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k,v) => stored.set(k,v), removeItem: k => stored.delete(k) }, setInterval: () => {}, setTimeout: fn => timers.push(fn), fetch: async (url,options) => { if(url.includes('/config'))return {ok:true,json:async()=>({enabled:true,success_path:'/signup/complete',website_url:'https://partner.example'})}; requests.push(JSON.parse(options.body));if(rejectFirst && requests.length===1)throw Error('network');return {ok:true,json:async()=>({accepted:true,test:true})}; } };
  vm.runInNewContext(source,context);
  const flush = () => new Promise(r=>setImmediate(r));
  await flush();
  const grant = () => listeners['startupbar:conversion-consent']({detail:{granted:true}});
  const complete = () => {window.location.pathname='/signup/complete';listeners.popstate();};
  return {stored,requests,timers,listeners,grant,complete,flush};
}

test('does not store or report a referral before visitor consent',async()=>{const f=await fixture();f.complete();await f.flush();assert.equal(f.stored.size,0);assert.equal(f.requests.length,0);});
test('only reports the dedicated new-account success path after consent',async()=>{const f=await fixture();f.grant();await f.flush();assert.equal(f.requests.length,0);f.complete();await f.flush();assert.equal(f.requests.length,1);assert.equal(f.requests[0].consent_granted,true);assert.equal(f.requests[0].referral_token,token);});
test('reload and router events do not duplicate an accepted report',async()=>{const f=await fixture();f.grant();f.complete();await f.flush();f.listeners.popstate();f.listeners.pageshow();await f.flush();assert.equal(f.requests.length,1);});
test('withdrawal clears attribution storage and prevents reporting',async()=>{const f=await fixture();f.grant();assert.equal(f.stored.size,1);f.listeners['startupbar:conversion-consent']({detail:{granted:false}});f.complete();await f.flush();assert.equal(f.stored.size,0);assert.equal(f.requests.length,0);});
test('global privacy control prevents storing and reporting a referral',async()=>{const f=await fixture({gpc:true});f.grant();f.complete();await f.flush();assert.equal(f.stored.size,0);assert.equal(f.requests.length,0);});
test('a transient delivery failure retries without interrupting the widget',async()=>{const f=await fixture({rejectFirst:true});f.grant();f.complete();await f.flush();assert.equal(f.timers.length,1);f.timers[0]();await f.flush();assert.equal(f.requests.length,2);assert.equal(f.requests[0].referral_token,f.requests[1].referral_token);});