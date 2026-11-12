export interface TranslatedError {
  statusCode: number;
  message: string;
  details?: unknown;
}

export interface ErrorTranslator {
  translate(err: unknown): TranslatedError | null;
}
