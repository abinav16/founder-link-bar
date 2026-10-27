import { describe, it, expect } from 'vitest';
import { checkLatestSnippet, hasLatestSnippet, needsSnippetReminder, safeSnippetUrl } from '../../supabase/functions/send-weekly-digest/snippet';

const id = 'ba821324-1867-4d95-abe2-8df138a22304';
const script = `<script async src="https://startupbar.co/widget/loader.js" data-startup-id="${id}"></script>`;
const anchor = '<a href="https://startupbar.co" target="_blank" rel="noopener">StartupBar</a>';
const page = (html: string) => new Response(html, { headers: { 'content-type': 'text/html' } });

describe('conditional weekly snippet reminder', () => {
  it('omits the reminder for verified updated startups', () => expect(needsSnippetReminder('2026-10-27T06:01:00Z')).toBe(false));
  it('includes the reminder for unverified startups', () => expect(needsSnippetReminder(null)).toBe(true));
  it('requires the loader and credit together', () => {
    expect(hasLatestSnippet(script + anchor, id)).toBe(true);
    expect(hasLatestSnippet(script, id)).toBe(false);
    expect(hasLatestSnippet(anchor, id)).toBe(false);
  });
  it('does not accept another startup, a comment or injected JS anchor as static proof', () => {
    expect(hasLatestSnippet(script + anchor, 'other-id')).toBe(false);
    expect(hasLatestSnippet(script + `<!-- ${anchor} -->`, id)).toBe(false);
    expect(hasLatestSnippet(script + `<script>document.write('${anchor}')</script>`, id)).toBe(false);
  });
  it('rejects lookalike credit destinations', () => expect(hasLatestSnippet(script + anchor.replace('startupbar.co', 'startupbar.co.evil.com'), id)).toBe(false));
  it('checks the reported inner page when the root still has old code', async () => {
    const checked: string[] = [];
    const fetcher = (async (url: string | URL | Request) => { checked.push(String(url)); return page(String(url).endsWith('/editor') ? script + anchor : script); }) as typeof fetch;
    const result = await checkLatestSnippet(id, 'https://example.com', 'https://example.com/editor', fetcher);
    expect(result.detected).toBe(true);
    expect(result.sourceUrl).toBe('https://example.com/editor');
    expect(checked).toHaveLength(2);
  });
  it('does not revoke previous evidence when a scan is unavailable', async () => {
    const fetcher = (async () => new Response('', { status: 503 })) as typeof fetch;
    expect((await checkLatestSnippet(id, 'https://example.com', null, fetcher)).complete).toBe(false);
  });
  it('rejects private targets and redirects', async () => {
    expect(safeSnippetUrl('http://127.0.0.1')).toBe(null);
    expect(safeSnippetUrl('http://169.254.169.254')).toBe(null);
    let calls = 0;
    const fetcher = (async () => { calls++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1' } }); }) as typeof fetch;
    expect((await checkLatestSnippet(id, 'https://example.com', null, fetcher)).complete).toBe(false);
    expect(calls).toBe(1);
  });
});