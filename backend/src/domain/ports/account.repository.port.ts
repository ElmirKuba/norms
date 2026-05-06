import type { AccountEntity, CreateAccountData, UpdateAccountData } from '../entities/account.entity';

/** Порт (абстракция) для операций с аккаунтами — реализуется в слое персистентности. */
export abstract class AccountRepository {
  /**
   * Возвращает все аккаунты.
   * @returns Массив сущностей аккаунтов.
   */
  public abstract findAll(): Promise<AccountEntity[]>;

  /**
   * Находит аккаунт по ID.
   * @param id - ID аккаунта.
   * @returns Сущность аккаунта или null если не найден.
   */
  public abstract findById(id: string): Promise<AccountEntity | null>;

  /**
   * Создаёт и сохраняет новый аккаунт.
   * @param data - Данные для создания.
   * @returns Созданная сущность аккаунта.
   */
  public abstract create(data: CreateAccountData): Promise<AccountEntity>;

  /**
   * Обновляет указанные поля существующего аккаунта.
   * @param id - ID аккаунта.
   * @param data - Поля для обновления.
   * @returns Обновлённая сущность аккаунта или null если не найден.
   */
  public abstract update(id: string, data: UpdateAccountData): Promise<AccountEntity | null>;

  /**
   * Удаляет аккаунт по ID.
   * @param id - ID аккаунта.
   */
  public abstract delete(id: string): Promise<void>;
}
