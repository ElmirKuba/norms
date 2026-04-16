# Project: Нормисы

## What is this?
Кросс-платформенный E2E-шифрованный мессенджер. Одна Angular-кодовая база собирается под три платформы:
- **Мобилка** — iOS + Android через Capacitor
- **Десктоп** — Windows / macOS / Linux через Electron
- **Браузер** — лендинг + заглушка со ссылками на скачивание. Никакой функциональности приложения (регистрация, логин, мессенджер, настройки) в вебе нет — всё только в нативной приле.

## Goal
_To be defined._

## Target Audience
_To be defined._

## Philosophy
_To be defined._

## Non-Goals
- **Веб-версия мессенджера** — в браузере только лендинг + заглушка.
- **Регистрация и логин в вебе** — аккаунт создаётся и используется только в нативной приле.
- **Блог в основной приле** — выделен в отдельный проект ("потом-потом").

## Non-Goals (MVP)
- **Медиа в чатах** — только текстовые сообщения. Без файлов, фото, видео, голосовых, стикеров.
- **`FilePickerService` / `CameraService`** — не реализуются до завершения базового текстового обмена.

## Repository Structure
Один `package.json` в корне. Без монорепо. Один `ng build` → три платформы.

```
project-root/
├── package.json
├── angular.json
├── capacitor.config.ts
├── src/                  ← Angular код (универсальный)
├── dist/                 ← билд (общий для всех платформ)
├── electron/
│   └── main.js           ← Electron entry
├── ios/                  ← генерируется Capacitor
├── android/              ← генерируется Capacitor
├── docs/                 ← проектная документация
├── design/               ← .pen файлы
└── nest-backend-example/ ← справочный бэкенд
```

## Tech Stack
См. [CLAUDE.md](CLAUDE.md) → Tech Stack.
