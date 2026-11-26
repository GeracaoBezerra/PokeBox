import type { Db } from '../lib/prisma.js';
import type { AuthUser } from '../types/auth.js';
import type { PageWindow } from '../utils/pagination.js';
import {
  credentialUserFields,
  existingUserFields,
  profileUserFields,
  publicProfileFields,
  publicUserFields,
  type CollectorSummary,
  type ExistingUser,
  type NewUser,
  type PublicProfileUser,
  type PublicUser,
  type UserProfileChanges,
  type UserRepository,
  type UserWithCredentials,
} from './UserRepository.js';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  searchCollectors(term: string, { skip, take }: PageWindow) {
    // O CHECK user_username_format_check já garante username ASCII em minúsculas.
    return this.db.$queryRaw<CollectorSummary[]>`
      WITH search AS MATERIALIZED (SELECT lower(unaccent(${term}::text)) AS needle)
      SELECT username, name
      FROM "User" CROSS JOIN search
      WHERE "accountStatus" IN ('ACTIVE', 'PENDING_VERIFICATION') AND "deletedAt" IS NULL
        AND needle <> ''
        AND (strpos(username, needle) > 0 OR strpos(lower(unaccent(name)), needle) > 0)
      ORDER BY (username = needle) DESC, lower(unaccent(name)), username
      LIMIT ${take} OFFSET ${skip}
    `;
  }

  findById(id: string): Promise<AuthUser | null> {
    return this.db.user.findUnique({ where: { id }, select: profileUserFields });
  }

  findByEmail(email: string): Promise<UserWithCredentials | null> {
    return this.db.user.findUnique({ where: { email }, select: credentialUserFields });
  }

  findByEmailOrUsername(email: string, username: string): Promise<ExistingUser | null> {
    return this.db.user.findFirst({ where: { OR: [{ email }, { username }] }, select: existingUserFields });
  }

  findPublicByUsername(username: string): Promise<PublicProfileUser | null> {
    return this.db.user.findUnique({ where: { username }, select: publicProfileFields });
  }

  create(data: NewUser): Promise<PublicUser> {
    return this.db.user.create({ data, select: publicUserFields });
  }

  update(id: string, data: UserProfileChanges): Promise<AuthUser> {
    return this.db.user.update({ where: { id }, data, select: profileUserFields });
  }

  async deactivate(id: string): Promise<void> {
    await this.db.user.update({
      where: { id },
      data: { accountStatus: 'INACTIVE', deletedAt: new Date() },
      select: { id: true },
    });
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.db.user.update({ where: { id }, data: { lastLoginAt: new Date() }, select: { id: true } });
  }
}
