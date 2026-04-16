import { Module } from '@nestjs/common';
import { GuardsUtilityModule } from './guards/guards.utility.module';
import { PackageSourceUtilityModule } from './package-source/package-source.utility.module';

/** Модуль бизнес логики уровня Utility */
@Module({
  imports: [GuardsUtilityModule, PackageSourceUtilityModule],
  exports: [],
  controllers: [],
  providers: [],
})
export class AllUtilityLevelModule {}
