import { Module } from '@nestjs/common';
import { PackageSourceUtilityService } from './package-source.utility.service';

/** Модуль бизнес логики уровня утилиты для работы с package */
@Module({
  imports: [],
  exports: [PackageSourceUtilityService],
  controllers: [],
  providers: [PackageSourceUtilityService],
})
export class PackageSourceUtilityModule {}
