import { ConflictError } from '../errors/domainErrors.js';
import type { UnitOfWorkFactory } from '../repositories/UnitOfWork.js';
import type { UserAccountStore } from '../repositories/UserRepository.js';
import type { UpdateUserInput } from '../schemas/user.schema.js';
import type { AuthUser } from '../types/auth.js';

export class UserService {
  constructor(
    private readonly users: Pick<UserAccountStore, 'update'>,
    private readonly unitOfWork: UnitOfWorkFactory,
  ) {}

  updateMe(userId: string, changes: UpdateUserInput): Promise<AuthUser> {
    return this.users.update(userId, changes);
  }

  async deactivateMe(userId: string): Promise<void> {
    await this.unitOfWork.run(async (uow) => {
      if (await uow.trades.hasOpenFor(userId)) {
        throw new ConflictError('Conclua ou cancele suas trocas antes de desativar a conta.');
      }

      await uow.offers.cancelOpenOfUser(userId, 'ACCOUNT_DEACTIVATED');
      await uow.listings.closeOpenByOwner(userId);
      await uow.users.deactivate(userId);
    });
  }
}
