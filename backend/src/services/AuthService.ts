import { AppError } from '../errors/AppError.js';
import { ConflictError, ForbiddenError } from '../errors/domainErrors.js';
import type { AuthUserStore, PublicUser } from '../repositories/UserRepository.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';
import type { PasswordHasher } from '../security/PasswordHasher.js';
import type { TokenSigner } from '../security/TokenSigner.js';
import { isAccountUsable } from '../utils/accountStatus.js';

export const INVALID_CREDENTIALS = 'E-mail ou senha inválidos';

const DUMMY_PASSWORD = 'dummy-password';

export interface AuthSession {
  user: PublicUser;
  token: string;
}

export class AuthService {
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: AuthUserStore,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenSigner,
  ) {
    this.dummyHash = hasher.hash(DUMMY_PASSWORD);
  }

  async register({ username, name, email, password }: RegisterInput): Promise<AuthSession> {
    const alreadyExists = await this.users.findByEmailOrUsername(email, username);

    if (alreadyExists) {
      throw new ConflictError('E-mail ou username já cadastrado');
    }

    const passwordHash = await this.hasher.hash(password);

    const user = await this.users.create({ username, name, email, passwordHash });

    return { user, token: this.tokens.sign(user.id) };
  }

  async login({ email, password }: LoginInput): Promise<AuthSession> {
    const user = await this.users.findByEmail(email);
    const passwordMatches = await this.hasher.compare(password, user?.passwordHash ?? (await this.dummyHash));

    if (!user || !passwordMatches) {
      throw new AppError(401, INVALID_CREDENTIALS);
    }

    if (!isAccountUsable(user.accountStatus)) {
      throw new ForbiddenError('Conta indisponível. Procure o suporte.');
    }

    await this.users.touchLastLogin(user.id);

    const { passwordHash: _passwordHash, ...safeUser } = user;

    return { user: safeUser, token: this.tokens.sign(safeUser.id) };
  }
}
