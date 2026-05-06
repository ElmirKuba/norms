import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { AccountRepository } from '../domain/ports/account.repository.port';

/**
 * Demo use-case that runs basic CRUD on AccountRepository at startup.
 * Раскомментируй нужные блоки — результат появится в консоли.
 * Удалить после того как убедишься что всё работает.
 */
@Injectable()
export class AccountDemoUseCase implements OnModuleInit {
  /** NestJS logger instance. */
  private readonly _logger: Logger = new Logger(AccountDemoUseCase.name);

  public constructor(
    private readonly _accountRepository: AccountRepository,
  ) {}

  /** Runs CRUD demo after module initialisation. */
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
    // this._logger.log(`[DELETE] done — id: ${account.id}`);
  }
}
