import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { AccountRepository } from '../domain/ports/account.repository.port';

/**
 * Демо-сценарий для проверки работы CRUD через AccountRepository.
 * Раскомментируй нужные блоки — результат появится в консоли.
 * Удалить после проверки работоспособности.
 */
@Injectable()
export class AccountDemoUseCase implements OnModuleInit {
  /** Инстанс NestJS-логгера. */
  private readonly _logger: Logger = new Logger(AccountDemoUseCase.name);

  public constructor(
    private readonly _accountRepository: AccountRepository,
  ) {}

  /** Запускает CRUD-демо после инициализации модуля. */
  public async onModuleInit(): Promise<void> {
    // ── CREATE ───────────────────────────────────────────────────────────────────
    const account = await this._accountRepository.create({
      passwordHash: 'demo-hash',
      username: 'demo_user',
    });
    this._logger.log(`[CREATE] ${JSON.stringify(account)}`);

    // ── FIND BY ID ───────────────────────────────────────────────────────────────
    // const found = await this._accountRepository.findById(account.id);
    // this._logger.log(`[FIND BY ID] ${JSON.stringify(found)}`);

    // ── FIND ALL ─────────────────────────────────────────────────────────────────
    // const all = await this._accountRepository.findAll();
    // this._logger.log(`[FIND ALL] ${JSON.stringify(all)}`);

    // ── UPDATE ───────────────────────────────────────────────────────────────────
    // const updated = await this._accountRepository.update(account.id, { invitesRemaining: 99 });
    // this._logger.log(`[UPDATE] ${JSON.stringify(updated)}`);

    // ── DELETE ───────────────────────────────────────────────────────────────────
    // await this._accountRepository.delete(account.id);
    // this._logger.log(`[DELETE] готово — id: ${account.id}`);
  }
}
