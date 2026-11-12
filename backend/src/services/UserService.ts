import type { UpdateUserInput } from '../schemas/user.schema.js';
import type { UserAccountStore } from '../repositories/UserRepository.js';
import type { AuthUser } from '../types/auth.js';

export class UserService {
  constructor(private readonly users: UserAccountStore) {}

  updateMe(userId: string, changes: UpdateUserInput): Promise<AuthUser> {
    return this.users.update(userId, changes);
  }

  async deactivateMe(userId: string): Promise<void> {
    await this.users.deactivate(userId);
  }
}
