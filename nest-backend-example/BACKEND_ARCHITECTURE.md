# Архитектура бэкенда

---

# Часть 1. Рекомендуемая архитектура (для нового бэкенда)

4 слоя вместо 5. Убран слой адаптеров (был чистым прокси). Ошибки через NestJS-исключения вместо Result-обёрток на каждом уровне. Репозитории изолированы через интерфейсы-порты в доменном слое — замена ORM по-прежнему не затрагивает бизнес-логику.

## Карта слоёв

```
HTTP / WebSocket запрос
        |
   [ Presentation ]        Контроллеры, DTO, фильтры исключений, gateway
        |
   [ Application ]         Оркестраторы use-case'ов
        |
   [ Domain ]              Бизнес-правила + интерфейсы репозиториев (порты)
        |
   [ Persistence ]         Реализации репозиториев (Drizzle), схемы, миграции
        |
     MySQL 8
```

### Правило зависимости

Каждый слой зависит только от слоя ниже. Persistence реализует интерфейсы, объявленные в Domain (инверсия зависимости). Сквозные механизмы (guards, декораторы, pipes) живут в `common/` и внедряются через DI.

### Почему 4 слоя, а не 5

В example-кодовой базе адаптеры делали ровно одно: переименовывали `data` → `adaptData` и проксировали вызов в репозиторий. Отдельный слой оправдан, когда между доменной моделью и моделью хранения есть реальная трансформация (агрегация, маппинг, кэш). Для текущего проекта — доменная модель = модель хранения, поэтому адаптер — лишний код. Если появится кейс с двумя ORM одновременно или сложный маппинг — адаптер можно вернуть точечно для конкретной сущности.

### Почему исключения вместо Result-обёрток

В example-кодовой базе каждый слой возвращал `{ error: boolean, errorMessages, data }`, и каждый вызывающий писал `if (result.error) return { ...result, data: null }`. Это ~40% кода в каждом сервисе. NestJS построен вокруг exception flow: `throw new NotFoundException()` → глобальный `ExceptionFilter` → стандартный JSON-ответ клиенту. Исключения убирают эту лесенку. Единый Result-тип оставляем только для API-ответа клиенту (`ApiResult<T>`).

---

## Структура директорий

```
src/
├── presentation/                  Слой представления
│   ├── controllers/
│   │   ├── account/
│   │   │   ├── auth.controller.ts
│   │   │   ├── create.controller.ts
│   │   │   ├── read.controller.ts
│   │   │   └── update.controller.ts
│   │   ├── session/
│   │   │   ├── refresh.controller.ts
│   │   │   ├── read.controller.ts
│   │   │   └── delete.controller.ts
│   │   └── controllers.module.ts
│   ├── gateways/
│   │   └── socket-io.gateway.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── presentation.module.ts
│
├── application/                   Слой приложения
│   ├── account/
│   │   ├── auth.use-case.ts
│   │   ├── create.use-case.ts
│   │   └── read.use-case.ts
│   ├── session/
│   │   ├── refresh.use-case.ts
│   │   └── delete.use-case.ts
│   └── application.module.ts
│
├── domain/                        Доменный слой
│   ├── services/
│   │   ├── account-auth.service.ts
│   │   ├── token.service.ts
│   │   └── session.service.ts
│   ├── ports/                     Интерфейсы репозиториев (инверсия зависимости)
│   │   ├── account.repository.port.ts
│   │   └── session.repository.port.ts
│   ├── entities/
│   │   ├── account.entity.ts
│   │   └── session.entity.ts
│   ├── errors/
│   │   ├── account-not-found.error.ts
│   │   ├── invalid-credentials.error.ts
│   │   └── session-expired.error.ts
│   └── domain.module.ts
│
├── persistence/                   Слой персистентности
│   ├── repositories/
│   │   ├── account.drizzle-repository.ts
│   │   └── session.drizzle-repository.ts
│   ├── schemas/
│   │   ├── account.schema.ts
│   │   └── session.schema.ts
│   ├── relations/
│   │   ├── account.relation.ts
│   │   └── session.relation.ts
│   ├── migrations/
│   └── persistence.module.ts
│
├── common/                        Сквозные механизмы
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── role.guard.ts
│   ├── decorators/
│   │   └── auth.decorator.ts
│   ├── pipes/
│   ├── dto/
│   │   ├── input/
│   │   │   └── auth-account.dto.ts
│   │   └── output/
│   │       ├── account.output-dto.ts
│   │       └── api-result.dto.ts
│   └── common.module.ts
│
├── config/                        Конфигурация
│   ├── database.config.ts
│   ├── jwt.config.ts
│   └── cors.config.ts
│
└── app.module.ts
```

