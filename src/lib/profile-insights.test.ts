import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { momentum, statsShareText, vouchStartups, type FounderVouch } from './profile-insights';

describe('seven-day momentum', () => {
  test('compares seven completed days to the prior seven, not partial today', () => {
    const days = Array.from({ length: 15 }, (_, day_offset) => ({ day_offset, date: '2026-10-15', clicks: 0, impressions: day_offset === 0 ? 9999 : day_offset <= 7 ? 20 : 10 }));
    assert.deepEqual(momentum(days), { current: 140, previous: 70, change: 100 });
  });
  test('does not claim percentage growth without previous traffic', () => {
    assert.deepEqual(momentum([{ day_offset: 1, date: '2026-10-14', clicks: 0, impressions: 25 }]), { current: 25, previous: 0, change: null });
  });
});
describe('owner share metrics', () => {
  test('shares actual clicks, never labels impressions as visitors', () => {
    const text = statsShareText('Test startup', 32, 4170, 'test-startup');
    assert.ok(text.includes('32 clicks'));
    assert.ok(!text.includes('4,170 visitors'));
    assert.ok(text.includes('https://startupbar.co/startup/test-startup'));
  });
  test('zero-click startups share impressions honestly', () => {
    assert.ok(statsShareText('Test startup', 0, 500, 'test').includes('500 network impressions'));
  });
});
describe('vouch founder startups', () => {
  const vouch: FounderVouch = { tag: 'great_concept', founder_name: 'Daniel', name: 'NotepadPlus', slug: 'notepadplus', website_url: 'https://notepad.plus', logo_url: null };
  test('keeps every startup belonging to a multi-startup founder', () => {
    const startups = [vouch, { name: 'StartupBar', slug: 'startupbar', website_url: 'https://startupbar.co', logo_url: null }];
    assert.deepEqual(vouchStartups({ ...vouch, startups }).map(s => s.name), ['NotepadPlus', 'StartupBar']);
  });
  test('keeps single-startup vouches compatible with older profile data', () => {
    assert.deepEqual(vouchStartups(vouch).map(s => s.slug), ['notepadplus']);
  });
});