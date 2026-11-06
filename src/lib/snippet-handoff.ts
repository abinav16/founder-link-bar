/** Signed-in founders send to their account; guests supply an address. */
export function snippetRecipient(accountEmail: string | null | undefined, guestEmail: string): string {
  return (accountEmail || guestEmail).trim();
}