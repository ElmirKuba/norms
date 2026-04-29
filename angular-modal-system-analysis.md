# Архитектура модальных окон (Angular Material Dialog)

> Анализ паттерна из production-проекта (Angular 12). Цель — воспроизвести этот же принцип на современном Angular (17+) в новом проекте с нуля, установив все необходимые зависимости. Дизайн рамки будет другой, но архитектурный подход — тот же.

---

## 1. Общая идея

Система модалок построена на `MatDialog` из `@angular/material`. Есть **два способа** открытия:

### Способ A: Shell-компонент + конфиг (80% случаев)
Открываем `DialogModalComponent` (универсальную рамку), а через `data: DialogModalData<T>` конфигурируем что внутри — текст, кнопки, или целый компонент:

```typescript
this.dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
  width: '440px',
  data: {
    title: 'Заголовок',
    text: 'Текст',
    classIcon: ModalHeaderClassIcon.Done,
  },
});
```

### Способ B: Самостоятельный компонент напрямую (20% случаев)
Для сложных сценариев (полноэкранные формы, мультишаговые процессы) — компонент открывается напрямую, без рамки:

```typescript
this.dialog.open(TicketSaleComponent, {
  ...FULL_SCREEN_MODAL_PARAMS,
  disableClose: true,
  data: someData,
});
```

Такой компонент сам управляет своим layout, заголовком, кнопками.

---

## 2. Структура файлов

```
modals/
├── components/
│   ├── dialog-modal/                ← Универсальная рамка
│   │   ├── dialog-modal.component.ts
│   │   ├── dialog-modal.component.html
│   │   └── dialog-modal.component.scss
│   ├── spinner-modal/               ← Спиннер ожидания
│   │   ├── spinner-modal.component.ts
│   │   ├── spinner-modal.component.html
│   │   └── spinner-modal.component.scss
│   └── partials/                    ← Переиспользуемые части рамки
│       ├── modal-header/
│       ├── modal-content/
│       └── modal-footer/
├── constants/
│   └── modals.constants.ts          ← Ширины, пресеты
└── modals.module.ts
```

---

## 3. Интерфейс DialogModalData<T> (ПОЛНЫЙ)

Это сердце системы. Через него конфигурируется всё:

```typescript
export interface DialogModalData<T = any> {
  // ─── Заголовок ───
  readonly title?: string;
  readonly svgIcon?: SvgIcon;                    // SVG-иконка
  readonly classIcon?: ModalHeaderClassIcon;     // CSS-класс иконки: 'done'|'error'|'info'|'warning'|'preloader'

  // ─── Контент ───
  readonly text?: string;                        // Текст или HTML (рендерится через [innerHTML])
  readonly textCenter?: boolean;                 // Центрировать текст
  readonly component?: ComponentType<any>;       // Произвольный компонент вместо текста
  readonly componentData?: T;                    // Generic-данные для этого компонента

  // ─── Режим ───
  readonly isConfirmModal?: boolean;             // true → confirm + cancel кнопки
                                                 // false → одна кнопка "Закрыть"

  // ─── Кнопка подтверждения (confirm) ───
  readonly confirmBtnText?: string;              // Текст (по умолчанию "Да")
  readonly confirmCallback?: () => void;         // Sync — модалка закроется АВТОМАТИЧЕСКИ
  readonly confirmCallbackAsync?: () => Promise<void>;  // Async — модалка НЕ закроется, вызывать ref.close() вручную
  readonly isConfirmButtonDisabled?: () => boolean;     // Динамическая блокировка кнопки
  readonly confirmBtnDataAttr?: string;          // data-test атрибут для e2e

  // ─── Кнопка отмены (cancel) ───
  readonly cancelBtnText?: string;               // Текст (по умолчанию "Нет")
  readonly cancelCallback?: () => void;          // Sync
  readonly cancelCallbackAsync?: () => Promise<void>;   // Async
  readonly cancelBtnDataAttr?: string;

  // ─── Кнопка закрытия (для не-confirm режима) ───
  readonly closeBtnText?: string;                // Текст (по умолчанию "Закрыть")
  readonly closeCallback?: () => void;
  readonly isAccentCloseBtn?: boolean;           // Выделить стилистически

  // ─── Layout кнопок ───
  readonly isFooterButtonsVertically?: boolean;  // Кнопки столбиком
  readonly isButtonsOrderReversed?: boolean;     // Поменять confirm и cancel местами
  readonly footerClass?: string;                 // Дополнительный CSS-класс

  // ─── Поведение ───
  readonly preventDialogClose?: boolean;         // Блокировка Escape и клика по backdrop
  readonly dataTest?: string;                    // data-test для модалки
}
```

