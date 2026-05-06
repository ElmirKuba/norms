-- Комментарии к таблицам и колонкам.
-- Применять вручную после db:push:
--   docker exec -i postgres_norms_dev psql -U norms -d norms < backend/docker/sql-files/comments.sql

-- ── accounts ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE accounts IS 'Аккаунты пользователей';

COMMENT ON COLUMN accounts.id                 IS 'Уникальный ID аккаунта — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN accounts.password_hash      IS 'Хеш пароля — алгоритм Argon2id';
COMMENT ON COLUMN accounts.username           IS 'Опциональный юзернейм (без учёта регистра, CITEXT). Выдаётся только администратором';
COMMENT ON COLUMN accounts.invites_remaining  IS 'Оставшееся количество инвайт-кодов, которые может сгенерировать аккаунт';
COMMENT ON COLUMN accounts.is_admin           IS 'Флаг администратора — устанавливается только напрямую в БД, без API';
COMMENT ON COLUMN accounts.created_at         IS 'Дата и время создания аккаунта';
COMMENT ON COLUMN accounts.updated_at         IS 'Дата и время последнего обновления';

-- ── uins ─────────────────────────────────────────────────────────────────────

COMMENT ON TABLE uins IS 'Числовые идентификаторы пользователей (UIN)';

COMMENT ON COLUMN uins.id          IS 'Уникальный ID записи UIN — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN uins.account_id  IS 'FK → accounts.id. ON DELETE NO ACTION — логика переназначения на уровне приложения';
COMMENT ON COLUMN uins.number      IS 'Числовой UIN от 4 до 10 цифр, хранится как text, глобально уникален';
COMMENT ON COLUMN uins.is_premium  IS 'Флаг премиального UIN — красивые или зарезервированные номера, возвращаются в пул при удалении аккаунта';
COMMENT ON COLUMN uins.created_at  IS 'Дата и время назначения UIN аккаунту';
COMMENT ON COLUMN uins.updated_at  IS 'Дата и время последнего обновления';

-- ── sessions ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE sessions IS 'Сессии пользователей (одна сессия = одно устройство)';

COMMENT ON COLUMN sessions.id                  IS 'Уникальный ID сессии — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN sessions.account_id          IS 'FK → accounts.id. CASCADE при удалении аккаунта';
COMMENT ON COLUMN sessions.system_name         IS 'Системное имя устройства (например «iPhone 14 Pro»)';
COMMENT ON COLUMN sessions.platform            IS 'Платформа устройства: ios, android, electron';
COMMENT ON COLUMN sessions.nickname            IS 'Опциональное прозвище устройства, видимое другим пользователям';
COMMENT ON COLUMN sessions.refresh_token_hash  IS 'SHA-256 hex хеш refresh-токена (64 символа)';
COMMENT ON COLUMN sessions.created_at          IS 'Дата и время создания сессии';
COMMENT ON COLUMN sessions.updated_at          IS 'Дата и время последней активности';

-- ── invites ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE invites IS 'Инвайт-коды для регистрации';

COMMENT ON COLUMN invites.id          IS 'Уникальный ID инвайта — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN invites.account_id  IS 'FK → accounts.id. CASCADE при удалении аккаунта-создателя';
COMMENT ON COLUMN invites.code        IS '10-значный уникальный код приглашения';
COMMENT ON COLUMN invites.expires_at  IS 'Срок действия кода';
COMMENT ON COLUMN invites.created_at  IS 'Дата и время создания инвайта';

-- ── referrals ────────────────────────────────────────────────────────────────

COMMENT ON TABLE referrals IS 'История реферальных связей (кто кого пригласил)';

COMMENT ON COLUMN referrals.id          IS 'Уникальный ID записи — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN referrals.inviter_id  IS 'FK → accounts.id. SET NULL при удалении инвайтера — запись реферала сохраняется';
COMMENT ON COLUMN referrals.invitee_id  IS 'FK → accounts.id. CASCADE при удалении приглашённого';
COMMENT ON COLUMN referrals.created_at  IS 'Дата и время создания записи реферала';

-- ── recovery_questions ───────────────────────────────────────────────────────

COMMENT ON TABLE recovery_questions IS 'Секретные вопросы и ответы для восстановления пароля';

COMMENT ON COLUMN recovery_questions.id           IS 'Уникальный ID вопроса — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN recovery_questions.account_id   IS 'FK → accounts.id. CASCADE при удалении аккаунта';
COMMENT ON COLUMN recovery_questions.question     IS 'Текст вопроса (открытый, пресет или пользовательский)';
COMMENT ON COLUMN recovery_questions.answer_hash  IS 'Хеш ответа — алгоритм Argon2id (соль внутри хеша)';
COMMENT ON COLUMN recovery_questions.created_at   IS 'Дата и время создания вопроса';
COMMENT ON COLUMN recovery_questions.updated_at   IS 'Дата и время последнего обновления';
