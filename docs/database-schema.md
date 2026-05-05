# Схема БД (канон)

Единственный источник правды по структуре PostgreSQL-таблиц. Все остальные доки в `docs/` ссылаются сюда вместо повтора DDL.

Backend-стек: см. [`backend-stack.md`](backend-stack.md). Кросс-cutting конвенции (формат ID, общие столбцы): [`database.md`](database.md).

## Содержание

1. [Глобальные принципы](#глобальные-принципы)
2. [Расширения и custom-типы](#расширения-и-custom-типы)
3. [Enums](#enums)
4. [Таблицы](#таблицы)
   - [`accounts`](#accounts)
   - [`uins`](#uins)
   - [`sessions`](#sessions)
   - [`invites`](#invites)
   - [`referrals`](#referrals)
   - [`recovery_questions`](#recovery_questions)
   - [`chats`](#chats)
   - [`pending_messages`](#pending_messages)
5. [Сводная таблица cascade-правил](#сводная-таблица-cascade-правил)
6. [Транзакционные сценарии](#транзакционные-сценарии)
7. [Миграции](#миграции)

---

## Глобальные принципы

| Аспект | Решение |
|---|---|
| Schema namespace | `public` (не разбиваем по фичам) |
| ID | `text`, формат `{uuid-v7}_{unixtime-ms-13}` (см. [`database.md`](database.md)) |
| Time | `timestamp with time zone` (`timestamptz`) везде. Хранится в UTC, выдаётся клиенту с TZ |
| Default времени | `DEFAULT now()` для `created_at` / `updated_at` |
| `updated_at` | Обновляется приложением в каждом UPDATE (или триггером — TODO решить позже) |
| Naming в TS | `camelCase` |
| Naming в БД | `snake_case` (Drizzle `casing: 'snake_case'`) |
| Бинарные данные | `bytea` |
| Регистронезависимая уникальность | `CITEXT` extension |
| Индексы на FK | **Создаём явно** на каждый FK (PG не делает это автоматически) |
| Hard delete | Везде, кроме `uins.is_premium = true` (там только отвязка) |

---

## Расширения и custom-типы

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

Drizzle-обёртка для `citext`:

```ts
import { customType } from 'drizzle-orm/pg-core';

export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext';
  },
});
```

---

## Enums

Все доменные значения с фиксированным набором — через `pgEnum`. Расширение значения = миграция (`ALTER TYPE ... ADD VALUE`).

```ts
import { pgEnum } from 'drizzle-orm/pg-core';

export const platformEnum = pgEnum('platform', ['ios', 'android', 'electron']);
export const chatStatusEnum = pgEnum('chat_status', ['pending_key', 'active']);
```

---

## Таблицы

### `accounts`

Учётная запись.

```ts
import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { citext } from './custom-types';

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  passwordHash: text('password_hash').notNull(),                    // argon2id
  username: citext('username').unique(),                            // nullable, CI-unique через CITEXT, формат `^[a-zA-Z][a-zA-Z0-9]{2,29}$`
  invitesRemaining: integer('invites_remaining').notNull().default(3),
  isAdmin: boolean('is_admin').notNull().default(false),            // защита /api/v1/admin/*
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

**Индексы:** `username` уникален автоматически через `.unique()`. CITEXT делает сравнение регистронезависимым нативно — отдельный функциональный индекс `LOWER(username)` не нужен.

**`is_admin`** — выставляется напрямую в БД (миграция или ручной UPDATE). Через API не назначается. Guard `AdminGuard` проверяет это поле для всех `/api/v1/admin/*` эндпоинтов.

**Смысл полей:** [`identity.md`](identity.md).

---

### `uins`

Числовой публичный идентификатор. 1:1 с `accounts`. Отдельная таблица — изолирует генерацию, резервирование «красивых» номеров и потенциальный обмен/продажу.

```ts
import { pgTable, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { accounts } from './accounts';

export const uins = pgTable('uins', {
  id: text('id').primaryKey(),
  accountId: text('account_id').references(() => accounts.id, { onDelete: 'no action' }), // см. ниже
  number: text('number').notNull().unique(),                        // 4–10 цифр
  isPremium: boolean('is_premium').notNull().default(false),        // «красивый» UIN — возвращается в пул при удалении аккаунта
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  accountIdUniqueIdx: uniqueIndex('uins_account_id_unique')
    .on(t.accountId)
    .where(sql`${t.accountId} IS NOT NULL`),                        // partial unique: 1 UIN на аккаунт, NULL допускается несколько раз
}));
```

**FK-стратегия:** `ON DELETE NO ACTION` — удаление аккаунта обрабатывается **в коде** в транзакции (см. [Транзакционные сценарии](#транзакционные-сценарии)). Премиум-UIN отвязывается (`SET NULL`), обычный — удаляется (`DELETE`).

**`is_premium`** — флаг устанавливается при резервировании «красивых» номеров скриптом или админом.

---

### `sessions`

Сессия = устройство. Одна таблица.

```ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';
import { platformEnum } from './enums';

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  systemName: text('system_name').notNull(),
  platform: platformEnum('platform').notNull(),
  nickname: text('nickname'),                                       // nullable
  refreshTokenHash: text('refresh_token_hash').notNull(),           // SHA-256 hex (64 символа)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  accountIdIdx: index('sessions_account_id_idx').on(t.accountId),
}));
```

**`refresh_token_hash`:** хранится **только хеш** (SHA-256). Серверу хеш достаточен для сравнения при ротации/reuse-detection. Утечка БД ≠ угон сессий. Argon2 не нужен — это не пароль, перебирать смысла нет (сам токен случайный 32+ байта).

**Лимит устройств** через env (`DEVICE_LIMIT`, default 20) — application-level check при создании сессии.

---

### `invites`

10-значные коды приглашений. Одноразовые: после использования — `DELETE`.

```ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const invites = pgTable('invites', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),         // создатель удалил → коды инвалидируются
  code: text('code').notNull().unique(),                             // 10 цифр
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  accountIdIdx: index('invites_account_id_idx').on(t.accountId),
}));
```

**`expires_at`** — `timestamptz`. **Не `bigint` unixtime** — унификация со всеми остальными временными полями.

---

### `referrals`

Кто кого пригласил. История зачисления.

```ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const referrals = pgTable('referrals', {
  id: text('id').primaryKey(),
  inviterId: text('inviter_id').references(() => accounts.id, { onDelete: 'set null' }), // создатель удалил → запись остаётся, инвайтер = NULL
  inviteeId: text('invitee_id')
    .notNull()
    .unique()                                                       // один аккаунт приглашён один раз
    .references(() => accounts.id, { onDelete: 'cascade' }),        // приглашённый удалил → запись бесполезна
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  inviterIdIdx: index('referrals_inviter_id_idx').on(t.inviterId),
}));
```

**`inviter_id` nullable + ON DELETE SET NULL** — Петя остаётся полноправным участником, даже если Вася (его инвайтер) удалил аккаунт. UI показывает «приглашён удалённым аккаунтом».

---

### `recovery_questions`

Q/A пары для восстановления пароля.

```ts
import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const recoveryQuestions = pgTable('recovery_questions', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),         // нет аккаунта → Q/A бессмысленны
  question: text('question').notNull(),                              // открытый текст
  answerHash: text('answer_hash').notNull(),                         // argon2id (соль внутри хеша)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  accountIdIdx: index('recovery_questions_account_id_idx').on(t.accountId),
}));
```

---

### `chats`

Чат = пара устройств. Подробнее: [`encryption.md`](encryption.md).

```ts
import { pgTable, text, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { sessions } from './sessions';
import { chatStatusEnum } from './enums';

export const chats = pgTable('chats', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sessionAId: text('session_a_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  sessionBId: text('session_b_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  createdBySessionId: text('created_by_session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'no action' }),       // запись всё равно умрёт через session_a/b CASCADE
  status: chatStatusEnum('status').notNull().default('pending_key'),
  publicKeyA: text('public_key_a'),                                  // X25519 public, base64 (~44 символа). NULL после обмена
  publicKeyB: text('public_key_b'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sessionAIdx: index('chats_session_a_idx').on(t.sessionAId),
  sessionBIdx: index('chats_session_b_idx').on(t.sessionBId),
  createdByIdx: index('chats_created_by_idx').on(t.createdBySessionId),

  // Уникальность названия чата в пределах пары устройств (case-insensitive)
  pairNameUnique: uniqueIndex('chats_pair_name_unique')
    .on(t.sessionAId, t.sessionBId, sql`LOWER(${t.name})`),

  // Нормализация порядка пары: всегда session_a_id < session_b_id
  pairOrderCheck: check('chats_pair_order_check', sql`${t.sessionAId} < ${t.sessionBId}`),

  // Создатель чата — одна из двух сторон
  createdByValidCheck: check('chats_created_by_valid_check',
    sql`${t.createdBySessionId} IN (${t.sessionAId}, ${t.sessionBId})`),
}));
```

**Constraint `session_a_id < session_b_id`** — гарантирует что `(A,B)` и `(B,A)` это одна и та же пара (нельзя создать дубль через перестановку). Приложение нормализует ID перед INSERT.

**Constraint `created_by_session_id IN (session_a_id, session_b_id)`** — создатель чата всегда одна из двух сторон, а не сторонняя сессия.

---

### `pending_messages`

Временное хранилище зашифрованных сообщений.

```ts
import { pgTable, text, customType, timestamp, index, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { chats } from './chats';
import { sessions } from './sessions';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const pendingMessages = pgTable('pending_messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  senderSessionId: text('sender_session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  receiverSessionId: text('receiver_session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  encryptedBlob: bytea('encrypted_blob').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  chatIdIdx: index('pending_messages_chat_id_idx').on(t.chatId),
  receiverIdx: index('pending_messages_receiver_idx').on(t.receiverSessionId),

  // Лимит 1MB на сообщение (защита от DoS через гигантские blob'ы)
  blobSizeCheck: check('pending_messages_blob_size_check',
    sql`octet_length(${t.encryptedBlob}) <= 1048576`),
}));
```

---

## Сводная таблица cascade-правил

При **удалении аккаунта** (`DELETE FROM accounts WHERE id = X`):

| Что произойдёт | Где |
|---|---|
| Сессии — каскадно удалены | `sessions` (FK CASCADE) |
| Чаты, где удалённые сессии в любой стороне — каскадно удалены | `chats` (FK CASCADE через sessions) |
| Pending-сообщения для удалённых чатов/сессий — каскадно удалены | `pending_messages` (FK CASCADE) |
| Активные инвайт-коды создателя — каскадно удалены | `invites` (FK CASCADE) |
| Q/A — каскадно удалены | `recovery_questions` (FK CASCADE) |
| `referrals.invitee_id = X` — каскадно удалены | `referrals` (FK CASCADE) |
| `referrals.inviter_id = X` — обнуляется (запись остаётся) | `referrals` (FK SET NULL) |
| Премиум-UIN — отвязывается (`account_id = NULL`) | `uins` — **в коде, в той же транзакции** |
| Обычный UIN — удаляется | `uins` — **в коде, в той же транзакции** |

При **удалении сессии** (кик):

| Что произойдёт | Где |
|---|---|
| Чаты, где сессия в любой стороне — каскадно удалены | `chats` (FK CASCADE) |
| Pending-сообщения по этой сессии (sender/receiver) — каскадно удалены | `pending_messages` (FK CASCADE) |
| Локальный SQLite собеседника — помечает чат `is_dead = true` (см. [`devices-and-chats.md`](devices-and-chats.md)) | устройство собеседника |

---

## Транзакционные сценарии

### Создание аккаунта

```ts
await db.transaction(async (tx) => {
  // 1. Если требуется инвайт — проверяем код, удаляем запись
  if (!featureFlags.freeRegistration) {
    const invite = await tx.query.invites.findFirst({ where: eq(invites.code, code) });
    if (!invite) throw new HttpException('invite_not_found', 404);
    if (invite.expiresAt < new Date()) {
      await tx.delete(invites).where(eq(invites.id, invite.id));
      throw new HttpException('invite_expired', 410);
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
  await tx.insert(accounts).values({ id: newAccountId, passwordHash, ... });

  // 4. Создаём первую сессию
  await tx.insert(sessions).values({ id: sessionId, accountId: newAccountId, ... });
});

// 5. После транзакции — ставим UIN-job в BullMQ
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

  // 3. Удалить аккаунт — CASCADE подхватывает sessions, chats, pending_messages,
  //    invites, recovery_questions, referrals (invitee_id),
  //    referrals (inviter_id) → SET NULL
  await tx.delete(accounts).where(eq(accounts.id, accountId));
});
```

После коммита — отправить WSS `session_kicked` всем активным сессиям этого аккаунта (если они онлайн), чтобы они закрыли коннект и переключились на экран авторизации.

### Создание инвайт-кода

**Атомарная операция с pessimistic lock** на строке `accounts` — иначе двойной клик при `invites_remaining = 1` создаст 2 записи и счётчик уйдёт в `-1`.

```ts
await db.transaction(async (tx) => {
  // 1. Блокируем строку аккаунта: SELECT ... FOR UPDATE
  const [account] = await tx
    .select({ invitesRemaining: accounts.invitesRemaining })
    .from(accounts)
    .where(eq(accounts.id, myAccountId))
    .for('update');

  if (!account || account.invitesRemaining <= 0) {
    throw new HttpException('no_invites_remaining', 403);
  }

  // 2. Генерируем уникальный код (retry на коллизии — внешний цикл, не показан)
  const code = generateInviteCode();

  // 3. Создаём запись
  await tx.insert(invites).values({
    id: generateId(),
    accountId: myAccountId,
    code,
    expiresAt,
  });

  // 4. Декремент
  await tx.update(accounts)
    .set({
      invitesRemaining: sql`${accounts.invitesRemaining} - 1`,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, myAccountId));
});
```

### Использование инвайт-кода (часть транзакции «Создание аккаунта»)

См. выше. Просроченный код **удаляется** при попытке использования (`expiresAt < now()`), `invites_remaining` создателя **не возвращается** — TTL истёк по его вине/решению.

### Отзыв инвайт-кода

```ts
await db.transaction(async (tx) => {
  // Удаление + проверка владельца через WHERE (если запись чужая — rowCount = 0)
  const result = await tx.delete(invites)
    .where(and(eq(invites.id, inviteId), eq(invites.accountId, myAccountId)));

  if (result.rowCount === 0) {
    throw new HttpException('invite_not_found_or_not_yours', 404);
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
const newRefreshToken = generateRandomBytes(32);
const newHash = sha256(newRefreshToken);

await db.transaction(async (tx) => {
  // Reuse detection: WHERE текущий хеш совпадает
  const result = await tx.update(sessions)
    .set({ refreshTokenHash: newHash, updatedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.refreshTokenHash, oldHash)));

  if (result.rowCount === 0) {
    // Хеш не совпал — токен подменён или уже использован
    await tx.delete(sessions).where(eq(sessions.id, sessionId));
    throw new HttpException('refresh_reused', 401);
  }
});
```

---

## Миграции

- Инструмент: **drizzle-kit**.
- Команды:
  ```bash
  npm run drizzle:generate          # генерация миграции из изменений в schema/
  npm run drizzle:migrate           # применение миграций
  ```
- **Файлы миграций** — `backend/drizzle/` (стандарт drizzle-kit).
- **Конфиг** — `backend/drizzle.config.ts` в корне `backend/`.
- **Drizzle-схемы** (TypeScript-определения таблиц, импортируемые отсюда) — `backend/src/persistence/schemas/` (4-слойная архитектура, см. [`backend-stack.md`](backend-stack.md#архитектура-бэкенда-4-слоя)).
- Каждая миграция — `.sql` файл + автогенерированный `_meta/`.
- Первая миграция должна включать `CREATE EXTENSION IF NOT EXISTS citext;` (Drizzle сгенерирует это, если CITEXT используется в схеме).
- Production: миграции запускаются ручной командой при деплое (`npm run drizzle:migrate`). Dev — есть `GET /api/v1/system/dev/migrate` (см. [`api-contracts.md`](api-contracts.md)) под флагом `dev_mode`.

---

## Связанные доки

- [`database.md`](database.md) — кросс-cutting (формат ID, общие столбцы, обзор).
- [`backend-stack.md`](backend-stack.md) — выбор стека (PostgreSQL, Drizzle, Redis, BullMQ).
- [`identity.md`](identity.md), [`auth-devices.md`](auth-devices.md), [`invites.md`](invites.md), [`recovery.md`](recovery.md), [`encryption.md`](encryption.md) — описание сущностей и бизнес-правил каждой таблицы.
- [`devices-and-chats.md`](devices-and-chats.md) — мульти-девайс UX, обработка мёртвых чатов на устройстве собеседника.
- [`local-storage.md`](local-storage.md) — локальная SQLite на устройстве.
- [`api-contracts.md`](api-contracts.md) — REST/WSS контракты, использующие эти таблицы.
