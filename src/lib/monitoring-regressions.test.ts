import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectScriptUrls, hasNativeWidgetFrame, heartbeatProvesInstall, isSameSite } from './widget-install-evidence';
import { prependVisitor } from './live-visitor-history';

test('a realtime visitor retains 200 recent visitors instead of shrinking to 30', () => {
  const history = Array.from({ length: 200 }, (_, id) => ({ id: String(id) }));
  const next = prependVisitor(history, { id: 'new' });
  assert.equal(next.length, 200);
  assert.equal(next[0]?.id, 'new');
  assert.equal(next[199]?.id, '198');
});

test('a loader with frame-src permission is not a native iframe and cannot bypass script checks', () => {
  const html = `<meta http-equiv="Content-Security-Policy" content="script-src 'self'; frame-src https://startupbar.co"><script src="https://startupbar.co/widget/loader.js"></script>`;
  assert.equal(hasNativeWidgetFrame(html), false);
});

test('a slot placeholder or StartupBar mention is not installation evidence', () => {
  assert.equal(hasNativeWidgetFrame('<div data-startupbar-slot>StartupBar</div>'), false);
});

test('an actual native iframe remains exempt from loader script restrictions', () => {
  assert.equal(hasNativeWidgetFrame('<iframe src="https://startupbar.co/widget/bar?host=abc"></iframe>'), true);
});

test('a heartbeat within the last 24 hours proves the widget is installed', () => {
  const now = Date.parse('2026-10-17T08:00:00Z');
  assert.equal(heartbeatProvesInstall('2026-10-17T07:14:00Z', now), true);
  assert.equal(heartbeatProvesInstall('2026-10-16T08:30:00Z', now), true);
});

test('a heartbeat older than 24 hours does not prove the widget is still installed', () => {
  const now = Date.parse('2026-10-17T08:00:00Z');
  assert.equal(heartbeatProvesInstall('2026-10-16T07:59:00Z', now), false);
  assert.equal(heartbeatProvesInstall(null, now), false);
});

test('modulepreload and preload-as-script bundles are scanned, other links are not', () => {
  const page = new URL('https://360exp.net/');
  const html = `<link rel="modulepreload" href="/assets/root-DURZzcIe.js"><link rel="preload" as="script" href="/assets/a.js"><link rel="preload" as="style" href="/assets/b.css"><link rel="stylesheet" href="/c.css"><script src="https://cdn.other.com/x.js"></script>`;
  assert.deepEqual(collectScriptUrls(html, page).map((u) => u.pathname), ['/assets/root-DURZzcIe.js', '/assets/a.js']);
});

test('the fallback page must belong to the startup domain', () => {
  assert.equal(isSameSite('https://app.example.com/dash', 'https://example.com'), true);
  assert.equal(isSameSite('https://evil.com/example.com', 'https://example.com'), false);
});