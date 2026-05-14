# Frontend Architecture

Приложение: `application-with-frontend/` — Angular + Capacitor + Electron.  
Один `ng build` → три платформы. Один Angular SPA, навигация через Angular Router.

---

## Платформы и роутинг

- **Capacitor** (iOS, Android) и **Electron** (Windows, macOS, Linux) — webview/Chromium без адресной строки, грузят `dist/` через `file://`.
- Из-за `file://` нужен `HashLocationStrategy` (`/#/path`) — HTML5 history API там не работает. Подключается через `withHashLocation()` в `provideRouter(...)` в `app.config.ts`.
- Браузер грузит тот же Angular, но видит только веб-заглушку (`/web/*`) — никакого мессенджера, регистрации или настроек.

### Корневой роутинг и разделение web / application

`app.routes.ts` объявляет два lazy-loaded модуля маршрутов:
- `/web/*` — публичная веб-заглушка (лендинг, about, security). Защищён `webOnlyGuard`.
- `/application/*` — мессенджер. Защищён `nativeOnlyGuard` (только Capacitor/Electron, в браузере → redirect на `/web/welcome`).

**Корневой redirect** (`path: ''`) — платформо-зависимый: в браузере `→ /web/welcome`, в нативе `→ /application/welcome`. Реализован через функцию-redirect внутри `app.routes.ts`, которая инжектит `PlatformDetectorService`.

**Fallback `path: '**'`** — `redirectTo: ''` (попадёт обратно в платформо-зависимый redirect).

Гарды лежат в `core/guards/platform.guard.ts`.

---

## Структура `src/app/`

```
src/app/
  app.routes.ts          — корневые маршруты, делегирует в web/ и application/
  app.config.ts          — provideRouter, provideHttpClient(withFetch, withInterceptors), APP_INITIALIZER, DI
  core/
    api/                 — API_BASE_URL InjectionToken (default http://localhost:3000/api/v1)
    components/
      root/              — RootComponent (точка входа + контейнер SecurityAlerts)
      security-alerts/   — глобальный position:fixed оверлей с баннерами безопасности (всех экранов после login)
    guards/
      auth.guard.ts      — защита /application/main и /application/main/*
      guest.guard.ts     — защита /welcome и /auth/* (после рестарта — fix session-restore bug)
      platform.guard.ts  — web → /web/*, native → /application/*
    interceptors/
      auth.interceptor.ts — Bearer header + 401 retry с queue через BehaviorSubject
    services/
      feature-flags/     — FeatureFlagsService (APP_INITIALIZER: GET /app/feature-flags)
      platform/          — PlatformDetectorService
      storage/           — StorageService (abstract) + TokenStorageService (использует SecureStorage)
      secure-storage/    — SecureStorageService: Electron safeStorage IPC, Capacitor — TODO
      session/           — SessionApiService (read-list, delete, clear-others, update-nickname)
      theme/             — ThemeService (provideAppInitializer)
      wss/               — WssService (connect/disconnect/reconnect, ping/pong, token_refresh за 3с до exp)
  features/
    web/                 — публичная веб-заглушка (welcome, about, security)
    application/         — мессенджер: auth, uin, main (shell), chats, search, settings, profile, new-device
  shared/
    components/          — badge, button, input
    modals/              — DialogModalComponent + ModalHeader/Content/Footer + types/constants
    services/, types/    — переиспользуемое
```

См. также: [`platform-services.md`](platform-services.md) — детали реализаций платформенных сервисов.

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
  auth/          — auth-флоу (welcome, invite-code, create-account, login)
  uin/           — UIN-флоу (assigned; pending — модалка, не роут)
  main/          — shell: таббар на мобилке, сайдбар на десктопе
  chats/         — список чатов + экран чата + ChatsStateService
  search/        — поиск по UIN / username
  settings/      — настройки аккаунта
  profile/       — профиль пользователя
