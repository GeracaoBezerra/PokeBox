import type { User } from '../generated/prisma/index.js';

export type AuthUser = Pick<
  User,
  | 'id'
  | 'username'
  | 'name'
  | 'email'
  | 'role'
  | 'accountStatus'
  | 'createdAt'
  | 'phone'
  | 'cep'
  | 'street'
  | 'number'
  | 'complement'
  | 'neighborhood'
  | 'city'
  | 'state'
>;

export type Role = AuthUser['role'];