---

## 1. Слой представления (Presentation)

**Директория:** `presentation/`

Принимает HTTP/WS запрос, валидирует DTO (через NestJS Pipes + class-validator), вызывает use-case, форматирует ответ.

```ts
// presentation/controllers/account/auth.controller.ts

@Controller('api/account')
export class AuthController {
  constructor(private readonly authUseCase: AuthUseCase) {}

  @Post('auth')
  async auth(
    @Body() dto: AuthAccountDto,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResult<AccountWithTokens>> {
    const result = await this.authUseCase.execute({ ...dto, ip, ua });

    res.cookie('accessToken', result.tokens.accessToken, { httpOnly: true });
    res.cookie('refreshToken', result.tokens.refreshToken, { httpOnly: true });

    return { error: false, errorMessages: [], successMessages: [], data: result };
  }
}
```

Контроллер не ловит исключения — это делает глобальный `HttpExceptionFilter`. Если use-case бросит `InvalidCredentialsError`, фильтр вернёт клиенту `401` с `ApiResult<null>`.

**Контракт наружу (клиенту):**
```ts
interface ApiResult<T> {
  error: boolean;
  errorMessages: string[];
  successMessages: string[];
  data: T;
}
```

---

## 2. Слой приложения (Application)

**Директория:** `application/`

Оркестрирует бизнес-поток. Не содержит бизнес-правил — только последовательность вызовов доменных сервисов. Если шаг провалился — доменный сервис сам бросит исключение, use-case его не ловит.

```ts
// application/account/auth.use-case.ts

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly accountRepo: AccountRepositoryPort,
    private readonly authService: AccountAuthService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async execute(data: AuthData): Promise<AccountWithTokens> {
    const account = await this.accountRepo.findByLogin(data.login);
    if (!account) throw new AccountNotFoundError(data.login);

    this.authService.verifyPassword(data.password, account.password);

    const tokens = this.tokenService.generatePair(account, data.ua, data.ip);

    await this.sessionService.upsert({
      accountId: account.id,
      refreshToken: tokens.refreshToken,
      ip: data.ip,
      ua: data.ua,
    });

    return { account: AccountOutputDto.from(account), tokens };
  }
}
```

Use-case — один класс, один публичный метод `execute()`. Легко тестировать: мокаешь порты, проверяешь последовательность.

---

## 3. Доменный слой (Domain)

**Директория:** `domain/`

Содержит три вещи:

### 3a. Доменные сервисы (`domain/services/`)

Чистая бизнес-логика без зависимости от фреймворка (кроме `@Injectable()` для DI).

```ts
// domain/services/account-auth.service.ts

@Injectable()
export class AccountAuthService {
  verifyPassword(input: string, hash: string): void {
    if (!bcrypt.compareSync(input, hash)) {
      throw new InvalidCredentialsError();
    }
  }

  hashPassword(raw: string): string {
    return bcrypt.hashSync(raw, 10);
  }
}
```

```ts
// domain/services/token.service.ts

@Injectable()
export class TokenService {
  constructor(private readonly config: JwtConfig) {}

  generatePair(account: AccountEntity, ua: string, ip: string): TokenPair {
    const payload = { accountId: account.id, login: account.login };
    return {
      accessToken: jwt.sign(payload, this.config.accessSecret, {
        expiresIn: this.config.accessLifetime,
      }),
      refreshToken: jwt.sign(payload, this.config.refreshSecret, {
        expiresIn: this.config.refreshLifetime,
      }),
    };
  }

  verify(token: string, type: 'access' | 'refresh'): TokenPayload {
    const secret = type === 'access'
      ? this.config.accessSecret
      : this.config.refreshSecret;
    try {
      return jwt.verify(token, secret) as TokenPayload;
    } catch (err) {
      throw new SessionExpiredError();
    }
  }
}
```

