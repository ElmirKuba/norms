# Backend stack

Серверная часть «Нормисов». Реальный стек и архитектура. API-контракты — в [`api-contracts.md`](api-contracts.md).

## Стек

| Слой | Выбор | Заметки |
|---|---|---|
| Фреймворк | **NestJS 11** | TypeScript, модульная архитектура, DI, decorator-based. |
| БД | **PostgreSQL 16** | `citext` для username, `pgEnum` для platform-полей, `bytea` для encrypted blob'ов (когда дойдём до чатов в шаге 9). |
| ORM | **Drizzle 0.40** + `pg` 8 (node-postgres) | `drizzle-orm/node-postgres`. `postgres-js` не используется (ESM-only, несовместим с NestJS CommonJS). |
| Очередь | **BullMQ + ioredis** | Сейчас: генерация UIN (`uin-generation` queue). На будущее: cleanup, push-sender. |
| Redis | **ioredis** напрямую | Rate-limit-счётчики (login + recovery), TTL-хранилище одноразовых reset_token. |
| Auth | **@nestjs/jwt** + **argon2** | JWT HS256 для access, opaque 32 байта для refresh. argon2id для паролей и хешей recovery-ответов. |
| WSS | **@nestjs/websockets** + **@nestjs/platform-ws** (`ws`) | Один глобальный gateway `/ws`. |
| Валидация | **class-validator** + **class-transformer** | DTO с decorator-based валидацией. |

## Архитектура

Гибрид feature-модулей и слоистой структуры. Папки `presentation/` и `application/` присутствуют как placeholder'ы (.gitkeep), но фактически каждая фича — самостоятельный модуль со своими `controller.ts`, `dto/`, `use-cases/`. Cross-cutting слои (`domain/`, `persistence/`, `common/`) разделены.

```
backend/src/
├── account/           — модуль аккаунтов (controller, dto, use-cases)
├── invite/            — модуль инвайтов
├── session/           — модуль сессий
├── recovery/          — модуль восстановления доступа (Q/A + сброс пароля)
├── search/            — глобальный поиск
├── uin/               — UIN: controller + BullMQ-процессор
├── wss/               — WSS-gateway + connection store
├── auth/              — shared: JwtModule, JwtGuard, @CurrentUser decorator
├── redis/             — ioredis-клиент (REDIS_CLIENT token)
├── config/            — AppConfigController (feature flags)
├── domain/            — ports (abstract class) + entities
├── persistence/       — Drizzle: schemas/, repositories/, drizzle.module.ts
├── common/            — errors/, utils/, types/
├── presentation/      — пусто (.gitkeep)
├── application/       — пусто (.gitkeep)
├── app.module.ts
└── main.ts
```

### Слои внутри гибрида

- **Controller** (feature/*.controller.ts) — HTTP/WSS endpoint, валидация DTO, делегирует use-case.
- **Use-case** (feature/use-cases/*.use-case.ts) — оркестратор одного сценария. Один класс = один use-case.
- **Domain port** (domain/ports/*.repository.port.ts) — `abstract class` интерфейс репозитория. Используется в use-case через DI.
- **Persistence** (persistence/repositories/*.repository.ts) — Drizzle-реализация порта. `provide`'ится как `useClass` через `PersistenceModule`.
- **Schema** (persistence/schemas/*.schema.ts) — Drizzle table definition с `satisfies SchemaColumnMap<T>` (см. ниже).
- **Entity** (domain/entities/*.entity.ts) — доменный тип строки (TS interface).

### Соглашение по ошибкам (`common/errors/error-codes.ts`)

Единый источник правды:

```ts
export enum ErrorCode {
  /** Описание для jsdoc/require-jsdoc */
  INVITE_NOT_FOUND = 'invite_not_found',
}

export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.INVITE_NOT_FOUND]: 'Инвайт не найден',
};

export function makeError(code: ErrorCode): ErrorBody {
  return { code, message: ErrorMessage[code] };
}
```

В use-case: `throw new NotFoundException(makeError(ErrorCode.INVITE_NOT_FOUND))`.
Доп. поля: `{ ...makeError(ErrorCode.LOGIN_RATE_LIMITED), retry_after }`.

`ErrorMessage` — `Record<ErrorCode, string>` (а не `Partial`), компилятор заставляет покрыть каждый код.

### Соглашение по схемам Drizzle (`persistence/schemas/`)

Каждая таблица имеет TS-интерфейс строки + `satisfies SchemaColumnMap<T>`:

```ts
// define-table.helper.ts
export type SchemaColumnMap<T> = { [K in keyof T]: PgColumnBuilderBase };

