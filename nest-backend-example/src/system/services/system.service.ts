import { InjectDrizzle } from '@knaadh/nestjs-drizzle-mysql2';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { execSync } from 'child_process';
import { MySql2Database } from 'drizzle-orm/mysql2';

/** Основной сервис системного модуля приложения NestJS */
@Injectable()
export class SystemService implements OnModuleInit {
  /**
   * Логгер NestJS для вывода сообщений в консоль.
   * @protected
   */
  private readonly logger = new Logger(SystemService.name);

  /**
   * Конструктор сервиса системы
   * @param db - Клиент Drizzle ORM для выполнения SQL-запросов.
   */
  constructor(
    @InjectDrizzle('DRIZZLE_DB_MYSQL_ONE')
    private readonly db: MySql2Database<Record<string, unknown>>,
  ) {}

  /**
   * Хук, вызываемый при инициализации модуля
   * @returns {Promise<void>} - Ничего не возвращает
   * @public
   * */
  public async onModuleInit(): Promise<void> {
    try {
      /** Временная метка начала запроса */
      const start = Date.now();
      await this.db.execute(`SELECT 1`);
      const latency = Date.now() - start;
      this.logger.log(`MySQL ping через SELECT 1: ${latency}ms`);
    } catch (err) {
      this.logger.error('Не удалось выполнить ping к MySQL:', err);
    }
  }

  /**
   * Метод запуска миграции в базу данных
   * @returns {string[]} - Результат миграции схем в базу данных
   * @public
   * */
  public devMigrate(): string[] {
    /** Массив для лога сообщений метода */
    const messages: string[] = [];

    const output = execSync('npm run drizzle:push', {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd(),
    });

    messages.push(`✅ drizzle:push завершено:`);
    messages.push(output);

    messages.forEach((message) => {
      this.logger.log(message);
    });

    return messages;
  }
}