### 3b. Порты репозиториев (`domain/ports/`)

Интерфейсы, которые описывают что домен хочет от хранилища. Реализация — в Persistence слое. NestJS DI связывает их в модуле.

```ts
// domain/ports/account.repository.port.ts

export abstract class AccountRepositoryPort {
  abstract findByLogin(login: string): Promise<AccountEntity | null>;
  abstract findById(id: string): Promise<AccountEntity | null>;
  abstract create(data: CreateAccountData): Promise<AccountEntity>;
  abstract update(id: string, data: Partial<CreateAccountData>): Promise<void>;
}
```

```ts
// domain/ports/session.repository.port.ts

export abstract class SessionRepositoryPort {
  abstract upsert(data: UpsertSessionData): Promise<void>;
  abstract findByRefreshToken(token: string): Promise<SessionEntity | null>;
  abstract findAllByAccountId(accountId: string): Promise<SessionEntity[]>;
  abstract deleteById(id: string): Promise<void>;
  abstract deleteAllByAccountIdExcept(accountId: string, keepId: string): Promise<void>;
}
```

Порты — абстрактные классы, а не интерфейсы. Причина: NestJS DI не может инжектить по TS-интерфейсу (они стираются при компиляции), а абстрактные классы сохраняются как runtime-токены.

### 3c. Доменные сущности и ошибки (`domain/entities/`, `domain/errors/`)

```ts
// domain/entities/account.entity.ts

export interface AccountEntity {
  id: string;
  login: string;
  password: string;
}
```

```ts
// domain/errors/account-not-found.error.ts

import { NotFoundException } from '@nestjs/common';

export class AccountNotFoundError extends NotFoundException {
  constructor(login: string) {
    super(`Аккаунт с логином "${login}" не найден`);
  }
}
```

```ts
// domain/errors/invalid-credentials.error.ts

import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsError extends UnauthorizedException {
  constructor() {
    super('Неверный логин или пароль');
  }
}
```

Доменные ошибки наследуют NestJS HTTP-исключения — фильтр исключений превращает их в правильный HTTP-статус автоматически.

---

## 4. Слой персистентности (Persistence)

**Директория:** `persistence/`

Реализует порты из Domain. Единственное место, где есть импорты из Drizzle.

```ts
// persistence/repositories/account.drizzle-repository.ts

@Injectable()
export class AccountDrizzleRepository extends AccountRepositoryPort {
  constructor(
    @InjectDrizzle('DB') private readonly db: MySql2Database,
  ) { super(); }

  async findByLogin(login: string): Promise<AccountEntity | null> {
    const rows = await this.db
      .select()
      .from(accountSchema)
      .where(eq(accountSchema.login, login))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<AccountEntity | null> {
    const rows = await this.db
      .select()
      .from(accountSchema)
      .where(eq(accountSchema.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: CreateAccountData): Promise<AccountEntity> {
    const id = `${uuidv4()}_${Date.now()}`;
    await this.db.insert(accountSchema).values({ id, ...data });
    return { id, ...data };
  }

  async update(id: string, data: Partial<CreateAccountData>): Promise<void> {
    await this.db
      .update(accountSchema)
      .set(data)
      .where(eq(accountSchema.id, id));
  }
}
```

```ts
// persistence/repositories/session.drizzle-repository.ts

@Injectable()
export class SessionDrizzleRepository extends SessionRepositoryPort {
  constructor(
    @InjectDrizzle('DB') private readonly db: MySql2Database,
  ) { super(); }

  async upsert(data: UpsertSessionData): Promise<void> {
    const id = `${uuidv4()}_${Date.now()}`;
    await this.db
      .insert(sessionSchema)
      .values({ id, ...data })
      .onDuplicateKeyUpdate({
        set: {
          refreshToken: data.refreshToken,
          browserData: data.browserData,
          cpuArchitecture: data.cpuArchitecture,
          deviceData: data.deviceData,
          osData: data.osData,
        },
      });
  }

  async deleteAllByAccountIdExcept(accountId: string, keepId: string): Promise<void> {
    await this.db
      .delete(sessionSchema)
      .where(
        and(
          eq(sessionSchema.accountId, accountId),
          ne(sessionSchema.id, keepId),
        ),
      );
  }

  // ...остальные методы
}
```

