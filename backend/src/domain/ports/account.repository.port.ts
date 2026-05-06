import type { AccountEntity, CreateAccountData, UpdateAccountData } from '../entities/account.entity';

/** Port (abstract) for account persistence — implemented in the persistence layer. */
export abstract class AccountRepository {
  /**
   * Returns all accounts.
   * @returns Array of account entities.
   */
  public abstract findAll(): Promise<AccountEntity[]>;

  /**
   * Finds an account by ID.
   * @param id - Account ID.
   * @returns Account entity or null if not found.
   */
  public abstract findById(id: string): Promise<AccountEntity | null>;

  /**
   * Creates and persists a new account.
   * @param data - Account creation data.
   * @returns Created account entity.
   */
  public abstract create(data: CreateAccountData): Promise<AccountEntity>;

  /**
   * Updates specified fields on an existing account.
   * @param id - Account ID.
   * @param data - Fields to update.
   * @returns Updated account entity or null if not found.
   */
  public abstract update(id: string, data: UpdateAccountData): Promise<AccountEntity | null>;

  /**
   * Deletes an account by ID.
   * @param id - Account ID.
   */
  public abstract delete(id: string): Promise<void>;
}
