import { describe, it, expect } from 'vitest';
import { FROM, appEmailCc } from '../../supabase/functions/send-email/delivery';

describe('StartupBar email delivery', () => {
  it('uses the requested sender', () => { expect(FROM).toBe('StartupBar <hello@startupbar.co>'); });
  it('copies the owner on an app email', () => { expect(appEmailCc('founder@example.com')).toEqual({cc:'danielabinav16@gmail.com'}); });
  it('does not copy the owner twice', () => { expect(appEmailCc(' DANIELABINAV16@gmail.com ')).toEqual({}); });
  it('does not duplicate an owner in a recipient array', () => { expect(appEmailCc(['founder@example.com','danielabinav16@gmail.com'])).toEqual({}); });
});