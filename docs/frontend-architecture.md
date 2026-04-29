# Frontend Architecture

Приложение: `application-with-frontend/` — Angular + Capacitor + Electron.  
Один `ng build` → три платформы. Один Angular SPA, навигация через Angular Router.

---

## Платформы и роутинг

- **Capacitor** (iOS, Android) и **Electron** (Windows, macOS, Linux) — webview/Chromium без адресной строки, грузят `dist/` через `file://`.
- Из-за `file://` нужен `HashLocationStrategy` (`/#/path`) — HTML5 history API там не работает. **TODO:** добавить `withHashLocation()` в `provideRouter(...)` в `app.config.ts` перед началом работы с Capacitor/Electron.
- Браузер грузит тот же Angular, но видит только веб-заглушку (`/web/*`) — никакого мессенджера, регистрации или настроек.

### Корневой роутинг и разделение web / application

`app.routes.ts` объявляет два lazy-loaded модуля маршрутов:
- `/web/*` — публичная веб-заглушка (лендинг, about, security)
- `/application/*` — мессенджер (только для нативных платформ)

**Разделение по платформе (TODO):**
Сейчас обе секции доступны с любой платформы. При реализации application-части нужен **guard**, который:
- В браузере (`PlatformDetectorService.isWeb`) — разрешает только `/web/*`, при попытке зайти в `/application/*` — redirect на `/web/welcome`.
- В Capacitor/Electron — разрешает только `/application/*`, при попытке зайти в `/web/*` — redirect на `/application/main`.

**Корневой redirect:** `app.routes.ts` содержит `path: '**', redirectTo: ''`. При реализации guard'а заменить на платформо-зависимый redirect (в guard или через `APP_INITIALIZER`).

---

## Структура `src/app/`

```
src/app/
  app.routes.ts          — корневые маршруты, делегирует в web/ и application/
  app.config.ts          — provideRouter, DI платформенных сервисов
  core/
    components/root/     — RootComponent (точка входа)
    services/
      platform/          — PlatformDetectorService (определяет ОС/платформу)
      storage/           — StorageService (abstract) + фабрика реализаций
  features/
    web/                 — публичная веб-заглушка (лендинг)
    application/         — само приложение (мессенджер)
  shared/
    components/          — переиспользуемые UI-компоненты
    services/            — переиспользуемые сервисы
    types/               — общие типы
```

---

## Структура фичи

Каждая фича — папка внутри `features/web/` или `features/application/`.  
Шаблон одинаковый для обеих секций:

```
{feature}/
  components/
    {component-name}/
      {component-name}.component.ts
      {component-name}.component.html
      {component-name}.component.scss
    .git-keep              — если папка пуста или содержит только подпапки без файлов
  services/
    {service-name}.service.ts
    .git-keep              — если пусто
  types/
    {feature}.types.ts
```

**Правила:**
- Один компонент — одна одноимённая папка внутри `components/`.
- Типы данных фичи — в `types/{feature}.types.ts`, не в корне фичи и не внутри `components/`.
- `services/` — всегда на уровне фичи, никогда внутри `components/`.
- `.git-keep` — в любой папке, которая пуста или пока не содержит файлов (чтобы git её отслеживал).

---

## Секция `web/` — публичная веб-заглушка

Маршруты: `web.routes.ts`

```
/web/welcome    — главная (hero + кнопки скачивания)
/web/about      — о проекте
/web/security   — безопасность / E2E
```

`MainWebComponent` (`web/main/`) — shell с хедером, футером и `<router-outlet>`.  
Дочерние страницы рендерятся внутри него.

**Адаптив:** mobile-first. Брейкпоинты: `640px` (планшет), `1024px` (десктоп).  
Хедер на мобилке: логотип + кнопка темы + бургер-меню (nav-ссылки скрыты до 640px).  
Футер на мобилке: `flex-direction: column`, точки-разделители скрыты до 640px.

---

## Секция `application/` — мессенджер

Маршруты: `application.routes.ts`

`MainApplicationComponent` (`application/main/`) — shell приложения (таббар/сайдбар + `<router-outlet>`).  
Дочерние фичи — папки рядом с `main/` внутри `application/`:

```
application/
  application.routes.ts
  main/          — shell: таббар на мобилке, сайдбар на десктопе
  chats/         — список чатов + экран чата
  settings/      — настройки аккаунта
  profile/       — профиль пользователя
  ... и т.д.
```

**Адаптив:** mobile-first. На мобилке (Capacitor) — таббар снизу.  
На десктопе (Electron, широкий экран) — сайдбар слева, контент справа.

---

## Платформенный DI-слой

Abstract class + `useFactory` в `app.config.ts` для каждого платформо-зависимого сервиса.  
Рантайм определяет платформу через `PlatformDetectorService` и подставляет нужную реализацию.  
Tree-shaking платформенных реализаций не делается — принят trade-off ради single-bundle.  
Подробнее: [`platform-services.md`](platform-services.md).

---

## CSS-конвенции

- Методология: BEM (`.block__element--modifier`).
- Стили компонента — в его `.scss` файле, Angular `ViewEncapsulation` (по умолчанию Emulated).
- `:host` используется для управления flex/grid поведением компонента как flex-item родителя.
- Глобальные стили — только в `src/styles.scss` (сброс, CSS-переменные, типографика).
- Цвета пока хардкодятся; CSS-переменные / тема — TODO.
