import type { Prisma } from '../generated/prisma/index.js';
import type { UserLookup } from '../middlewares/AuthMiddleware.js';
import type { AuthUser } from '../types/auth.js';

export const publicUserFields = {
  id: true,
  username: true,
  name: true,
  email: true,
  role: true,
  accountStatus: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const profileUserFields = {
  ...publicUserFields,
  phone: true,
  cep: true,
  street: true,
  number: true,
  complement: true,
  neighborhood: true,
  city: true,
  state: true,
} satisfies Prisma.UserSelect;

export const credentialUserFields = { ...publicUserFields, passwordHash: true } satisfies Prisma.UserSelect;

export const existingUserFields = { id: true, email: true, username: true } satisfies Prisma.UserSelect;

export const publicProfileFields = {
  id: true,
  username: true,
  name: true,
  accountStatus: true,
  deletedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserFields }>;

export type UserWithCredentials = Prisma.UserGetPayload<{ select: typeof credentialUserFields }>;

export type ExistingUser = Prisma.UserGetPayload<{ select: typeof existingUserFields }>;

export type PublicProfileUser = Prisma.UserGetPayload<{ select: typeof publicProfileFields }>;

export interface NewUser {
  username: string;
  name: string;
  email: string;
  passwordHash: string;
}

export type UserProfileChanges = Partial<
  Pick<AuthUser, 'name' | 'phone' | 'cep' | 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state'>
>;

export interface UserRepository extends UserLookup {
  findByEmail(email: string): Promise<UserWithCredentials | null>;
  findByEmailOrUsername(email: string, username: string): Promise<ExistingUser | null>;
  findPublicByUsername(username: string): Promise<PublicProfileUser | null>;
  create(data: NewUser): Promise<PublicUser>;
  update(id: string, data: UserProfileChanges): Promise<AuthUser>;
  deactivate(id: string): Promise<void>;
  touchLastLogin(id: string): Promise<void>;
}

export type AuthUserStore = Pick<UserRepository, 'findByEmail' | 'findByEmailOrUsername' | 'create' | 'touchLastLogin'>;

export type UserAccountStore = Pick<UserRepository, 'update' | 'deactivate'>;
