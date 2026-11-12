import jwt, { type SignOptions } from 'jsonwebtoken';

export interface TokenSigner {
  sign(userId: string): string;
}

type TokenLifetime = NonNullable<SignOptions['expiresIn']>;

export class JwtTokenSigner implements TokenSigner {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(userId: string): string {
    return jwt.sign({ sub: userId }, this.secret, {
      algorithm: 'HS256',
      expiresIn: this.expiresIn as TokenLifetime,
    });
  }
}
