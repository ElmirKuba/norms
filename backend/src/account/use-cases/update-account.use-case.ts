import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import type { UpdateAccountDto } from '../dto/update-account.dto';

/** Use-case смены пароля текущего аккаунта. */
@Injectable()
export class UpdateAccountUseCase {
  public constructor(private readonly _accountRepo: AccountRepository) {}

  /**
   * Меняет пароль аккаунта после проверки текущего.
   * @param accountId - ID аккаунта из JWT.
   * @param dto - Текущий и новый пароль.
   * @throws NotFoundException если аккаунт не найден.
   * @throws UnauthorizedException если текущий пароль неверен.
   */
  public async execute(accountId: string, dto: UpdateAccountDto): Promise<void> {
    const account = await this._accountRepo.findById(accountId);
    if (account === null) {
      throw new NotFoundException(makeError(ErrorCode.ACCOUNT_NOT_FOUND));
    }

    const valid = await argon2.verify(account.passwordHash, dto.current_password);
    if (!valid) {
      throw new UnauthorizedException(makeError(ErrorCode.INVALID_CREDENTIALS));
    }

    const newHash = await argon2.hash(dto.new_password);
    await this._accountRepo.updatePassword(accountId, newHash);
  }
}
