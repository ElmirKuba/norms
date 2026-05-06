/** Domain entity representing a user account. */
export interface AccountEntity {
  /** Unique account ID in `{uuid-v7}_{unix-ms}` format. */
  readonly id: string;
  /** Optional case-insensitive username. */
  readonly username: string | null;
  /** Argon2id password hash. */
  readonly passwordHash: string;
  /** Remaining invites the account can send. */
  readonly invitesRemaining: number;
  /** Whether the account has admin privileges. */
  readonly isAdmin: boolean;
  /** ISO timestamp of creation. */
  readonly createdAt: string;
  /** ISO timestamp of last update. */
  readonly updatedAt: string;
}

/** Data required to create a new account. */
export interface CreateAccountData {
  /** Argon2id password hash. */
  readonly passwordHash: string;
  /** Optional username. */
  readonly username?: string;
  /** Starting invite count — defaults to 3. */
  readonly invitesRemaining?: number;
  /** Admin flag — defaults to false. */
  readonly isAdmin?: boolean;
}

/** Partial account data for updates — only provided fields are changed. */
export interface UpdateAccountData {
  /** New username, or null to remove it. */
  readonly username?: string | null;
  /** New password hash. */
  readonly passwordHash?: string;
  /** New invite count. */
  readonly invitesRemaining?: number;
}
