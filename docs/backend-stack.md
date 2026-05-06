# Backend stack

Серверная часть «Нормисов». Решение по стеку — зафиксировано. Конкретные API-контракты — в [`api-contracts.md`](api-contracts.md).

## Стек

| Слой | Выбор | Заметки |
|---|---|---|
| Фреймворк | **NestJS** | TypeScript, модульная архитектура, DI, decorator-based. Архитектурный референс: [`nest-backend-example/`](../nest-backend-example/) (⚠ MySQL, bcrypt, cookies — **не копировать**, см. предупреждения в корневом `CLAUDE.md`) |
| БД | **PostgreSQL 16** | LISTEN/NOTIFY, JSONB, `pg_trgm` для поиска по `username`, партиционирование `pending_messages` на будущее |
| ORM | **Drizzle** (`drizzle-orm/node-postgres` + `pg` + `drizzle-kit`) | Лёгкий, миграции в TS, без магии. Используется `pg` (node-postgres) вместо `postgres-js` — последний ESM-only и несовместим с NestJS CommonJS |
| Очередь задач | **BullMQ + Redis** | Генерация UIN, rate-limit-счётчики (login/recovery), TTL-хранилище одноразовых токенов (`reset_token`), будущие job'ы (cleanup просроченных blob'ов, push-sender) |
| Транспорт | HTTPS (REST) + WSS (реалтайм) | См. [`server.md`](server.md) |

### Почему не MySQL
- LISTEN/NOTIFY — встроенный pub/sub. Нужен для сигналов «UIN готов», «кик устройства», «новое сообщение для сессии» без Redis pub/sub.
- JSONB с индексами — feature flags, metadata сессий, push-debug.
- `pg_trgm` — like-поиск по `username` без отдельного индекса.

### Почему не TypeORM
`nest-backend-example` использует Drizzle — берём оттуда. Type-safety на уровне схемы, миграции через `drizzle-kit`, без скрытого SQL.

## Хранение сессий

Сессии (`sessions`: refresh_token_hash, updated_at ~каждые 15 сек при активной WSS-ротации) хранятся **только в PostgreSQL**.

Почему не Redis:
- `chats.session_a_id` / `session_b_id` / `pending_messages.sender/receiver_session_id` — FK на `sessions.id`. Если sessions не в PG — FK-целостность невозможна.
- Write-нагрузка на UPDATE одной строки `sessions` каждые 15 сек на сессию — для PG это ничто на нашем масштабе.
- Принцип «одна точка правды, один способ делать вещи».

Если в далёком будущем профиль покажет, что чтение sessions становится bottleneck — добавим **cache-aside** (PG = truth, Redis = read cache, инвалидация on write). Не делаем заранее.

## Архитектура бэкенда (4 слоя)

Используется рекомендуемая архитектура из Части 1 [`BACKEND_ARCHITECTURE.md`](../nest-backend-example/BACKEND_ARCHITECTURE.md):

```
backend/src/
├── presentation/         Контроллеры, DTO, gateway, ExceptionFilter
├── application/          Use-case оркестраторы (один класс = один use-case)
├── domain/               Бизнес-логика, сервисы, порты (abstract class), entities, errors
├── persistence/          Drizzle-репозитории, schemas, migrations
├── common/               Guards, декораторы, pipes, shared DTO
├── config/               database.config, jwt.config, redis.config
└── app.module.ts
```

**Ключевые паттерны:**
- **Порты** — abstract class в `domain/ports/`, реализация в `persistence/`. NestJS DI связывает через `provide/useClass`.
- **Errors** — доменные ошибки наследуют NestJS HTTP-исключения (`NotFoundException`, `UnauthorizedException`). Глобальный `ExceptionFilter` формирует ответ.
- **DTO** — `class-validator` для входных данных в `common/dto/input/`. Выходные DTO в `common/dto/output/`.
- **Modules** — по слою: `PersistenceModule`, `DomainModule`, `ApplicationModule`, `PresentationModule`, `CommonModule`.

## Структура репозитория

```
norms/
├── application-with-frontend/  ← Angular + Capacitor + Electron (свой package.json)
│   ├── src/
│   ├── electron/
│   ├── ios/
│   ├── android/
│   └── dist/
├── backend/            ← NestJS (свой package.json)
│   ├── src/
│   ├── drizzle/        ← миграции
│   └── docker-compose.yml
├── design/
├── docs/
├── nest-backend-example/   ← справочный, удалить после миграции нужных паттернов
├── CLAUDE.md
├── PROJECT.md
└── TODO.md
```

Два независимых `package.json`, без Nx/Turbo/pnpm-workspaces. Trade-off: типы API-контрактов дублируются руками между `application-with-frontend/` и `backend/` (или копипастятся через codegen позже). Для MVP — ОК.

## Docker Compose (dev)

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: norms
      POSTGRES_USER: norms
      POSTGRES_PASSWORD: norms
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports: ["6379:6379"]

  pgadmin:
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports: ["8081:80"]
    depends_on: [postgres]
    # servers.json монтируется для автоконфига подключения к postgres

  bull-board:
    # либо отдельный сервис, либо смонтировать Express-роут внутрь бэка
    # (зависит от финального решения при реализации)

volumes:
  pg_data:
  redis_data:
```

## Env (base)

```
# App
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgres://norms:norms@localhost:5432/norms

# Redis (BullMQ, rate-limit, reset_token TTL)
REDIS_URL=redis://localhost:6379

# Auth (см. auth-devices.md)
JWT_ACCESS_TTL=15s
JWT_REFRESH_TTL=30d
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Devices
DEVICE_LIMIT=20

# Feature flags (см. invites.md)
FEATURE_FREE_REGISTRATION=false
FEATURE_DEV_MODE=false
```

Полный список env — пополняется по мере реализации.
