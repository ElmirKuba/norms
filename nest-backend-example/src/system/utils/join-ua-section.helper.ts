/** Склейка значений UA-секции в строку без пустых хвостов от undefined */
export const joinUaSection = (section: object | undefined): string =>
  Object.values(section ?? {})
    .filter(
      (value): value is string =>
        typeof value === 'string' && value.length > 0,
    )
    .join(' ');
