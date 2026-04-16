import { Controller, Get } from '@nestjs/common';
import { SystemService } from '../services/system.service';

/** Основной REST-API контроллер системного модуля приложения NestJS */
@Controller('system')
export class SystemController {
  /**
   * Конструктор контроллера системы
   * @param systemService - Экземпляр основного сервиса системы
   */
  constructor(private systemService: SystemService) {}

  /**
   * Системное API запуска миграции в базу данных
   * @returns {string[]} - Результат миграции схем в базу данных
   * @public
   * */
  @Get('dev/migrate')
  public devMigrate(): string[] {
    const resultMigrateMessages = this.systemService.devMigrate();

    return resultMigrateMessages;
  }
}