// sessions.schema.ts
interface ISessionRow {
  readonly id: unknown;
  readonly accountId: unknown;
  // … каждая колонка обязана быть здесь
}

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull().references(/* … */),
  // …
} satisfies SchemaColumnMap<ISessionRow>);
```

`satisfies` (а не присвоение с типом) — сохраняет конкретные типы колонок, что нужно Drizzle для вывода ORM-типов. ESLint override для `schemas/*.ts` — Drizzle callback не аннотируется стандартными средствами.

## Хранение сессий

Только в PostgreSQL — таблица `sessions` (refresh_token_hash, updated_at). Подробнее: [`auth-devices.md`](auth-devices.md#таблица-sessions).

Решение зафиксировано: один источник правды, без cache-aside на старте. Если в будущем профиль покажет, что чтение sessions = bottleneck — добавим Redis read cache с инвалидацией on write.

## Миграции БД

`drizzle-kit push` — изменения схемы применяются напрямую из TS в БД, без файлов миграций. Сценарий:

```bash
npm run db:push       # синхронизировать схему
npm run db:comments   # применить COMMENT ON TABLE/COLUMN из docker/sql-files/comments.sql
npm run db:setup      # = db:push + db:comments
```

`drizzle-kit generate` / `migrate` доступны в `package.json`, но MVP их не использует — `push` достаточно для итеративной разработки. Папки `backend/drizzle/` нет.

`docker/sql-files/init.sql` запускается через `docker-entrypoint-initdb.d` при первом старте postgres-контейнера — создаёт расширение `citext`. Файл `comments.sql` применяется отдельно через `npm run db:comments`.

## Структура репозитория

```
norms/
├── application-with-frontend/   ← Angular + Capacitor + Electron (свой package.json)
├── backend/                     ← NestJS (свой package.json)
│   ├── src/
│   └── docker/
│       ├── compose-files/docker-compose.dev.yml
│       ├── sql-files/{init.sql, comments.sql}
│       ├── pgadmin/servers.json
│       ├── dockerfiles/nest-backend/Dockerfile.dev
│       └── volumes/             ← persistent данные (gitignored)
├── design/
├── docs/
├── nest-backend-example/        ← архитектурный референс, удалить после миграции
├── CLAUDE.md
├── PROJECT.md
└── TODO.md
```

Два независимых `package.json`, без Nx/Turbo/pnpm-workspaces. Типы API-контрактов между фронтом и бэком дублируются руками.

## Docker Compose (dev)

`backend/docker/compose-files/docker-compose.dev.yml`. Сервисы:

| Сервис | Контейнер | Порт | Назначение |
|---|---|---|---|
| postgres | `postgres_norms_dev` | 5432 | БД, healthcheck `pg_isready` |
| redis | `redis_norms_dev` | 6379 | BullMQ + rate-limit + reset_token |
| pgadmin | `pgadmin_norms_dev` | 8081 | UI для Postgres, автоконфиг через `pgadmin/servers.json` |
| redisinsight | `redisinsight_norms_dev` | 5540 | UI для Redis |
| backend | `backend_norms_dev` | 3000 | NestJS (по умолчанию запускается на хосте через `npm run start:dev`, в compose-файле раскомментировать для запуска внутри Docker) |

Volume'ы данных — `backend/docker/volumes/{pg_data, redis_data, redisinsight_data, pgadmin_data}` (gitignored, кроме `.gitkeep`).

### npm-скрипты

```
docker:up         # docker compose up -d
docker:dev        # docker compose up (foreground)
docker:rebuild    # up --build
docker:down       # down
docker:logs       # logs -f
```

## Env (`.env.example`)

```
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://norms:norms@localhost:5432/norms

# Redis (BullMQ, rate-limit, reset_token TTL)
REDIS_URL=redis://localhost:6379

# Auth
JWT_ACCESS_TTL=15s
JWT_REFRESH_TTL=30d
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Devices
DEVICE_LIMIT=20

# Invites
INVITE_TTL_DAYS=7

# Feature flags
FEATURE_FREE_REGISTRATION=false
FEATURE_DEV_MODE=false
```

Используются в коде, но **отсутствуют в `.env.example`** (default'ы зашиты):
- `AUTH_FAIL_LIMIT` (default `5`) — порог неудачных логинов
- `AUTH_FAIL_WINDOW_SEC` (default `900`) — окно rate-limit

Объявлены в `.env.example`, но **не используются в коде** (задел на будущее):
- `JWT_REFRESH_TTL` — refresh server-side не истекает (см. [`auth-devices.md`](auth-devices.md#токены))
- `JWT_REFRESH_SECRET` — refresh-токен opaque, не JWT