```

**Таббар и навигация внутри раздела:**  
Таб «Чаты» запоминает последний открытый чат через `ChatsStateService` (`activeChatId` signal). При переключении на другой таб и обратно — возвращает в открытый чат, не в список. `ChatDetailApplicationComponent` вызывает `setActiveChat(chatId)` при инициализации и `clearActiveChat()` при нажатии «назад».

**Адаптив:** mobile-first. На мобилке (Capacitor) — таббар снизу.  
На десктопе (Electron, широкий экран) — сайдбар слева, контент справа.

### Актуальные роуты `application/`

| Роут | Компонент | Статус |
|---|---|---|
| `/application/welcome` | `WelcomeApplicationComponent` | ✅ API (feature flags) |
| `/application/auth/invite-code` | `InviteCodeApplicationComponent` | ✅ API |
| `/application/auth/create-account` | `CreateAccountApplicationComponent` | ✅ API |
| `/application/auth/login` | `LoginApplicationComponent` | ✅ API |
| `/application/auth/recovery` | `RecoveryApplicationComponent` | ✅ API (все 3 шага) |
| `/application/uin/assigned` | `UinAssignedApplicationComponent` | ✅ API (UIN из WSS uin_assigned) |
| `/application/main` | `MainApplicationComponent` (shell + таббар) | ✅ |
| `/application/main/chats` | `ChatsApplicationComponent` | 🔶 мок (шаг 9.15) |
| `/application/main/chats/:chatId` | `ChatDetailApplicationComponent` | 🔶 мок (шаг 9.16) |
| `/application/main/search` | `SearchApplicationComponent` | ✅ API (debounce 300ms) |
| `/application/main/settings` | `SettingsApplicationComponent` | ✅ |
| `/application/main/settings/account` | `SettingsAccountComponent` | ✅ API (read + update nickname) |
| `/application/main/settings/devices` | `SettingsDevicesComponent` | ✅ API (sessions CRUD) |
| `/application/main/settings/privacy` | `SettingsPrivacyComponent` | ✅ MVP-инфо |
| `/application/main/settings/recovery` | `SettingsRecoveryQuestionsComponent` | ✅ API (Q&A CRUD) |
| `/application/main/settings/invites` | `SettingsInvitesComponent` | ✅ API (create/revoke/read/referrals) |
| `/application/main/settings/change-password` | `SettingsChangePasswordComponent` | ✅ API (PATCH /account/update) |
| `/application/main/user/:accountId` | `UserProfileApplicationComponent` | ✅ API (account/read?id=) |
| `/application/main/profile` | `ProfileApplicationComponent` | ✅ API |
| `/application/new-device` | `NewDeviceApplicationComponent` | 🔶 мок (шаг 9.20: GET /chat/read-orphan-peers) |

**Модалки (не роуты):**

| Модалка | Способ | Триггер / Сервис | Статус |
|---|---|---|---|
| UIN Pending («Назначаем UIN...») | A | `UinModalService.openUinPending()` — после регистрации | ✅ |
| Chat Onboarding («Как работают чаты») | A | `ChatOnboardingService.openIfNeeded()` — первый чат на устройстве | ✅ |
| Создание чата (выбор устройства → название) | B | `CreateChatModalService.open()` — из профиля собеседника | ✅ |
| Успешное создание инвайта (код + копирование) | B | `SettingsInvitesComponent.createCode()` | ✅ |
| Session Kicked («Сессия завершена») | A | `SessionKickedService.showKickedModal()` — WSS `session_kicked` | ✅ |
| Подтверждение кика устройства | A | `DevicesComponent.confirmTerminate()` — кнопка «Завершить» | ✅ |

**Глобальные UI-события (не модалки):**

| Событие | Где обрабатывается | Визуал |
|---|---|---|
| `uin_assigned` (WSS) | `MainApplicationComponent` → `UinModalService` | Закрывает UIN Pending модалку, navigate → `/uin/assigned` |
| `session_kicked` (WSS) | `SessionKickedService` | Блокирующая bottom-sheet, после «Войти снова» → `/application/welcome` + `tokenStorage.clear()` |
| `password_reset_via_recovery` (WSS) | `MainApplicationComponent.passwordResetBanner` signal | Жёлтый баннер «Пароль был сброшен через восстановление», закрывается крестиком |
| `password_changed` (WSS) | `SecurityAlertsComponent` (глобальный оверлей в `RootComponent`) | Security-баннер «Пароль изменён на другом устройстве» |
| `session_created` (WSS) | `SecurityAlertsComponent` | Security-баннер «Выполнен вход с устройства X» + «Кикнуть» / «Устройства» / «Это я» |
| `refresh_reused` (WSS error) | `WssService` → `TokenStorageService.clear()` → navigate `/application/welcome` | — |

`SecurityAlertsComponent` рендерится в `RootComponent` как `position: fixed` оверлей — баннеры видны на ВСЕХ экранах после авторизации, в т.ч. `main/settings/*` (они не дочерние `MainApplicationComponent`).

---

## Modal-система (`shared/modals/`)

Движок: `@angular/material` (`MatDialog`). Material даёт overlay, backdrop, a11y, анимации — визуальный стиль полностью кастомный.

### Структура

```
shared/modals/
  types/
    modal.types.ts       — DialogModalData<T>, ModalHeaderIcon
  constants/
    modal.constants.ts   — MODAL_BOTTOM_SHEET_PARAMS, MODAL_CENTER_PARAMS, размеры
  components/
    dialog-modal/        — универсальная рамка (Способ A, 80% случаев)
    modal-header/        — иконка (SVG) + title через ng-content
    modal-content/       — контентная область (текст или NgComponentOutlet)
    modal-footer/        — кнопки, поддержка vertical / reversed
```

### Два способа открытия

**Способ A — конфигурация через `DialogModalData`** (большинство случаев):

```typescript
this._dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
  ...MODAL_BOTTOM_SHEET_PARAMS,
  data: {
    icon: ModalHeaderIcon.Preloader,
    title: 'Назначаем UIN...',
    text: 'Это займёт несколько секунд.',
    closeBtnText: 'Понятно',
    closeCallback: () => { /* ... */ },
  },
});
```

**Способ B — самостоятельный компонент** (сложный layout, полноэкранные формы):

```typescript
this._dialog.open(MyFullScreenComponent, {
  ...MODAL_BOTTOM_SHEET_PARAMS,
  disableClose: true,
  data: someData,
});
```

### `DialogModalData<T>` — ключевые поля

| Поле | Назначение |
|---|---|
| `icon` | `ModalHeaderIcon.Preloader/Done/Error/Info/Warning` |
| `title` | заголовок |
| `text` | текст или HTML |
| `component` | встроенный компонент вместо текста (`NgComponentOutlet`) |
| `componentData` | данные для компонента (generic T), через `@Input() public data` |
| `isConfirmModal` | `true` → confirm + cancel, `false` → одна «Закрыть» |
| `confirmCallback` / `confirmCallbackAsync` | sync = закрытие автоматически; async = ручное `ref.close()` |
| `closeBtnText` / `closeCallback` | кнопка закрытия в не-confirm режиме |
| `isFooterButtonsVertically` | кнопки столбиком |
| `isButtonsOrderReversed` | confirm и cancel меняются местами |
| `preventDialogClose` | блокирует Escape и клик по backdrop |

### Доменные сервисы

Каждый домен создаёт свой сервис, скрывающий конфигурацию за осмысленными методами:

```typescript
// features/application/uin/services/uin-modal.service.ts
@Injectable({ providedIn: 'root' })
export class UinModalService {
  openUinPending(onAcknowledge: () => void): MatDialogRef<DialogModalComponent> { ... }
}
```

### Пресеты

```typescript
MODAL_BOTTOM_SHEET_PARAMS  // width: 100%, position.bottom: 0, panelClass: bottom-sheet
MODAL_CENTER_PARAMS        // width: 360px, maxWidth: calc(100vw - 32px), panelClass: center
```

### Глобальные стили

В `styles.scss` переопределены Material MDC-стили для двух панелей:
- `.modal-panel--bottom-sheet` — `border-radius: 24px 24px 0 0`
- `.modal-panel--center` — `border-radius: 20px`

### Пример: UIN Pending флоу

```
create-account.onSubmit()
  → navigate('/application/main', state: { pendingUin: true })