### Enum иконок:

```typescript
export enum ModalHeaderClassIcon {
  Preloader = 'preloader',  // Анимированная крутилка
  Done = 'done',            // Зелёная галочка
  Error = 'error',          // Красный крестик
  Info = 'info',            // Синяя информация
  Warning = 'warning',      // Жёлтый треугольник
}
```

---

## 4. Реализация DialogModalComponent

### TypeScript:

```typescript
import { ChangeDetectionStrategy, Component, ComponentRef, EmbeddedViewRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ComponentType } from '@angular/cdk/overlay';
import { CdkPortalOutlet, ComponentPortal } from '@angular/cdk/portal';

type CdkPortalOutletAttachedRef = ComponentRef<any> | EmbeddedViewRef<any> | null;

@Component({
  selector: 'dialog-modal',
  templateUrl: './dialog-modal.component.html',
  styleUrls: ['./dialog-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default, // НЕ OnPush — колбеки могут менять состояние извне
})
export class DialogModalComponent {
  // Портал создаётся сразу при инициализации, если передан component
  readonly componentPortal = this.data.component ? new ComponentPortal(this.data.component) : undefined;

  @ViewChild(CdkPortalOutlet) portalOutlet?: CdkPortalOutlet;
  componentRef?: ComponentRef<any>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogModalData,
    private dialogRef: MatDialogRef<DialogModalComponent>,
  ) {
    if (this.data.preventDialogClose) {
      this.dialogRef.disableClose = true;
      this.dialogRef.backdropClick().subscribe(() => false);
      this.dialogRef.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
        }
      });
    }
  }

  onAttach(ref: CdkPortalOutletAttachedRef): void {
    if (ref instanceof ComponentRef) {
      this.componentRef = ref;
    }
  }

  isConfirmButtonDisabled(): boolean {
    return this.data.isConfirmButtonDisabled ? this.data.isConfirmButtonDisabled() : false;
  }
}
```

### HTML шаблон (ПОЛНЫЙ, РАБОЧИЙ):

```html
<!-- HEADER: иконка + заголовок -->
<modal-header
  [svgIcon]="data.svgIcon"
  [classIcon]="data.classIcon"
  [class.text-center]="data.textCenter"
  [attr.data-test]="data.dataTest"
>
  <span [innerHTML]="data.title"></span>
</modal-header>

<!-- CONTENT: текст ИЛИ компонент через портал -->
<modal-content *ngIf="data.text || componentPortal">
  <ng-container *ngIf="data.text as text; else portalOutlet">
    <div [class.text-center]="data.textCenter" [innerHTML]="text"></div>
  </ng-container>
  <ng-template #portalOutlet [cdkPortalOutlet]="componentPortal" (attached)="onAttach($event)"></ng-template>
</modal-content>

<!-- FOOTER: кнопки -->
<modal-footer
  [footerClass]="data?.footerClass"
  [isFooterButtonsVertically]="!!data.isFooterButtonsVertically"
  [isButtonsOrderReversed]="!!data.isButtonsOrderReversed"
>
  <!-- Режим confirm: две кнопки -->
  <ng-container *ngIf="data.isConfirmModal; else closeButton">
    <!-- Confirm кнопка: sync или async -->
    <ng-container *ngIf="data.confirmCallbackAsync; then confirmCallbackAsync; else confirmCallback"></ng-container>
    <!-- Cancel кнопка: sync или async -->
    <ng-container *ngIf="data.cancelCallbackAsync; then cancelCallbackAsync; else cancelCallback"></ng-container>
  </ng-container>
</modal-footer>

<!-- === ШАБЛОНЫ КНОПОК === -->

<!-- Sync confirm: [mat-dialog-close]="true" — закроет модалку автоматически -->
<ng-template #confirmCallback>
  <button
    (click)="data.confirmCallback && data.confirmCallback()"
    [mat-dialog-close]="true"
    [disabled]="isConfirmButtonDisabled()"
    [attr.data-test]="data.confirmBtnDataAttr"
  >
    {{ data.confirmBtnText || 'Да' }}
  </button>
</ng-template>

<!-- Async confirm: БЕЗ mat-dialog-close — модалка НЕ закроется -->
<ng-template #confirmCallbackAsync>
  <button (click)="data.confirmCallbackAsync && data.confirmCallbackAsync()" [disabled]="isConfirmButtonDisabled()">
    {{ data.confirmBtnText || 'Да' }}
  </button>
</ng-template>

<!-- Sync cancel -->
<ng-template #cancelCallback>
  <button
    (click)="data.cancelCallback && data.cancelCallback()"
    class="not-accent-button"
    [mat-dialog-close]="true"
    [attr.data-test]="data.cancelBtnDataAttr"
  >
    {{ data.cancelBtnText || 'Нет' }}
  </button>
</ng-template>

<!-- Async cancel -->
<ng-template #cancelCallbackAsync>
  <button
    (click)="data.cancelCallbackAsync && data.cancelCallbackAsync()"
    class="not-accent-button"
    [attr.data-test]="data.cancelBtnDataAttr"
  >
    {{ data.cancelBtnText || 'Нет' }}
  </button>
</ng-template>

<!-- Режим close: одна кнопка -->
<ng-template #closeButton>
  <button
    [ngClass]="{ 'not-accent-button': !data.isAccentCloseBtn }"
    class="width100"
    (click)="data.closeCallback && data.closeCallback()"
    mat-dialog-close
  >
    {{ data.closeBtnText || 'Закрыть' }}
  </button>
</ng-template>
```

