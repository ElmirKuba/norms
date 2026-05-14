# Схема БД (канон)

Единственный источник правды по структуре PostgreSQL-таблиц. Все остальные доки в `docs/` ссылаются сюда вместо повтора DDL.

Backend-стек: см. [`backend-stack.md`](backend-stack.md). Кросс-cutting конвенции (формат ID, общие столбцы): [`database.md`](database.md).

## Содержание

1. [Глобальные принципы](#глобальные-принципы)
2. [Расширения и custom-типы](#расширения-и-custom-типы)
3. [Enums](#enums)
4. [Конвенция devtime-контроля схем](#конвенция-devtime-контроля-схем)
5. [Таблицы](#таблицы)
   - [`accounts`](#accounts)
   - [`uins`](#uins)
   - [`sessions`](#sessions)
   - [`invites`](#invites)
   - [`referrals`](#referrals)
   - [`recovery_questions`](#recovery_questions)
   - [`chats`](#chats)
   - [`pending_messages`](#pending_messages)
6. [Сводная таблица cascade-правил](#сводная-таблица-cascade-правил)
7. [Транзакционные сценарии](#транзакционные-сценарии)
8. [Миграции](#миграции)

---

## Глобальные принципы

| Аспект | Решение |
|---|---|
| Schema namespace | `public` |
| ID | `text`, формат `{uuid-v7}_{unixtime-ms-13}` (см. [`database.md`](database.md)) |
| Time | `timestamptz` везде. Хранится в UTC. |
| Default времени | `DEFAULT now()` для `created_at` / `updated_at` |
| `updated_at` | Обновляется приложением в каждом UPDATE (`.set({ ..., updatedAt: new Date() })`) |
| Naming в TS | `camelCase` |
| Naming в БД | `snake_case` (явные имена в `text('column_name')` — Drizzle не делает авто-конвертацию) |
| Бинарные данные | `bytea` (через custom-type, см. ниже) |
| Регистронезависимая уникальность | `citext` extension |
| Индексы на FK | Создаются явно для часто запрашиваемых FK |
| Hard delete | Везде, кроме `uins.is_premium = true` (там — отвязка) |

---

## Расширения и custom-типы

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

Применяется автоматически при первом старте postgres-контейнера через `backend/docker/sql-files/init.sql`.

Drizzle custom-types — `backend/src/persistence/schemas/custom-types.ts`:

```ts
import { customType } from 'drizzle-orm/pg-core';

/** Регистронезависимый строковый тип PostgreSQL. */
export const citext = customType<{ data: string }>({
  dataType: (): string => 'citext',
});

/** Бинарный тип для encrypted blob'ов. */
export const bytea = customType<{ data: Buffer }>({
  dataType: (): string => 'bytea',
});
```

`bytea` уже определён, но фактически используется будет в шаге 9 (см. [Будущие таблицы](#будущие-таблицы)).

---

## Enums

`backend/src/persistence/schemas/enums.ts`:

```ts
import { pgEnum } from 'drizzle-orm/pg-core';

/** Платформа устройства. */
export const platformEnum = pgEnum('platform', ['ios', 'android', 'electron']);

/** Статус чата (используется будущей таблицей chats — шаг 9). */
export const chatStatusEnum = pgEnum('chat_status', ['pending_key', 'active']);
```

`chatStatusEnum` объявлен, но `chats` пока не существует.

---

## Конвенция devtime-контроля схем

Каждая таблица имеет TS-интерфейс строки с `unknown`-полями + `satisfies SchemaColumnMap<T>`. Компилятор заставляет перечислить каждую колонку (см. [`backend-stack.md`](backend-stack.md#соглашение-по-схемам-drizzle-persistenceschemas)):

```ts
interface IAccountRow {
  /** PK — {uuid-v7}_{unix-ms}. */
  readonly id: unknown;
  readonly passwordHash: unknown;
  // … каждая колонка обязана быть здесь
}

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  // …
} satisfies SchemaColumnMap<IAccountRow>);
```

Index-фабрика — массив, не объект (Drizzle ≥ 0.34 API):

```ts
export const sessions = pgTable('sessions', {
  // … колонки
} satisfies SchemaColumnMap<ISessionRow>, (t) => [
  index('sessions_account_id_idx').on(t.accountId),
]);
```

---

## Таблицы

### `accounts`

Учётная запись.

```ts
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),                    // argon2id
  username: citext('username').unique(),                            // nullable, CI-unique, формат ^[a-zA-Z][a-zA-Z0-9]{2,29}$
  nickname: text('nickname'),                                        // nullable, произвольный текст
  invitesRemaining: integer('invites_remaining').notNull().default(3),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IAccountRow>);
```

**`username`** — уникален автоматически через `.unique()`. CITEXT делает сравнение регистронезависимым нативно.

**`nickname`** — отображаемый псевдоним (display name). В отличие от `username` (буквенный логин), может содержать пробелы, кириллицу, что угодно. Не используется для логина и поиска. Приоритет отображения: `nickname > username > UIN`.

**`is_admin`** — устанавливается напрямую в БД. Через API не назначается. Подразумевается `AdminGuard` для `/api/v1/admin/*` эндпоинтов (сами эндпоинты ещё не реализованы).

**Смысл полей:** [`identity.md`](identity.md).

---

### `uins`

Числовой публичный идентификатор. 1:1 с `accounts`, отдельная таблица — изолирует генерацию и резервирование «красивых» номеров.

```ts
export const uins = pgTable('uins', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references((): AnyPgColumn => accounts.id, { onDelete: 'no action' }),
  number: text('number').notNull().unique(),                        // 4–10 цифр
  isPremium: boolean('is_premium').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IUinRow>, (t) => [
  uniqueIndex('uins_account_id_unique')
    .on(t.accountId)
    .where(sql`${t.accountId} IS NOT NULL`),
]);
```

**FK `ON DELETE NO ACTION`** — удаление аккаунта обрабатывается в коде в транзакции. Премиум-UIN отвязывается (`SET NULL`), обычный — удаляется (`DELETE`).

**Partial unique index** — 1 UIN на аккаунт, при `account_id IS NULL` ограничение не действует (премиум-UIN в пуле может быть много).

---

### `sessions`

Сессия = устройство.

```ts
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  systemName: text('system_name').notNull(),
  platform: platformEnum('platform').notNull(),
  nickname: text('nickname'),                                       // nullable, прозвище устройства
  refreshTokenHash: text('refresh_token_hash').notNull(),           // SHA-256 hex (64 символа)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<ISessionRow>, (t) => [
  index('sessions_account_id_idx').on(t.accountId),
]);
```

**`refresh_token_hash`** — хранится только SHA-256. Plain-токен живёт у клиента. См. [`auth-devices.md`](auth-devices.md#токены).

**Лимит устройств** — `DEVICE_LIMIT` env (default 20), application-level check.

---

### `invites`

10-значные коды приглашений. Одноразовые: после использования — `DELETE` в той же транзакции.

```ts
export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  code: text('code').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IInviteRow>, (t) => [
  index('invites_account_id_idx').on(t.accountId),
]);
```

`expires_at` — `timestamptz`, не `bigint`. TTL по умолчанию = `INVITE_TTL_DAYS` env (default 7 дней).

---

### `referrals`

История «кто кого пригласил».

```ts
export const referrals = pgTable('referrals', {
  id: text('id').primaryKey(),
  inviterId: text('inviter_id')
    .references((): AnyPgColumn => accounts.id, { onDelete: 'set null' }),
  inviteeId: text('invitee_id')
    .notNull()
    .unique()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IReferralRow>, (t) => [
  index('referrals_inviter_id_idx').on(t.inviterId),
]);
```

**`inviter_id` nullable + SET NULL** — приглашённый остаётся в системе, даже если инвайтер удалил аккаунт. UI показывает «приглашён удалённым аккаунтом».

**`invitee_id` unique** — один аккаунт приглашён один раз.

---

### `recovery_questions`

Q/A пары для восстановления пароля.

```ts
export const recoveryQuestions = pgTable('recovery_questions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references((): AnyPgColumn => accounts.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),                              // открытый текст
  answerHash: text('answer_hash').notNull(),                         // argon2id (соль внутри)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IRecoveryQuestionRow>, (t) => [
  index('recovery_questions_account_id_idx').on(t.accountId),
]);
```

Ответ перед хешированием нормализуется: `trim → lowercase → collapse spaces → NFC`. См. [`recovery.md`](recovery.md).

---

### `chats`

Чат между двумя конкретными устройствами. Технически device-to-device, UI показывает аккаунт.

```ts
export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  name: citext('name').notNull(),                                      // citext — CI-уникальность, не шифруется
  sessionAId: text('session_a_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  sessionBId: text('session_b_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  createdBySessionId: text('created_by_session_id')
    .references((): AnyPgColumn => sessions.id, { onDelete: 'set null' }),
  status: chatStatusEnum('status').notNull().default('pending_key'),
  publicKeyA: text('public_key_a'),                                    // X25519 pubkey session_a (base64), NULL после обмена
  publicKeyB: text('public_key_b'),                                    // X25519 pubkey session_b (base64), NULL после обмена
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IChatRow>, (t) => [
  check('chats_session_order_check', sql`${t.sessionAId} < ${t.sessionBId}`),
  uniqueIndex('chats_pair_name_unique').on(t.sessionAId, t.sessionBId, t.name),
  index('chats_session_a_id_idx').on(t.sessionAId),
  index('chats_session_b_id_idx').on(t.sessionBId),
]);
```

**`session_a_id` / `session_b_id`** — всегда нормализованы: `session_a_id < session_b_id` (CHECK constraint). Гарантирует, что пара `(A,B)` и `(B,A)` хранится одинаково. INSERT обязан упорядочить ID перед записью.

**`name` — `citext`** — название чата хранится в case-insensitive типе. Unique index `chats_pair_name_unique` автоматически регистронезависим.

**`created_by_session_id` — `SET NULL`** — историческая информация. Если создатель кикнут, чат к тому моменту уже удалён каскадом через `session_a_id` / `session_b_id`.

**`public_key_a` / `public_key_b`** — X25519 публичные ключи (base64), используются только в процессе обмена ключами. После завершения (`status → active`) обнуляются сервером. Подробнее: [`encryption.md`](encryption.md).

**Бизнес-правила:** между одной парой устройств может быть несколько чатов с разными именами. Чаты не синхронизируются между устройствами одного аккаунта. Подробнее: [`devices-and-chats.md`](devices-and-chats.md).

---

### `pending_messages`

Временное серверное хранилище недоставленных зашифрованных сообщений.

```ts
export const pendingMessages = pgTable('pending_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references((): AnyPgColumn => chats.id, { onDelete: 'cascade' }),
  senderSessionId: text('sender_session_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  receiverSessionId: text('receiver_session_id')
    .notNull()
    .references((): AnyPgColumn => sessions.id, { onDelete: 'cascade' }),
  encryptedBlob: bytea('encrypted_blob').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
} satisfies SchemaColumnMap<IPendingMessageRow>, (t) => [
  check('pending_messages_blob_size_check', sql`octet_length(${t.encryptedBlob}) <= 1048576`),
  index('pending_messages_receiver_session_id_idx').on(t.receiverSessionId),
  index('pending_messages_chat_id_idx').on(t.chatId),
]);
```

**`encrypted_blob`** — формат `[iv: 12b][ciphertext][auth_tag: 16b]`. Лимит 1MB через CHECK constraint.

**Жизненный цикл:** сервер хранит blob до тех пор, пока получатель не выйдет онлайн и не подтвердит доставку. После подтверждения — `DELETE`. Если сессия кикнута — `pending_messages` удаляются каскадом (расшифровать их на новом устройстве всё равно невозможно).

**Индекс по `receiver_session_id`** — для быстрой выборки всех недоставленных при подключении устройства.

---

## Сводная таблица cascade-правил

При **удалении аккаунта** (`DELETE FROM accounts WHERE id = X`):

| Что произойдёт | Где |
|---|---|
| Сессии — каскадно удалены | `sessions` (FK CASCADE) |
| Активные инвайты — каскадно удалены | `invites` (FK CASCADE) |
| Q/A пары — каскадно удалены | `recovery_questions` (FK CASCADE) |
| `referrals.invitee_id = X` — каскадно удалены | `referrals` (FK CASCADE) |
| `referrals.inviter_id = X` — `SET NULL` | `referrals` (FK SET NULL) |
| Премиум-UIN — отвязывается (`account_id = NULL`) | `uins` — **в коде, в транзакции** |
| Обычный UIN — удаляется | `uins` — **в коде, в транзакции** |

При **удалении сессии** (кик):

| Что произойдёт | Где |
|---|---|
| Чаты, где сессия — `session_a_id` или `session_b_id` | `chats` (FK CASCADE) |
| Все `pending_messages` удалённых чатов | `pending_messages` (FK CASCADE via chats) |
| Все `pending_messages`, где сессия — отправитель | `pending_messages` (FK CASCADE via sender_session_id) |
| Все `pending_messages`, где сессия — получатель | `pending_messages` (FK CASCADE via receiver_session_id) |

После удаления — WSS `session_kicked` всем удалённым сессиям, если онлайн.

---

## Транзакционные сценарии

### Создание аккаунта

```ts
await db.transaction(async (tx) => {
  // 1. Если требуется инвайт — проверяем код, удаляем запись
  if (!featureFlags.freeRegistration) {
    const invite = await tx.query.invites.findFirst({ where: eq(invites.code, code) });
    if (!invite) throw new NotFoundException(makeError(ErrorCode.INVITE_NOT_FOUND));
    if (invite.expiresAt < new Date()) {
      await tx.delete(invites).where(eq(invites.id, invite.id));
      throw new HttpException(makeError(ErrorCode.INVITE_EXPIRED), 410);
    }
    await tx.delete(invites).where(eq(invites.id, invite.id));

    // 2. Записываем referrals
    await tx.insert(referrals).values({
      id: generateId(),
      inviterId: invite.accountId,
      inviteeId: newAccountId,
    });
  }

  // 3. Создаём аккаунт
  await tx.insert(accounts).values({ id: newAccountId, passwordHash, /* … */ });

  // 4. Создаём первую сессию
  await tx.insert(sessions).values({ id: sessionId, accountId: newAccountId, /* … */ });
});

// 5. После коммита — UIN-job в BullMQ
await uinQueue.add('generate', { accountId: newAccountId });
```

### Удаление аккаунта

```ts
await db.transaction(async (tx) => {
  // 1. Премиум UIN → возврат в пул
  await tx.update(uins)
    .set({ accountId: null, updatedAt: new Date() })
    .where(and(eq(uins.accountId, accountId), eq(uins.isPremium, true)));

  // 2. Обычный UIN → удалить
  await tx.delete(uins)
    .where(and(eq(uins.accountId, accountId), eq(uins.isPremium, false)));

  // 3. Удалить аккаунт — CASCADE подхватывает остальное
  await tx.delete(accounts).where(eq(accounts.id, accountId));
});
```

Перед удалением use-case рассылает WSS `session_kicked` всем активным сессиям аккаунта.

### Создание инвайт-кода

Атомарный декремент `invites_remaining` через условный `UPDATE ... WHERE invites_remaining > 0 RETURNING`. Если возврата нет → `403 no_invites_remaining`. Затем `INSERT` в `invites`.

### Отзыв инвайт-кода

```ts
await db.transaction(async (tx) => {
  const deleted = await tx.delete(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.accountId, myAccountId)))
    .returning({ id: invites.id });

  if (deleted.length === 0) {
    throw new NotFoundException(makeError(ErrorCode.INVITE_NOT_FOUND));
  }

  await tx.update(accounts)
    .set({
      invitesRemaining: sql`${accounts.invitesRemaining} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, myAccountId));
});
```

### Ротация refresh-токена

```ts
const oldHash = sha256Hex(rawRefreshToken);
const { raw: newRaw, hash: newHash } = generateRefreshToken();

const rows = await db.update(sessions)
  .set({ refreshTokenHash: newHash, updatedAt: new Date() })
  .where(eq(sessions.refreshTokenHash, oldHash))
  .returning();

if (rows.length === 0) {
  // Хеш не совпал — токен уже использован или подменён
  throw new UnauthorizedException(makeError(ErrorCode.REFRESH_REUSED));
}
```

Сама сессия при `refresh_reused` сейчас **не удаляется** — атакующий получает 401, легитимный пользователь продолжает работать с новой парой токенов. См. [`auth-devices.md`](auth-devices.md#ротация-токенов).

---

## Миграции

Используется `drizzle-kit push` — изменения схемы применяются напрямую из TS в БД, без файлов миграций. Папки `backend/drizzle/` нет.

```bash
npm run db:push       # синхронизировать схему БД с TS
npm run db:comments   # применить COMMENT ON TABLE/COLUMN из docker/sql-files/comments.sql
npm run db:setup      # = db:push + db:comments
npm run db:studio     # Drizzle Studio (UI для просмотра данных)
```

Команды `db:generate` / `db:migrate` доступны (стандартные скрипты drizzle-kit), но MVP их не использует.

`docker/sql-files/init.sql` (CITEXT extension) — выполняется автоматически через `docker-entrypoint-initdb.d` при первом старте postgres-контейнера.

Конфиг — `backend/drizzle.config.ts`. Схемы — `backend/src/persistence/schemas/*.schema.ts`.

---

## Связанные доки

- [`database.md`](database.md) — кросс-cutting (формат ID, общие столбцы).
- [`backend-stack.md`](backend-stack.md) — стек, миграции, схемы Drizzle.
- [`identity.md`](identity.md), [`auth-devices.md`](auth-devices.md), [`invites.md`](invites.md), [`recovery.md`](recovery.md) — бизнес-правила сущностей.
- [`api-contracts.md`](api-contracts.md) — REST/WSS контракты.
