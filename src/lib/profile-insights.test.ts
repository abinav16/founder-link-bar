import { describe, expect, test } from 'bun:test';
import { momentum, statsShareText } from './profile-insights';

describe('seven-day momentum', () => {
  test('compares seven completed days to the prior seven, not partial today', () => {
    const days = Array.from({ length: 15 }, (_, day_offset) => ({ day_offset, date: '2026-10-15', clicks: 0, impressions: day_offset === 0 ? 9999 : day_offset <= 7 ? 20 : 10 }));
    expect(momentum(days)).toEqual({ current: 140, previous: 70, change: 100 });
  });
  test('does not claim percentage growth without previous traffic', () => {
    expect(momentum([{ day_offset: 1, date: '2026-10-14', clicks: 0, impressions: 25 }])).toEqual({ current: 25, previous: 0, change: null });
  });
});
describe('owner share metrics', () => {
  test('shares actual clicks, never labels impressions as visitors', () => {
    const text = statsShareText('Test startup', 32, 4170, 'test-startup');
    expect(text).toContain('32 clicks');
    expect(text).not.toContain('4,170 visitors');
    expect(text).toContain('https://startupbar.co/startup/test-startup');
  });
  test('zero-click startups share impressions honestly', () => {
    expect(statsShareText('Test startup', 0, 500, 'test')).toContain('500 network impressions');
  });
});