### SCSS:

```scss
modal-content {
  margin-top: 8px;
  .text-center { text-align: center; }
}
modal-footer {
  margin-top: 20px;
}
```

---

## 5. Partial-компоненты (header, content, footer)

### modal-header

```typescript
@Component({
  selector: 'modal-header',
  templateUrl: './modal-header.component.html',
  styleUrls: ['./modal-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalHeaderComponent {
  @Input() svgIcon?: SvgIcon;
  @Input() classIcon?: ModalHeaderClassIcon;
}
```

```html
<!-- Либо SVG-иконка, либо CSS-класс иконка -->
<lb-svg-icon
  *ngIf="svgIcon as icon; else classIconBlock"
  [iconName]="icon.name"
  [size]="icon.size || 44"
  [color]="icon.color"
></lb-svg-icon>

<ng-template #classIconBlock>
  <div *ngIf="classIcon" [class]="['class-icon', classIcon]"></div>
</ng-template>

<h2 mat-dialog-title>
  <ng-content></ng-content>
</h2>
```

```scss
:host {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

lb-svg-icon, .class-icon {
  margin-bottom: 16px;
}

.class-icon {
  height: 44px;
  width: 44px;

  &.preloader { content: var(--preloader-img); }
  &.done      { mask-image: url($svg-banner-icon-done);    background-color: var(--color-positive); }
  &.error     { mask-image: url($svg-banner-icon-error);   background-color: var(--color-negative); }
  &.info      { mask-image: url($svg-banner-icon-info);    background-color: var(--color-active); }
  &.warning   { mask-image: url($svg-banner-icon-warning); background-color: var(--color-warning); }
}

h2 {
  margin: 0;
  line-height: 24px;
}
```

### modal-content

```typescript
@Component({
  selector: 'modal-content',
  template: '<mat-dialog-content><ng-content></ng-content></mat-dialog-content>',
  styleUrls: ['./modal-content.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalContentComponent {}
```

```scss
:host { display: block; }
.mat-dialog-content {
  margin: 0;
  padding: 0;
}
```

### modal-footer

```typescript
@Component({
  selector: 'modal-footer',
  templateUrl: './modal-footer.component.html',
  styleUrls: ['./modal-footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalFooterComponent {
  @Input() footerClass?: string;
  @Input() isFooterButtonsVertically = false;
  @Input() isButtonsOrderReversed = false;
}
```

```html
<mat-dialog-actions [ngClass]="{ vertically: isFooterButtonsVertically, reverse: isButtonsOrderReversed }">
  <ng-content></ng-content>
</mat-dialog-actions>
```

```scss
.mat-dialog-actions {
  min-height: 0;
  margin: 0;
  padding: 0;
  display: flex;

  &.reverse {
    flex-direction: row-reverse;
    button:not(:only-child):first-child { margin: 0 0 0 10px; }
  }

  button {
    flex: 1 1 0;
    &:not(:only-child):first-child { margin: 0 10px 0 0; }
  }
}

.vertically {
  flex-direction: column;
  button { margin: 10px 0 0 0 !important; }
  &.reverse { flex-direction: column-reverse; }
}
```

