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
   * Находит аккаунт по юзернейму (без учёта регистра).
   * @param username - Юзернейм.
   * @returns Сущность аккаунта или null если не найден.
   */
  public abstract findByUsername(username: string): Promise<AccountEntity | null>;

  /**
   * Находит аккаунт по номеру UIN через JOIN с таблицей uins.
   * @param uinNumber - Числовой UIN в виде строки.
   * @returns Сущность аккаунта или null если не найден.
   */
  public abstract findByUin(uinNumber: string): Promise<AccountEntity | null>;

  /**
   * Возвращает UIN-номер аккаунта (или null если UIN ещё не назначен).
   * @param accountId - ID аккаунта.
   * @returns Строка UIN или null.
   */
  public abstract findUinByAccountId(accountId: string): Promise<string | null>;

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