### Связка порта с реализацией

```ts
// persistence/persistence.module.ts

@Module({
  providers: [
    {
      provide: AccountRepositoryPort,
      useClass: AccountDrizzleRepository,
    },
    {
      provide: SessionRepositoryPort,
      useClass: SessionDrizzleRepository,
    },
  ],
  exports: [AccountRepositoryPort, SessionRepositoryPort],
})
export class PersistenceModule {}
```

Замена ORM: создать `AccountPrismaRepository extends AccountRepositoryPort`, поменять `useClass` в модуле. Домен и выше — ноль изменений.

---

## Сквозные механизмы (Common)

**Директория:** `common/`

| Компонент | Назначение |
|---|---|
| `guards/auth.guard.ts` | Извлекает JWT из cookie/заголовка, валидирует через `TokenService` |
| `guards/role.guard.ts` | Ролевой доступ из метаданных payload |
| `decorators/auth.decorator.ts` | `@Auth()` — guard + метаданные в одном декораторе |
| `dto/input/` | Входные DTO с `class-validator` |
| `dto/output/` | Выходные DTO, `ApiResult<T>` |
| `pipes/` | Кастомные валидационные pipes |

---

## Связка модулей

```
AppModule
  |- ConfigModule                     .env, конфигурация
  |- PersistenceModule                Drizzle, реализации репозиториев
  |- DomainModule                     Бизнес-сервисы
  |- ApplicationModule                Use-case оркестраторы
  |- PresentationModule               Контроллеры, gateway
  |- CommonModule                     Guards, декораторы, pipes
```

---

## Сравнение с example-кодовой базой

| Аспект | Example (5 слоёв) | Рекомендуемый (4 слоя) |
|---|---|---|
| Слой адаптеров | Отдельный класс-прокси на каждую сущность | Нет. Порт (абстрактный класс) в Domain, реализация в Persistence |
| Обработка ошибок | `{ error: boolean, errorMessages[] }` на каждом слое, `if (result.error)` лесенка | `throw new DomainError()` → глобальный `ExceptionFilter` |
| Контракт между слоями | `UseCaseResult<T>`, `ManagerResult<T>`, `AdapterResult<T>`, `RepositoryResult<T>` | Только `ApiResult<T>` на выходе к клиенту. Внутри — обычные типы + исключения |
| Удаление N сессий | `for` цикл с `await` по одной | Один SQL: `DELETE WHERE accountId = ? AND id != ?` |
| Изоляция ORM | Через отдельный слой адаптеров | Через абстрактный класс-порт + DI `provide/useClass` |
| Количество файлов на сущность | ~8 (controller, use-case, manager, adapter, repository, + модули) | ~5 (controller, use-case, service, repository, + порт) |
| Тестируемость | Мокать адаптер | Мокать порт (тот же подход, на один слой меньше) |

---

## Жизненный цикл запроса (авторизация)

```
POST /api/account/auth
  |
  v
AuthController.auth()                               [Presentation]
  |- валидация DTO (class-validator pipe)
  |- извлечь IP, UA
  |- вызвать AuthUseCase.execute()
  |
  v
AuthUseCase.execute()                                [Application]
  |- AccountRepositoryPort.findByLogin()
  |    |- AccountDrizzleRepository.findByLogin()     [Persistence]
  |    |    |- SELECT * FROM accounts WHERE login = ? LIMIT 1
  |    <- AccountEntity | null
  |- если null → throw AccountNotFoundError (404)
  |
  |- AccountAuthService.verifyPassword()             [Domain]
  |    |- bcrypt.compareSync()
  |    |- если не совпал → throw InvalidCredentialsError (401)
  |
  |- TokenService.generatePair()                     [Domain]
  |    |- jwt.sign() x2
  |    <- { accessToken, refreshToken }
  |
  |- SessionRepositoryPort.upsert()
  |    |- SessionDrizzleRepository.upsert()          [Persistence]
  |    |    |- INSERT ... ON DUPLICATE KEY UPDATE
  |
  v
AuthController
  |- res.cookie('accessToken', ...)
  |- res.cookie('refreshToken', ...)
  |- return ApiResult<{ account, tokens }>
```