---

## 6. SpinnerModalComponent (вторая рамка)

```typescript
export interface SpinnerModalData {
  title: string;
  text: string;
}

@Component({
  selector: 'spinner-modal',
  templateUrl: './spinner-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpinnerModalComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public readonly data: SpinnerModalData) {}
}
```

```html
<div class="wrapper">
  <div class="class-icon preloader"></div>
  <div class="title" [innerHTML]="data.title"></div>
  <div class="text" [innerHTML]="data.text"></div>
</div>
```

```scss
.wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .class-icon {
    height: 44px;
    width: 44px;
    &.preloader { content: var(--preloader-img); }
  }
}
```

---

## 7. Константы и пресеты

```typescript
// Размеры
export const MODAL_SMALL_WIDTH = '440px';
export const MODAL_MEDIUM_WIDTH = '700px';
export const MODAL_LARGE_WIDTH = '770px';
export const MODAL_EXTRA_LARGE_WIDTH = '1000px';
export const MODAL_FULL_WIDTH = '100%';
export const MODAL_HALF_WIDTH = '50%';
export const MODAL_FULL_HEIGHT = '100%';
export const MODAL_THREE_QUARTER = '75%';
export const MODAL_REQ_ACTION_WIDTH = '600px';
export const MODAL_VIEWPORT_MAX_WIDTH = 'calc(100vw - 32px)';
export const MODAL_VIEWPORT_MAX_HEIGHT = 'calc(100vh - 32px)';

// Пресет: полноэкранная модалка
export const FULL_SCREEN_MODAL_PARAMS = {
  width: MODAL_FULL_WIDTH,
  maxWidth: MODAL_FULL_WIDTH,
  height: MODAL_FULL_HEIGHT,
  panelClass: ['no-border-modal', 'no-padding-modal'],
  data: {},
};

// Пресет: 3/4 экрана
export const THREE_QUARTER_SCREEN_MODAL_PARAMS = {
  width: MODAL_THREE_QUARTER,
  maxWidth: MODAL_THREE_QUARTER,
  height: MODAL_THREE_QUARTER,
  panelClass: ['no-border-modal', 'no-padding-modal'],
  data: {},
};

// Фабрика для спиннера
export const spinnerModalParams = (title: string, text: string) => ({
  data: { title, text },
  width: MODAL_SMALL_WIDTH,
  disableClose: true,
});
```

---

## 8. Паттерны возврата результата из модалки

В проекте используется **5 паттернов**. Это критически важно для воспроизведения:

### Паттерн 1: Fire and Forget (void)
Модалка открывается, результат не нужен:
```typescript
showSuccess(): void {
  this.dialog.open(DialogModalComponent, {
    width: MODAL_SMALL_WIDTH,
    data: { title: 'Готово', classIcon: ModalHeaderClassIcon.Done, textCenter: true },
  });
}
```

### Паттерн 2: Observable через afterClosed()
```typescript
openSelectAction(): Observable<ActionType> {
  return this.dialog
    .open(SelectActionComponent, { width: MODAL_SMALL_WIDTH })
    .afterClosed();
}
```

### Паттерн 3: Promise через firstValueFrom()
```typescript
async openConfirm(): Promise<ResultType> {
  return firstValueFrom(
    this.dialog
      .open<MyComponent, void, ResultType>(MyComponent, { disableClose: true })
      .afterClosed()
  ) as Promise<ResultType>;
}
```

### Паттерн 4: Promise через new Promise + sync-колбеки (САМЫЙ ЧАСТЫЙ для confirm-диалогов)
Колбеки резолвят промис, модалка закрывается автоматически через `[mat-dialog-close]`:
```typescript
openConfirmDelete(title: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    this.dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      width: MODAL_SMALL_WIDTH,
      disableClose: true,
      data: {
        isConfirmModal: true,
        classIcon: ModalHeaderClassIcon.Warning,
        title,
        text: 'Это действие необратимо',
        textCenter: true,
        isButtonsOrderReversed: true,
        confirmBtnText: 'Удалить',
        confirmCallback: () => resolve(true),
        cancelBtnText: 'Отмена',
        cancelCallback: () => resolve(false),
      },
    });
  });
}
```

