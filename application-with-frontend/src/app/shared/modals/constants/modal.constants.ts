/** Ширина стандартной модалки */
export const MODAL_WIDTH_SM: string = '360px';

/** Ширина средней модалки */
export const MODAL_WIDTH_MD: string = '480px';

/** Максимальная ширина с отступами от краёв экрана */
export const MODAL_VIEWPORT_MAX: string = 'calc(100vw - 32px)';

/** Пресет: bottom-sheet (выезжает снизу, полная ширина) */
export const MODAL_BOTTOM_SHEET_PARAMS = {
  width: '100%',
  maxWidth: '100vw',
  position: { bottom: '0' },
  panelClass: 'modal-panel--bottom-sheet',
} as const;

/** Пресет: стандартная центрированная модалка */
export const MODAL_CENTER_PARAMS = {
  width: MODAL_WIDTH_SM,
  maxWidth: MODAL_VIEWPORT_MAX,
  panelClass: 'modal-panel--center',
} as const;
