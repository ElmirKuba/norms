/** Пункт навигации — ссылка с текстом */
export interface NavLink {
  /** Discriminator для discriminated union */
  kind: 'link';
  /** Отображаемый текст ссылки */
  label: string;
  /** Маршрут Angular Router */
  path: string;
}

/** Пункт навигации — кнопка с иконкой */
export interface NavButton {
  /** Discriminator для discriminated union */
  kind: 'button';
  /** Путь до иконки кнопки */
  imgSrc: string;
  /** Alt-текст иконки */
  imgAlt: string;
  /** Обработчик клика */
  onClick: () => void;
}

/** Discriminated union всех возможных пунктов навигации */
export type NavItem = NavLink | NavButton;