Если на любом шаге бросается исключение — оно всплывает до `HttpExceptionFilter`, который формирует `ApiResult<null>` с нужным HTTP-статусом. Ни один промежуточный слой не пишет `if (error) return error`.

---
---
---

# Часть 2. Архитектура example-кодовой базы (текущая реализация)

Ниже описана архитектура из `nest-backend-example/`. Код написан в спешке и не предназначен для продакшена — только как справочный пример слоёв и паттернов.

## Карта слоёв (5 слоёв)

```
HTTP / WebSocket запрос
        |
   [ Presentation ]        Контроллеры, DTO, фильтры исключений
        |
   [ Application ]         Оркестраторы use-case'ов
        |
   [ Domain ]              Бизнес-правила, валидация, логика токенов
        |
   [ Infrastructure ]      Адаптер-сервисы (реализация портов)
        |
   [ Persistence ]         Репозитории Drizzle ORM, схемы, миграции
        |
     MySQL 8
```

### Правило зависимости

Каждый слой зависит только от слоя непосредственно под ним. Ни один слой не импортирует ничего из слоя выше. Сквозные механизмы (guards, декораторы) живут в отдельном модуле `utility/` и внедряются через DI NestJS.

---

## 1. Слой представления (Presentation)

**Текущая директория:** `api-endpoints/`, `gateways/`, `filters/`, `dtos/`

Обрабатывает HTTP-запросы, WebSocket-соединения, валидацию входных данных и форматирование ответов.

| Компонент | Ответственность |
|---|---|
| Контроллеры (`api-endpoints/`) | Обработка маршрутов, управление cookie, извлечение IP/UA из запроса |
| Gateway (`gateways/socket.io/`) | Жизненный цикл Socket.IO, аутентификация клиента при подключении |
| DTO (`dtos/input/`, `dtos/output/`) | Схемы `class-validator` для входных данных; выходные формы без пароля |
| Фильтр исключений (`filters/`) | Перехватывает `HttpException`, преобразует в стандартную обёртку `ApiResult<T>` |

**Зависит от:** слоя Application (use-case сервисы).

**Контракт наружу (клиенту):**
```ts
interface ApiResult<T> {
  error: boolean;
  errorMessages: string[];
  successMessages: string[];
  data: T;
}
```

---

## 2. Слой приложения (Application)

**Текущая директория:** `use-cases-level/`

Оркестрирует бизнес-поток, последовательно вызывая несколько доменных сервисов. Не содержит собственных бизнес-правил — только логику координации.

**Пример — поток авторизации (`AccountAuthUseCaseService.auth()`):**
1. `AccountReadDomainService.readBeforeAuth()` — проверить существование аккаунта
2. `AccountAuthDomainService.authExistingAccount()` — сверить пароль
3. `GenerateTokensDomainService.generatePairTokens()` — выпустить пару JWT
4. `CreateOrUpdateSessionDomainService.createOrUpdate()` — сохранить сессию

**Зависит от:** слоя Domain (несколько доменных сервисов на один use-case).

**Контракт наружу (к Presentation):**
```ts
interface UseCaseResult<T> {
  error: boolean;
  errorCode: ErrorCode;
  errorMessages: string[];
  successMessages: string[];
  data: T;
}
```

---

## 3. Доменный слой (Domain)

**Текущая директория:** `managers-level/`

Реализует бизнес-правила: хеширование/сравнение паролей (bcrypt), генерацию/валидацию токенов (jsonwebtoken), решения по жизненному циклу сессий.

Каждый доменный сервис общается ровно с одним адаптером (либо вообще без внешних зависимостей — для чистой логики вроде сравнения паролей).

