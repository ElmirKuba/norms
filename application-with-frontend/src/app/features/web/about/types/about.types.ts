/** Карточка с описанием ключевой характеристики продукта */
export interface FeatureCard {
  /** Путь до SVG-иконки */
  imgSrc: string;
  /** Alt-текст иконки */
  imgAlt: string;
  /** Заголовок карточки */
  title: string;
  /** Описание карточки */
  description: string;
}
