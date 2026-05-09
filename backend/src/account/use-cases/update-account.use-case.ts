import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AccountRepository } from '../../domain/ports/account.repository.port';
import { ErrorCode, makeError } from '../../common/errors/error-codes';
import type { UpdateAccountDto } from '../dto/update-account.dto';

/** Use-case обновления аккаунта: смена пароля и/или псевдонима. */
@Injectable()
export class UpdateAccountUseCase {
  public constructor(private readonly _accountRepo: AccountRepository) {}

  /**
   * Обновляет аккаунт: пароль (с проверкой текущего) и/или псевдоним.
   * @param accountId - ID аккаунта из JWT.
   * @param dto - Поля для обновления.
   * @throws BadRequestException если нет ни одного поля для обновления.
   * @throws NotFoundException если аккаунт не найден.
   * @throws UnauthorizedException если текущий пароль неверен.
   */
  public async execute(accountId: string, dto: UpdateAccountDto): Promise<void> {
    const hasPasswordChange = dto.new_password !== undefined;
    const hasNickname = dto.nickname !== undefined;

    if (!hasPasswordChange && !hasNickname) {
      throw new BadRequestException(makeError(ErrorCode.NOTHING_TO_UPDATE));
    }

    if (hasPasswordChange) {
      if (dto.current_password === undefined) {
        throw new BadRequestException(makeError(ErrorCode.CURRENT_PASSWORD_REQUIRED));
      }
      const account = await this._accountRepo.findById(accountId);
      if (account === null) {
        throw new NotFoundException(makeError(ErrorCode.ACCOUNT_NOT_FOUND));
      }
      const valid = await argon2.verify(account.passwordHash, dto.current_password);
      if (!valid) {
        throw new UnauthorizedException(makeError(ErrorCode.INVALID_CREDENTIALS));
      }
      const newPassword: string = dto.new_password ?? '';
      const newHash = await argon2.hash(newPassword);
      await this._accountRepo.updatePassword(accountId, newHash);
    }

    if (hasNickname) {
      await this._accountRepo.update(accountId, { nickname: dto.nickname });
    }
  }
}