| Доменный сервис | Назначение |
|---|---|
| `AccountReadDomainService` | Чтение аккаунта через адаптер, проверка существования |
| `AccountAuthDomainService` | Сравнение паролей через bcrypt |
| `AccountCreateDomainService` | Хеширование пароля, создание аккаунта через адаптер |
| `GenerateTokensDomainService` | Подпись пары access + refresh JWT |
| `ValidateTokensDomainService` | Верификация и декодирование любого JWT |
| `CreateOrUpdateSessionDomainService` | Upsert сессии через адаптер |
| `DeleteSessionDomainService` | Удаление сессии(й) через адаптер |
| `ReadSessionDomainService` | Чтение сессии(й) через адаптер |

**Зависит от:** слоя Infrastructure (адаптер-сервисы).

**Контракт наружу (к Application):**
```ts
interface DomainResult<T> {
  error: boolean;
  errorCode: ErrorCode;
  errorMessages: string[];
  successMessages: string[];
  data: T;
}
```

---

## 4. Слой инфраструктуры (Infrastructure / Adapters)

**Текущая директория:** `adapters/`

Переводит контракты доменного слоя в контракты слоя персистентности. Это шов, по которому меняется ORM.

**Что делает адаптер:**
- Получает вызов от доменного сервиса с `ReadQueryAdapter<T>` (типизирован по доменному интерфейсу)
- Делегирует репозиторию (сейчас — Drizzle)
- Возвращает `AdapterResult<T>` — никогда не пробрасывает типы ORM наверх

```ts
// Доменный сервис вызывает:
adapter.readOneBySlug({ columnName: 'login', columnValue: 'user1' })

// Адаптер делегирует:
drizzleRepository.readOneBySlug(...)

// Адаптер возвращает:
{ error: false, adaptData: { id, login, password } }
```

**Контракт входа (от Domain):**
```ts
interface ReadQueryAdapter<T> {
  columnName: keyof T;
  columnValue: string;
}
```

**Контракт выхода (к Domain):**
```ts
interface AdapterResult<T> {
  error: boolean;
  adaptData: T;
}
```

### Зачем этот слой нужен

Без адаптеров доменные сервисы импортировали бы `eq()`, `and()`, объекты схем из Drizzle — привязывая бизнес-логику к ORM. С адаптерами:

- **Заменить Drizzle на Sequelize:** написать новые классы `SequelizeRepositoryService`, обновить конструкторы адаптеров. Домен и выше: ноль изменений.
- **Запустить две ORM одновременно:** часть адаптеров указывает на Drizzle-репозитории, другие — на Sequelize. Миграция сущность за сущностью.
- **Заменить MySQL на PostgreSQL:** меняется только слой персистентности. Интерфейс адаптера остаётся идентичным.

---

## 5. Слой персистентности (Persistence)

**Текущая директория:** `drizzle-repositories/`, `system/orm-schemas/`, `system/orm-relations/`, `system/orm-configs/`, `system/orm-migrations/`

Код, специфичный для Drizzle ORM. Все операции с базой данных живут здесь и нигде больше.

| Компонент | Назначение |
|---|---|
| `drizzle-repositories/` | CRUD + upsert методы через query builder Drizzle |
| `system/orm-schemas/` | Определения таблиц (`mysqlTable`) |
| `system/orm-relations/` | Drizzle `relations()` — внешние ключи, one-to-many |
| `system/orm-configs/` | Конфигурация подключения Drizzle |
| `system/orm-migrations/` | Сгенерированные SQL-файлы миграций |

**Контракт наружу (к Adapter):**
```ts
interface RepositoryResult<T> {
  error: boolean;
  data: T;
}
```

---

## Сквозные механизмы (Cross-Cutting Concerns)

**Текущая директория:** `utility-level/`

| Компонент | Назначение |
|---|---|
| `guards/auth.guard.ts` | Извлекает JWT из cookie (API) или заголовка (WS), валидирует через доменный сервис |
| `guards/role.guard.ts` | Ролевой доступ из метаданных JWT payload |
| `decorators/auth.decorator.ts` | `@Auth({ roles?, defendType? })` — объединяет guard + метаданные в один декоратор |
| `utils/join-ua-section.helper.ts` | Общая утилита для склейки строк UA-парсера |
| `utils/define-table.helper.ts` | Типизированная обёртка над `mysqlTable` |

