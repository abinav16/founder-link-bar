import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasNativeWidgetFrame } from './widget-install-evidence';
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