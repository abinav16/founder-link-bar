const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');

function setup({ optOut = false, pointer = true } = {}) {
  const listeners = {}, sent = [], storage = new Map();
  let now = 0;
  const style = {};
  const frame = { style, setAttribute() {}, contentWindow: { postMessage: (...args) => sent.push(args) } };
  const document = {
    currentScript: { src: 'https://startupbar.co/widget/loader.js', getAttribute: k => k === 'data-startup-id' ? 'host-id' : k === 'data-exit-intent' && optOut ? 'off' : null },
    documentElement: { getAttribute() {}, classList: { contains: () => false } },
    body: null, readyState: 'loading', visibilityState: 'visible',
    querySelector: () => null, createElement: () => frame,
    addEventListener: (name, cb) => { listeners[name] = cb; },
  };
  const window = { innerWidth: 1280, innerHeight: 900, location: { hostname: 'host.example', pathname: '/' }, matchMedia: () => ({ matches: pointer }), addEventListener: (name, cb) => { listeners[name] = cb; } };
  window.top = window;
  runInNewContext(readFileSync(__dirname + '/loader.js', 'utf8'), { window, document, navigator: { userAgent: 'Chrome' }, screen: {}, URL, URLSearchParams, localStorage: { getItem() {} }, sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) }, Date: { now: () => now }, Math, isFinite, setTimeout: cb => { cb(); return 0; }, clearTimeout() {} });
  const message = (data, source = frame.contentWindow, origin = 'https://startupbar.co') => listeners.message({ data, source, origin });
  message({ type: 'startupbar:exit-ready', ready: true });
  listeners.mousemove();
  return { sent, style, storage, message, leave: t => { now = t; listeners.mouseleave({ clientY: 0 }); } };
}
test('exit waits fifteen seconds and only shows once per session', () => {
  const s = setup();
  s.leave(14999); assert.equal(s.sent.length, 0);
  s.leave(15000); assert.equal(s.sent[0][0].type, 'startupbar:exit');
  s.message({ type: 'startupbar:exit-opened' });
  s.leave(30000); assert.equal(s.sent.length, 1);
  assert.equal(s.storage.get('startupbar:exit-shown'), '1');
});
test('host opt out suppresses the recommendation', () => {
  const s = setup({ optOut: true }); s.leave(20000); assert.equal(s.sent.length, 0);
});
test('touch devices do not receive exit prompts', () => {
  const s = setup({ pointer: false }); s.leave(20000); assert.equal(s.sent.length, 0);
});
test('untrusted frame messages cannot dismiss or resize the widget', () => {
  const s = setup();
  s.message({ type: 'startupbar:resize', height: 0 }, {}, 'https://evil.example');
  assert.notEqual(s.style.display, 'none');
  s.message({ type: 'startupbar:resize', height: 300 });
  assert.equal(s.style.height, '300px');
});