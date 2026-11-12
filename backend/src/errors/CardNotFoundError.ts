export class CardNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardNotFoundError';
  }
}
