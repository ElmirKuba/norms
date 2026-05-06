-- Комментарии к таблицам и колонкам.
-- Применяются автоматически при первом запуске контейнера postgres.
-- При изменении схемы — перезапустить с пересозданием тома (docker:down + rm -rf docker/volumes/pg_data + docker:up).

-- ── accounts ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE accounts IS 'Аккаунты пользователей';

COMMENT ON COLUMN accounts.id               IS 'Уникальный ID аккаунта — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN accounts.username         IS 'Опциональный юзернейм (без учёта регистра, CITEXT в продакшне). Выдаётся только администратором';
COMMENT ON COLUMN accounts.password_hash    IS 'Хеш пароля — алгоритм Argon2id';
COMMENT ON COLUMN accounts.invites_remaining IS 'Оставшееся количество инвайт-кодов, которые может сгенерировать аккаунт';
COMMENT ON COLUMN accounts.is_admin         IS 'Флаг администратора — устанавливается только напрямую в БД, без API';
COMMENT ON COLUMN accounts.created_at       IS 'Дата и время создания аккаунта';
COMMENT ON COLUMN accounts.updated_at       IS 'Дата и время последнего обновления — обновляется при каждой ротации токена (~каждые 15 с при активном WSS)';

-- ── uins ─────────────────────────────────────────────────────────────────────

COMMENT ON TABLE uins IS 'Числовые идентификаторы пользователей (UIN)';

COMMENT ON COLUMN uins.id         IS 'Уникальный ID записи UIN — формат {uuid-v7}_{unix-ms}';
COMMENT ON COLUMN uins.account_id IS 'FK → accounts.id. ON DELETE NO ACTION — логика переназначения на уровне приложения';
COMMENT ON COLUMN uins.number     IS 'Числовой UIN от 4 до 10 цифр, глобально уникален';
COMMENT ON COLUMN uins.is_premium IS 'Флаг премиального UIN — красивые или зарезервированные номера, выданные администратором заранее';
COMMENT ON COLUMN uins.ts         IS 'Дата и время назначения UIN аккаунту';
