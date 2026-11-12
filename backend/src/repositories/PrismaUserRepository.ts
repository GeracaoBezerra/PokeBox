import type { Prisma } from '../generated/prisma/index.js';
import type { Db } from '../lib/prisma.js';
import type { UserLookup } from '../middlewares/AuthMiddleware.js';
import type { AuthUser } from '../types/auth.js';

const profileFields = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  accountStatus: true,
  createdAt: true,
  phone: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
} satisfies Prisma.UserSelect;

export class PrismaUserRepository implements UserLookup {
  constructor(private readonly db: Db) {}

  findById(id: string): Promise<AuthUser | null> {
    return this.db.user.findUnique({ where: { id }, select: profileFields });
  }
}
