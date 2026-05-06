import { pgEnum } from 'drizzle-orm/pg-core';

/** Платформа устройства пользователя. */
export const platformEnum = pgEnum('platform', ['ios', 'android', 'electron']);

/** Статус чата: ожидание ключей или активный. */
export const chatStatusEnum = pgEnum('chat_status', ['pending_key', 'active']);