---

## Иерархия интерфейсов

Интерфейсы разделены по области применения для соблюдения границ слоёв:

```
interfaces/
  pure-and-base/    Доменные примитивы (IAccountPure, ISessionPure, ISessionBase)
  full/             Сущности с ID (IAccountFull, ISessionFull)
  with-child/       Payload обновления с вложенными данными (ISessionUpdate)
  systems/          Контракты результатов слоёв (UseCaseResult, DomainResult, ErrorCode)
  adapters/         Контракты слоя адаптеров (ReadQueryAdapter, AdapterResult)
  orm-repositories/ Контракты слоя персистентности (RepositoryResult)
  api/              Форма API-ответа (ApiResult)
```

**Пример наследования сущности:**
```
IAccountPure { login, password }
    |
IAccountFull extends IAccountPure { id }
    |
IAccountWithoutPassword { id, login }  (основа для output DTO)
```

---

## Связка модулей

Каждый слой имеет модуль-агрегатор (`all.*.module.ts`), реэкспортирующий подмодули. `AppModule` импортирует все агрегаторы:

```
AppModule
  |- SystemModule                     Подключение к БД, конфигурация
  |- ApiEndpointsModule               Все контроллеры маршрутов
  |- AllGatewaysModule                Socket.IO
  |- AllApplicationModule             Оркестраторы use-case'ов
  |- AllDomainModule                  Сервисы бизнес-правил
  |- AllAdaptersModule                Слой трансляции ORM
  |- AllPersistenceModule             Репозитории Drizzle
  |- AllUtilityModule                 Guards, декораторы
```

---

## Нейминг: текущий vs рекомендуемый

При переписывании с нуля используйте эти имена для директорий и классов:

| Текущий (example-кодовая база) | Рекомендуемый |
|---|---|
| `api-endpoints/` | `controllers/` или `presentation/` |
| `use-cases-level/` | `application/` |
| `managers-level/` | `domain/` |
| `adapters/` | Убран (заменён портами в domain) |
| `drizzle-repositories/` | `persistence/` или `repositories/` |
| `utility-level/` | `common/` |
| `*ManagerService` | `*Service` |
| `*UseCaseService` | `*UseCase` |
| `AllManagerModule` | `DomainModule` |
| `AllUseCaseModule` | `ApplicationModule` |
| `ManagerResult<T>` | Исключения вместо Result |
| `UseCaseResult<T>` | Исключения вместо Result |
| `AdapterResultRepo<T>` | Убран |
| `ResultQueryRepository<T>` | Обычные типы / `null` + исключения |

---

## Жизненный цикл запроса (пример авторизации)

```
POST /api/account/auth
  |
  v
AuthController.auth()                           [Presentation]
  |- извлечь IP, распарсить UA, провалидировать DTO
  |- вызвать AccountAuthUseCase.auth()
  |
  v
AccountAuthUseCase.auth()                       [Application]
  |- AccountReadDomainService.readBeforeAuth()
  |    |- AccountAdapter.readOneBySlug()
  |    |    |- AccountDrizzleRepository.readOneBySlug()
  |    |    |    |- SELECT * FROM accounts WHERE login = ? LIMIT 1
  |    |    <- RepositoryResult<IAccountFull>
  |    <- AdapterResult<IAccountFull>
  |- DomainResult<IAccountFull>
  |
  |- AccountAuthDomainService.authExistingAccount()
  |    |- bcrypt.compareSync(input, hash)
  |- DomainResult (pass/fail)
  |
  |- GenerateTokensDomainService.generatePairTokens()
  |    |- jwt.sign(payload, secret, { expiresIn })  x2
  |- { accessToken, refreshToken }
  |
  |- CreateOrUpdateSessionDomainService.createOrUpdate()
  |    |- SessionAdapter.upsert()
  |    |    |- SessionDrizzleRepository.upsert()
  |    |    |    |- INSERT ... ON DUPLICATE KEY UPDATE
  |
  v
AuthController
  |- установить cookies (accessToken, refreshToken)
  |- вернуть ApiResult<{ account, tokens }>
```
