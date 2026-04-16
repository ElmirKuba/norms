import { DynamicModule, ForwardReference, Module, Type } from '@nestjs/common';
import { ApiEndpointsModule } from './api-endpoints/api-endpoints.module';
import { SystemModule } from './system/system.module';
import { AllUseCaseModule } from './use-cases-level/all.use-case.module';
import { AllManagerModule } from './managers-level/all.manager.module';
import { AllAdaptersModule } from './adapters/all.adapter.module';
import { AllDrizzleRepositoriesModule } from './drizzle-repositories/all.drizzle-repositories.module';
import { AllUtilityLevelModule } from './utility-level/all.utility-level.module';
import { AllGatewaysModule } from './gateways/all.gateways.module';

/** Импорты системных модулей */
const importsSystemsModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [SystemModule];

/** Импорты модулей работы с REST-API и Gateways */
const importsApiEndpointsAndGatewaysModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [ApiEndpointsModule, AllGatewaysModule];

/** Импорты модулей Use-Case уровня */
const importsUseCasesModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [AllUseCaseModule];

/** Импорты модулей Manager уровня */
const importsManagersModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [AllManagerModule];

/** Импорты модулей-адаптеров */
const importsAdaptersModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [AllAdaptersModule];

/** Импорты модулей-адаптеров */
const importsDrizzleRepositoriesModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [AllDrizzleRepositoriesModule];

/** Импорты модулей-адаптеров */
const importsUtilitiesModules: Array<
  Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference
> = [AllUtilityLevelModule];

/** Главный модуль NestJS приложения */
@Module({
  imports: [
    ...importsSystemsModules,
    ...importsApiEndpointsAndGatewaysModules,
    ...importsUseCasesModules,
    ...importsManagersModules,
    ...importsAdaptersModules,
    ...importsDrizzleRepositoriesModules,
    ...importsUtilitiesModules,
  ],
  exports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
