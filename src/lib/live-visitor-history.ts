export const LIVE_VISITOR_LIMIT = 200;

export function prependVisitor<T extends { id: string }>(history: T[], visitor: T): T[] {
  return [visitor, ...history.filter((item) => item.id !== visitor.id)].slice(0, LIVE_VISITOR_LIMIT);
}