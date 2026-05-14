# LEARNS — Курс по созданию Normisy с нуля

## Идея

После полного завершения проекта здесь появится полный образовательный курс:
как построить production-ready E2E мессенджер с нуля — от пустой папки до рабочего приложения
на iOS, Android, macOS, Windows и Linux.

Курс ориентирован на людей с базовыми знаниями программирования.
Каждый урок объясняет **почему** принималось то или иное решение,
а не просто «скопируй этот код».

## Структура (планируется)

```
LEARNS/
  season-1-bootstrap/        — Monorepo, Angular + Capacitor + Electron + NestJS
  season-2-typescript-lint/  — TypeScript strict, ESLint strict-type-checked, соглашения
  season-3-backend/          — NestJS 4-layer, Drizzle ORM, PostgreSQL, Redis
  season-4-auth/             — JWT, refresh rotation, reuse detection, WSS-авторизация
  season-5-sqlite/           — Локальная БД: better-sqlite3 (Electron) + Capacitor SQLite
  season-6-e2e-basics/       — ECDH X25519, HKDF-SHA256, AES-256-GCM, Web Crypto API
  season-7-double-ratchet/   — Double Ratchet: Forward Secrecy + Break-in Recovery
  season-8-wss/              — WebSocket gateway, heartbeat, ротация токенов без реконнекта
  season-9-safety-numbers/   — Верификация ключей, SHA-256 fingerprint, QR-скан
  ...
```

## Формат каждого урока (серии)

1. **Зачем** — мотивация, что будет сломано без этого
2. **Теория** — концепты и термины простыми словами
3. **Реализация** — пошагово с объяснением каждого решения
4. **Ловушки** — что пошло не так при реальной разработке этого проекта
5. **Итог** — что получили, связь со следующим уроком

## Статус

Курс будет создан после завершения всех фаз проекта (9.31–9.35 и далее).
