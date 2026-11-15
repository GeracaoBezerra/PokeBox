export const CARD_ID_PATTERN = /^[a-zA-Z0-9.\-]+$/;

export function isValidCardId(id: string): boolean {
  return CARD_ID_PATTERN.test(id);
}
