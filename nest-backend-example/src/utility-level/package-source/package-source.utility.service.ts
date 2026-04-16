import { Injectable } from '@nestjs/common';
import { PackageSource } from '../../interfaces/utilities/package-source.interface';

/** Реализация для Nest.js сервиса для работы с PackageSource */
@Injectable()
export class PackageSourceUtilityService {
  /** Сам, непосредственно, экземпляр PackageSourceInnerService */
  packageSourceInstance: PackageSourceInnerService;

  /**
   * Конструктор класса утилит
   */
  constructor() {
    this.packageSourceInstance = PackageSourceInnerService.getInstance();
  }

  /**
   * Получить значение из package.json по ключу
   * @param {K} key - Ключ для чтения значения из package.json
   * @returns {PackageSource[K] | null} - Значение по ключу из package.json или null если ничего нет
   * @public
   */
  public getPackageByKey<K extends keyof PackageSource>(
    key: K,
  ): PackageSource[K] | null {
    return this.packageSourceInstance.getPackageByKey(key);
  }
}

/** Внутренняя реализация сервиса для работы с PackageSource */
export class PackageSourceInnerService {
  /** Сам, непосредственно, экземпляр текущего класса */
  private static currentInstance: PackageSourceInnerService;

  /** Сами, непосредственно данные из package.json */
  private packageSourceData: PackageSource;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    this.packageSourceData = require('../../../package.json') as PackageSource;
  }

  /**
   * Публичный статический метод для получения одного единственного экземпляра текущего класса
   * @returns {PackageSourceInnerService} - Один единственный экземпляр текущего класса
   * @public
   */
  public static getInstance(): PackageSourceInnerService {
    if (!PackageSourceInnerService.currentInstance) {
      PackageSourceInnerService.currentInstance =
        new PackageSourceInnerService();
    }

    return PackageSourceInnerService.currentInstance;
  }

  /**
   * Получить значение из package.json по ключу
   * @param {K} key - Ключ для чтения значения из package.json
   * @returns {PackageSource[K] | null} - Значение по ключу из package.json или null если ничего нет
   * @public
   */
  public getPackageByKey<K extends keyof PackageSource>(
    key: K,
  ): PackageSource[K] | null {
    if (this.packageSourceData[key]) {
      return this.packageSourceData[key];
    }
    return null;
  }
}
