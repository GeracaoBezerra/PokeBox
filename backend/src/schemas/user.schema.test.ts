import { usernameParamSchema } from './user.schema.js';

describe('usernameParamSchema', () => {
  it.each(['ash', 'misty', 'red_123', 'a'.repeat(20)])('aceita "%s"', (username) => {
    expect(usernameParamSchema.safeParse({ username }).success).toBe(true);
  });

  it.each(['AB', 'ab', 'Ash!', 'com-traco', 'a'.repeat(21)])('recusa "%s"', (username) => {
    expect(usernameParamSchema.safeParse({ username }).success).toBe(false);
  });
});