### Паттерн 5: MatDialogRef напрямую (для ручного закрытия позже)
Спиннер открывается, а закрывается извне когда операция завершена:
```typescript
openLoading(title: string): MatDialogRef<SpinnerModalComponent, void> {
  return this.dialog.open<SpinnerModalComponent, SpinnerModalData, void>(
    SpinnerModalComponent,
    spinnerModalParams(title, 'Пожалуйста, подождите'),
  );
}

// Использование:
const spinner = this.modalService.openLoading('Загрузка...');
await someAsyncOperation();
spinner.close();
```

---

## 9. Паттерн sync vs async колбеков (КЛЮЧЕВОЕ ОТЛИЧИЕ)

| | Sync (confirmCallback) | Async (confirmCallbackAsync) |
|---|---|---|
| **В шаблоне** | `[mat-dialog-close]="true"` на кнопке | Нет `mat-dialog-close` |
| **Закрытие** | Автоматическое после клика | Ручное: `ref.close()` в колбеке |
| **Когда** | Простые действия | Нужно дождаться API, показать спиннер |

Пример async — нужно повторить запрос или закрыть:
```typescript
checkConnectFailed(): Observable<boolean | undefined> {
  const ref = this.dialog.open<DialogModalComponent, DialogModalData, boolean>(
    DialogModalComponent,
    {
      width: MODAL_SMALL_WIDTH,
      disableClose: true,
      data: {
        title: 'Устройство не отвечает',
        classIcon: ModalHeaderClassIcon.Error,
        isConfirmModal: true,
        confirmBtnText: 'Повторить',
        cancelBtnText: 'Закрыть',
        confirmCallbackAsync: async () => ref.close(true),   // ← ручное закрытие с результатом
        cancelCallbackAsync: async () => ref.close(false),
      },
    },
  );
  return ref.afterClosed();
}
```

---

## 10. Внедрение компонента внутрь рамки (CDK Portal)

Когда нужно показать в модалке не просто текст, а целый компонент:

```typescript
openErrorDetails(errorData: ErrorInfo): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    this.dialog.open<DialogModalComponent, DialogModalData>(DialogModalComponent, {
      width: MODAL_MEDIUM_WIDTH,
      disableClose: true,
      data: {
        classIcon: ModalHeaderClassIcon.Error,
        title: 'Ошибка регистрации',
        component: ErrorDetailsComponent,          // ← компонент
        componentData: errorData,                  // ← данные для него (generic T)
        isFooterButtonsVertically: true,
        closeBtnText: 'Закрыть',
        closeCallback: () => resolve(false),
      },
    });
  });
}
```

Как это работает внутри DialogModalComponent:
1. `componentPortal = new ComponentPortal(data.component)` — создаётся портал
2. В шаблоне: `<ng-template [cdkPortalOutlet]="componentPortal" (attached)="onAttach($event)">` — рендерится
3. `onAttach()` сохраняет `ComponentRef` для доступа к инстансу компонента

---

## 11. Доменные modal-сервисы

Каждый бизнес-модуль создаёт свой сервис, который прячет конфигурацию за понятными методами:

```typescript
@Injectable({ providedIn: 'root' })
export class OrderModalService {
  constructor(private readonly dialog: MatDialog) {}

  // Информационная
  showPaymentError(errorText: string): void { ... }

  // Подтверждение → Promise<boolean>
  confirmCancelOrder(orderId: string): Promise<boolean> { ... }

  // Спиннер → MatDialogRef (закрыть позже)
  openLoading(title: string): MatDialogRef<SpinnerModalComponent> { ... }

  // Полноэкранная форма → Observable<Result>
  openOrderForm(data: OrderData): Observable<OrderResult> { ... }
}
```

В проекте **35+ таких сервисов** — по одному на каждый бизнес-модуль.

---

## 12. Модуль

```typescript
@NgModule({
  imports: [MatDialogModule, CommonModule, PortalModule],
  declarations: [
    ModalHeaderComponent,
    ModalContentComponent,
    ModalFooterComponent,
    DialogModalComponent,
    SpinnerModalComponent,
  ],
  exports: [
    MatDialogModule,
    ModalHeaderComponent,
    ModalContentComponent,
    ModalFooterComponent,
    SpinnerModalComponent,
  ],
})
export class ModalsModule {}
```

---

## 13. Схема потока данных