MainApplicationComponent.ngOnInit()
  → lastSuccessfulNavigation()?.extras.state?.pendingUin
  → UinModalService.openUinPending(callback)
  → DialogModalComponent (bottom-sheet) поверх экрана чатов
  → «Понятно» → callback → navigate('/application/uin/assigned')
```

В продакшне: вместо колбека «Понятно» → WSS-событие `uin_assigned` → `dialogRef.close()` → навигация.

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
- **Цвета — через CSS-переменные** (`var(--clr-*)`) из `:root` в `styles.scss`. ~45 семантических токенов: brand, backgrounds/surfaces, text, borders, status (danger/warning/success), modal-icon-bg, settings-icons, miscellaneous.
- **Тёмная тема** — через `:root.dark { }` каскад (override светлых токенов). Класс `.dark` добавляется на `<html>` сервисом `ThemeService`.

### `ThemeService` (`core/services/theme/`)

- Приоритет применения: `localStorage('theme')` → `prefers-color-scheme` → светлая по умолчанию.
- Слушает изменения системной темы (только если пользователь не выбирал явно).
- Инициализируется через `provideAppInitializer(...)` в `app.config.ts` — до первого рендера, без FOUC.
- Реактивный сигнал `isDark`, метод `toggle()`.
- `DOCUMENT` injection token для платформо-безопасного доступа к `document`.

### Глобальные правила в обход view encapsulation

Когда нужно повлиять на дочерний компонент из глобальных стилей (`styles.scss`) — `:host-context()` в Angular 21 работает нестабильно. Используем правила в `styles.scss` напрямую: они не получают `[_ngcontent-xxx]` атрибуты и видят все элементы по имени класса. Пример: `.dark .features__card-icon { filter: brightness(0) invert(1); }` инвертирует SVG-иконки в тёмной теме.

---

## Как расширять

### Новый экран (роут)

1. Создать папку `features/application/{feature}/components/{name}/` с тремя файлами (`.ts`, `.html`, `.scss`).
2. Добавить роут в `application.routes.ts` (lazy или inline).
3. Если экран без таббара — компонент рендерится напрямую через роутер, таббар скрывается автоматически (он только внутри `main` shell).

### Новая модалка (Способ A — типовой кейс)

```typescript
this._dialog.open(DialogModalComponent, {
  ...MODAL_BOTTOM_SHEET_PARAMS,
  data: {
    icon: ModalHeaderIcon.Info,
    title: 'Заголовок',
    text: 'Текст сообщения',
    closeBtnText: 'Понятно',
  } satisfies DialogModalData,
});
```

Если нужна confirm-кнопка — добавить `isConfirmModal: true`, `confirmBtnText`, `confirmCallback`.

### Новая модалка (Способ B — кастомный layout)

1. Создать компонент в `features/application/{feature}/components/{name}-modal/`.
2. Объявить `export interface {Name}ModalData` и `export interface {Name}ModalResult` рядом с компонентом.
3. Инжектировать `MAT_DIALOG_DATA` и `MatDialogRef`, закрывать через `this._dialogRef.close(result)`.
4. Открывать через `this._dialog.open(MyModalComponent, { ...MODAL_BOTTOM_SHEET_PARAMS, data })`.
5. Если повторно используется — обернуть в доменный сервис (`{feature}-modal.service.ts`).

### Новый глобальный WSS-обработчик

Добавить обработку в `MainApplicationComponent` (или выделить в отдельный `Injectable` сервис).  
Паттерн: сервис принимает событие → показывает модалку или меняет сигнал в shell-компоненте → shell реагирует через `@if`.
