# База данных

Документ описывает кросс-cutting конвенции БД, общие для бэкенда (PostgreSQL 16 + Drizzle, см. [`backend-stack.md`](backend-stack.md)) и для локальной SQLite на устройствах (см. [`local-storage.md`](local-storage.md)).

> **Полное DDL всех таблиц, индексы, cascade-правила, транзакционные сценарии — в [`database-schema.md`](database-schema.md).** Этот файл — только базовые конвенции и навигация.

## Универсальный формат ID

Все таблицы в любой БД используют один формат primary key:

```
{uuid-v7}_{unixtime-ms-13}
```

Пример: `01927a3f-7c8e-7b5a-b8c3-9d4e5f6a7b8c_1729012345678`

- **UUID v7** — time-ordered UUID, начало содержит ms timestamp создания. Лексикографически сортируется по времени, помогает индексам и пагинации.
- **`_`** — разделитель.
- **13 символов unixtime в миллисекундах** — дублирует время создания строкой. Удобно для дебага, ручных запросов и быстрых time-based фильтров без парсинга UUID.

**Почему оба:** UUID v7 даёт глобальную уникальность и lex-сортировку, явный timestamp — читабельность и простые запросы по времени без библиотеки UUID. Безопасность: суффикс с unixtime ms делает ID непредсказуемым в смысле «угадать соседний ID» сложнее, чем у monotonic-секвенций.

**Тип в PG:** `text` (формат не вписывается в нативный `uuid`). Утилита `generateId()` собирает строку.

## Стандартные столбцы

В каждой таблице, где имеет смысл, присутствуют:

| Столбец | Тип | Назначение |
|---|---|---|
| `id` | `text` PK | Универсальный ID (см. выше) |
| `created_at` | `timestamptz` | Когда строка создана. `DEFAULT now()` |
| `updated_at` | `timestamptz` | Последнее изменение. Обновляется приложением |

`created_at` дублирует timestamp из `id`, но удобен для индексов и read-моделей без парсинга строки.

## Базовые типы PostgreSQL

| Назначение | Тип |
|---|---|
| Идентификаторы (PK, FK), хеши, открытый текст | `text` |
| Время | `timestamp with time zone` (`timestamptz`), хранится в UTC |
| Числовые счётчики (`invites_remaining` и т.п.) | `integer` |
| Boolean-флаги | `boolean` |
| Регистронезависимая уникальность (`username`) | `citext` (требует `CREATE EXTENSION citext`) |
| Бинарные данные (зашифрованные blob'ы) | `bytea` |
| Доменные значения с фиксированным набором (`platform`, `chats.status`) | `pgEnum` |

## Schema namespace

Все таблицы — в schema `public`. По фичам не разбиваем (для нашего объёма излишне).

## Индексы

PostgreSQL **не создаёт автоматически** индексы на FK-колонках. Каждый FK без unique-констрейнта требует явного `CREATE INDEX`. Конкретные индексы — в [`database-schema.md`](database-schema.md).

## Схемы по фичам

Серверные таблицы:
- [`identity.md`](identity.md) — `accounts`, `uins`
- [`invites.md`](invites.md) — `invites`, `referrals`
- [`auth-devices.md`](auth-devices.md) — `sessions`
- [`recovery.md`](recovery.md) — `recovery_questions`
- [`encryption.md`](encryption.md) — `chats`, `pending_messages`

Локальная SQLite на устройствах: [`local-storage.md`](local-storage.md).
