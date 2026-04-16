import { Injectable } from '@nestjs/common';
import { UseCaseResult } from '../../../interfaces/systems/use-case-result.interface';
import { EnumerationErrorCodes } from 'src/interfaces/systems/error-codes.interface';
import { ReadSessionManagerService } from '../../../managers-level/session/read/read-session.manager.service';
import { DeleteSessionManagerService } from '../../../managers-level/session/delete/delete.manager.service';

/** Сервис модуля бизнес логики уровня UseCase выхода из аккаунта */
@Injectable()
export class AccountLogoutUseCaseService {
  /**
   * Конструктор сервиса системы
   * @param {ReadSessionManagerService} readSessionManagerService - Экземпляр сервиса модуля бизнес логики уровня manager чтения сессии
   * @param {DeleteSessionManagerService} deleteSessionManagerService - Экземпляр сервиса уровня manager бизнес логики удаления сессии
   */
  constructor(
    private readSessionManagerService: ReadSessionManagerService,
    private deleteSessionManagerService: DeleteSessionManagerService,
  ) {}

  /**
   * Метод выхода из аккаунта
   * @param {string} refreshToken - Токен обновления пары токенов JWT
   * @returns {Promise<UseCaseResult<null>>} - Результат работы методы выхода из аккаунта
   * @public
   */
  public async logout(refreshToken: string): Promise<UseCaseResult<null>> {
    /** Результат чтения сессии до момента ее удаления */
    const resultReadBeforeDelete =
      await this.readSessionManagerService.readBeforeDelete(refreshToken);

    if (resultReadBeforeDelete.error) {
      return {
        ...resultReadBeforeDelete,
        data: null,
      };
    }

    /** Результат удаления сессии зная ее идентификатор */
    const resultDeletedSessionAfterReading =
      await this.deleteSessionManagerService.delete(
        resultReadBeforeDelete.data?.id as string,
      );

    if (resultDeletedSessionAfterReading.error) {
      return {
        ...resultDeletedSessionAfterReading,
        data: null,
      };
    }

    return {
      error: false,
      successMessages: [
        ...resultReadBeforeDelete.successMessages,
        ...resultDeletedSessionAfterReading.successMessages,
      ],
      errorMessages: [
        ...resultReadBeforeDelete.errorMessages,
        ...resultDeletedSessionAfterReading.errorMessages,
      ],
      data: null,
      errorCode: EnumerationErrorCodes.ERROR_CODE_NULL,
    };
  }
}
