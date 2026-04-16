# Backend stack

Серверная часть «Нормисов». Решение по стеку — зафиксировано. Конкретные API-контракты — в [`api-contracts.md`](api-contracts.md) (TODO).

## Стек

| Слой | Выбор | Заметки |
|---|---|---|
| Фреймворк | **NestJS** | TypeScript, модульная архитектура, DI, decorator-based. Есть рабочий референс: [`nest-backend-example/`](../nest-backend-example/) |
| БД | **PostgreSQL 16** | LISTEN/NOTIFY, JSONB, `pg_trgm` для поиска по `username`, партиционирование `pending_messages` на будущее |
| ORM | **Drizzle** (`drizzle-orm/postgres-js` + `drizzle-kit`) | Лёгкий, миграции в TS, без магии |
| Очередь задач | **BullMQ + Redis** | Генерация UIN, возможные будущие job'ы (cleanup просроченных blob'ов, push-sender) |
| Кеш / сессии | **Redis** (опционально, через env) | См. «SessionStore» ниже |
| Транспорт | HTTPS (REST) + WSS (реалтайм) | См. [`server.md`](server.md) |

### Почему не MySQL
- LISTEN/NOTIFY — встроенный pub/sub. Нужен для сигналов «UIN готов», «кик устройства», «новое сообщение для сессии» без Redis pub/sub.
- JSONB с индексами — feature flags, metadata сессий, push-debug.
- `pg_trgm` — like-поиск по `username` без отдельного индекса.

### Почему не TypeORM
`nest-backend-example` использует Drizzle — берём оттуда. Type-safety на уровне схемы, миграции через `drizzle-kit`, без скрытого SQL.

## SessionStore — абстракция

Сессии (`sessions`: refresh_token, updated_at ~каждые 15 сек) хранятся через абстракцию. Одна реализация активна в рантайме, выбирается через env.

```typescript
// backend/src/modules/sessions/session-store.abstract.ts
export abstract class SessionStore {
  abstract get(id: string): Promise<Session | null>;
  abstract set(session: Session): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract findByRefreshToken(token: string): Promise<Session | null>;
  abstract listByAccount(accountId: string): Promise<Session[]>;
}

// Две реализации:
//   PostgresSessionStore — таблица sessions (см. auth-devices.md)
//   RedisSessionStore    — key `session:{id}`, TTL = refresh_ttl
```

Выбор:
```
SESSION_STORE=postgres  # dev, дебаг через pgweb
SESSION_STORE=redis     # prod, частые обновления
```

**Без dual-write.** Единая точка правды. Если когда-нибудь понадобится cache-aside (PG truth + Redis cache) — добавим третью реализацию `HybridSessionStore`.

## Структура репозитория

```
norms/
├── application/        ← Angular + Capacitor + Electron (свой package.json)
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

Два независимых `package.json`, без Nx/Turbo/pnpm-workspaces. Trade-off: типы API-контрактов дублируются руками между `application/` и `backend/` (или копипастятся через codegen позже). Для MVP — ОК.

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

  pgweb:
    image: sosedoff/pgweb
    environment:
      DATABASE_URL: postgres://norms:norms@postgres:5432/norms?sslmode=disable
    ports: ["8081:8081"]
    depends_on: [postgres]

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

# Redis (BullMQ + optional SessionStore)
REDIS_URL=redis://localhost:6379

# Sessions
SESSION_STORE=postgres  # postgres | redis

# Auth (см. auth-devices.md)
JWT_ACCESS_TTL=15m
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
