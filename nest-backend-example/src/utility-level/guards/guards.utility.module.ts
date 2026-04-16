import { Module } from '@nestjs/common';
import { ValidateTokensManagerModule } from 'src/managers-level/tokens/validate-tokens/validate-tokens.manager.module';
import { AuthGuardService } from './auth.guard.utility.service';
import { RoleGuardService } from './role.guard.utility.service';

/** Модуль для всех защитников проекта */
@Module({
  imports: [ValidateTokensManagerModule],
  exports: [
    ValidateTokensManagerModule,
    //
    AuthGuardService,
    RoleGuardService,
  ],
  controllers: [],
  providers: [AuthGuardService, RoleGuardService],
})
export class GuardsUtilityModule {}
