/** Карточка с описанием аспекта безопасности продукта */
export interface SecurityFeatureCard {
  /** Путь до SVG-иконки */
  imgSrc: string;
  /** Alt-текст иконки */
  imgAlt: string;
  /** Заголовок карточки */
  title: string;
  /** Описание карточки */
  description: string;
  /** Тёмная цветовая схема карточки */
  isDark: boolean;
}
