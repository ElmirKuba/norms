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
| `/application/welcome` | `WelcomeApplicationComponent` | ✅ готов |
| `/application/auth/invite-code` | `InviteCodeApplicationComponent` | ✅ готов |
| `/application/auth/create-account` | `CreateAccountApplicationComponent` | ✅ готов |
| `/application/auth/login` | `LoginApplicationComponent` | ✅ готов |
| `/application/auth/recovery` | `RecoveryApplicationComponent` | ✅ 3 шага: UIN → Q&A → новый пароль |
| `/application/uin/assigned` | `UinAssignedApplicationComponent` | ✅ готов |
| `/application/main` | `MainApplicationComponent` (shell + таббар) | ✅ готов |
| `/application/main/chats` | `ChatsApplicationComponent` | ✅ список с моками |
| `/application/main/chats/:chatId` | `ChatDetailApplicationComponent` | ✅ чат с моками, таббар виден |
| `/application/main/search` | `SearchApplicationComponent` | ✅ с моками |
| `/application/main/settings` | `SettingsApplicationComponent` | ✅ кликабельные пункты |
| `/application/main/settings/account` | `SettingsAccountComponent` | ✅ с моками, без таббара |
| `/application/main/settings/devices` | `SettingsDevicesComponent` | ✅ с моками, без таббара |
| `/application/main/settings/privacy` | `SettingsPrivacyComponent` | ✅ MVP-инфо, без таббара |
| `/application/main/settings/recovery` | `SettingsRecoveryQuestionsComponent` | ✅ Q&A + добавление, без таббара |
| `/application/main/settings/invites` | `SettingsInvitesComponent` | ✅ коды + отзыв + копирование, без таббара |
| `/application/main/user/:accountId` | `UserProfileApplicationComponent` | ✅ профиль + кнопка «Написать», без таббара |
| `/application/new-device` | `NewDeviceApplicationComponent` | ✅ список orphan peers |
| `/application/main/profile` | `ProfileApplicationComponent` | ✅ с моками + mock-триггеры WSS |
| `/application/main/settings/change-password` | `SettingsChangePasswordComponent` | ✅ форма смены пароля, mock-submit |

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
| `session_kicked` (WSS) | `SessionKickedService` | Блокирующая модалка, после «Войти снова» → `/application/welcome` |
| `password_reset_via_recovery` (WSS) | `MainApplicationComponent.passwordResetBanner` signal | Баннер поверх контента с кнопками «Сменить пароль» / «Закрыть» |

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
- Цвета пока хардкодятся; CSS-переменные / тема — TODO.

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