```
[Доменный modal-сервис]
       │
       │  dialog.open<ShellComponent, DataType, ResultType>(...)
       ▼
[MatDialog]
       │
       ├─── Способ A: DialogModalComponent (рамка)
       │         │
       │         ├── <modal-header>  ← title + icon
       │         ├── <modal-content>
       │         │     ├── text (innerHTML)
       │         │     └── ComponentPortal<T> ← component + componentData
       │         └── <modal-footer>  ← кнопки (sync/async колбеки)
       │
       └─── Способ B: Самостоятельный компонент
                 │
                 └── Сам управляет layout, получает data через MAT_DIALOG_DATA
       │
       ▼
ref.afterClosed() ──▶ Observable<ResultType> ──▶ Promise / subscribe / void
```

---

## 14. Что нужно для воспроизведения на Angular 17+

### Установить:

```bash
ng add @angular/material
# CDK Portal ставится автоматически с material
```

### Что меняется синтаксически:

| Angular 12 (исходник) | Angular 17+ |
|---|---|
| `NgModule` + `ModalsModule` | `standalone: true` на каждом компоненте |
| `@Inject(MAT_DIALOG_DATA)` | `inject(MAT_DIALOG_DATA)` |
| `*ngIf` | `@if` (control flow) |
| `*ngIf="x; then a; else b"` | `@if (x) { a } @else { b }` |
| `[ngClass]` | Можно оставить или `[class]` |
| `ComponentPortal` из CDK | Можно заменить на `NgComponentOutlet` (проще) |

### Что остаётся как принцип:

1. **Один универсальный DialogModalComponent** + конфиг через data
2. **Композиция header/content/footer** — partial-компоненты
3. **DialogModalData<T>** — единый типизированный контракт
4. **Sync vs async колбеки** — контроль над закрытием
5. **Доменные modal-сервисы** — абстракция над MatDialog
6. **Константы размеров и пресеты** — единообразие
7. **Два способа**: shell + config для простых, standalone-компонент для сложных

### Минимальный пример на Angular 17+ (standalone):

```typescript
// dialog-modal.component.ts
@Component({
  standalone: true,
  selector: 'dialog-modal',
  imports: [MatDialogModule, NgComponentOutlet, ModalHeaderComponent, ModalContentComponent, ModalFooterComponent],
  template: `
    <modal-header [icon]="data.classIcon">
      <span [innerHTML]="data.title"></span>
    </modal-header>

    @if (data.text || data.component) {
      <modal-content>
        @if (data.text; as text) {
          <div [class.text-center]="data.textCenter" [innerHTML]="text"></div>
        } @else if (data.component) {
          <ng-container *ngComponentOutlet="data.component; inputs: { data: data.componentData }" />
        }
      </modal-content>
    }

    <modal-footer [vertically]="!!data.isFooterButtonsVertically" [reversed]="!!data.isButtonsOrderReversed">
      @if (data.isConfirmModal) {
        <button (click)="onConfirm()" [disabled]="isConfirmDisabled()">
          {{ data.confirmBtnText || 'Да' }}
        </button>
        <button class="secondary" (click)="onCancel()">
          {{ data.cancelBtnText || 'Нет' }}
        </button>
      } @else {
        <button (click)="onClose()" mat-dialog-close>
          {{ data.closeBtnText || 'Закрыть' }}
        </button>
      }
    </modal-footer>
  `,
})
export class DialogModalComponent<T = unknown> {
  readonly data = inject<DialogModalData<T>>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef);

  async onConfirm() {
    if (this.data.confirmCallbackAsync) {
      await this.data.confirmCallbackAsync();
      // НЕ закрываем — колбек сам решает
    } else {
      this.data.confirmCallback?.();
      this.dialogRef.close(true);
    }
  }

  async onCancel() {
    if (this.data.cancelCallbackAsync) {
      await this.data.cancelCallbackAsync();
    } else {
      this.data.cancelCallback?.();
      this.dialogRef.close(false);
    }
  }

  onClose() {
    this.data.closeCallback?.();
  }

  isConfirmDisabled(): boolean {
    return this.data.isConfirmButtonDisabled ? this.data.isConfirmButtonDisabled() : false;
  }
}
```

---

## Итог

Паттерн — **конфигурируемый универсальный диалог**:
- Один shell-компонент для 80% модалок, standalone-компоненты для сложных
- `DialogModalData<T>` — единый generic-контракт
- CDK Portal (или NgComponentOutlet) для вложения произвольных компонентов
- 5 паттернов возврата результата: void, Observable, Promise (firstValueFrom), Promise (new Promise + колбеки), MatDialogRef
- sync/async колбеки управляют жизненным циклом модалки
- Доменные сервисы прячут конфигурацию за осмысленными методами
