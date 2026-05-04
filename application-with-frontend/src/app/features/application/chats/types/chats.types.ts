/** Элемент списка чатов */
export interface MockChat {
  /** Уникальный идентификатор чата */
  readonly id: string;
  /** Имя контакта (аккаунт) */
  readonly name: string;
  /** UIN контакта */
  readonly uin: string;
  /** Username контакта (опционально) */
  readonly username?: string;
  /** Устройство собеседника (прозвище) */
  readonly deviceLabel: string;
  /** Название чата (тема, задаётся при создании) */
  readonly chatName: string;
  /** Последнее сообщение */
  readonly lastMessage: string;
  /** Время последнего сообщения */
  readonly time: string;
  /** Количество непрочитанных */
  readonly unread: number;
  /** Инициалы для аватара */
  readonly initials: string;
  /** Цвет аватара */
  readonly avatarColor: string;
  /** Ключ ещё не обменян — чат только что создан */
  readonly pendingKey?: boolean;
}

/** Статус сообщения */
export type MessageStatus = 'pending_key' | 'sent' | 'delivered' | 'read' | 'failed';

/** Сообщение в чате */
export interface MockMessage {
  /** Уникальный идентификатор сообщения */
  readonly id: string;
  /** Текст сообщения */
  readonly text: string;
  /** Время отправки */
  readonly time: string;
  /** Является ли сообщение нашим */
  readonly isOwn: boolean;
  /** Статус доставки */
  readonly status: MessageStatus;
}

/** Мок-список чатов */
export const MOCK_CHATS: MockChat[] = [
  {
    // Алексей — его кастомный псевдоним своего iPhone («Айфон Лёши»)
    id: '0195f3a2-1b4c-7e2d-9f1a-3c8b0d4e5f6a_1746000000000',
    name: 'Алексей К.',
    uin: '10042',
    username: 'alex_k',
    deviceLabel: 'Айфон Лёши',
    chatName: 'Поход в кино',
    lastMessage: 'Завтра в 19:30, норм?',
    time: '14:32',
    unread: 2,
    initials: 'АК',
    avatarColor: '#FF6B6B',
  },
  {
    // Алексей — второй чат, другое его устройство, официальное название
    id: '0195f3a2-1b4c-7e2d-9f1a-3c8b0d4e5f6b_1746000000500',
    name: 'Алексей К.',
    uin: '10042',
    username: 'alex_k',
    deviceLabel: 'MacBook Air M3',
    chatName: 'Работа',
    lastMessage: 'Пришли доку в пятницу',
    time: '11:05',
    unread: 0,
    initials: 'АК',
    avatarColor: '#FF6B6B',
  },
  {
    // Мария — я сам дал локальный псевдоним её устройству («Рабочий Маши»)
    id: '0195f3a2-2c5d-7f3e-a02b-4d9c1e5f6a7b_1746000001000',
    name: 'Мария В.',
    uin: '20817',
    deviceLabel: 'Рабочий Маши',
    chatName: 'Проект Q2',
    lastMessage: 'Увидимся в понедельник',
    time: 'вчера',
    unread: 0,
    initials: 'МВ',
    avatarColor: '#4ECDC4',
  },
  {
    // Мария — второй чат с её личным телефоном, официальное название
    id: '0195f3a2-2c5d-7f3e-a02b-4d9c1e5f6a7c_1746000001500',
    name: 'Мария В.',
    uin: '20817',
    deviceLabel: 'Samsung Galaxy S24',
    chatName: 'Личное',
    lastMessage: '😄',
    time: 'пн',
    unread: 1,
    initials: 'МВ',
    avatarColor: '#4ECDC4',
  },
  {
    // Дмитрий — официальное название, оба предпочитают без псевдонимов
    id: '0195f3a2-3d6e-7a4f-b13c-5e0d2f6a7b8c_1746000002000',
    name: 'Дмитрий Н.',
    uin: '33190',
    deviceLabel: 'iPhone 14',
    chatName: 'Конференция',
    lastMessage: 'Не отправлено',
    time: '10:15',
    unread: 0,
    initials: 'ДН',
    avatarColor: '#45B7D1',
  },
  {
    // Анна — она назвала своё устройство «Пиксель Ани», ключ ещё не обменян
    id: '0195f3a2-4e7f-7b50-c24d-6f1e3a7b8c9d_1746000003000',
    name: 'Анна С.',
    uin: '44561',
    deviceLabel: 'Пиксель Ани',
    chatName: 'Дизайн',
    lastMessage: 'Жду ответа...',
    time: 'только что',
    unread: 0,
    initials: 'АС',
    avatarColor: '#A855F7',
    pendingKey: true,
  },
  {
    // Вадим — он сам назвал своё устройство «Мой iPad mini», мы видим как есть
    id: '0195f3a2-5f8a-7c61-d35e-7a2f4b8c9d0e_1746000004000',
    name: 'Вадим Р.',
    uin: '57823',
    deviceLabel: 'Мой iPad mini',
    chatName: 'Выходные',
    lastMessage: 'Едем в субботу?',
    time: 'вт',
    unread: 3,
    initials: 'ВР',
    avatarColor: '#F97316',
  },
];

/* eslint-disable @typescript-eslint/naming-convention */
/** Мок-сообщения по chat id */
export const MOCK_MESSAGES: Record<string, MockMessage[]> = {
  '0195f3a2-1b4c-7e2d-9f1a-3c8b0d4e5f6a_1746000000000': [
    { id: '0195f3a3-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000010000', text: 'Привет!', time: '14:30', isOwn: false, status: 'read' },
    { id: '0195f3a3-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000011000', text: 'Привет! Как дела?', time: '14:31', isOwn: true, status: 'read' },
    { id: '0195f3a3-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000012000', text: 'Всё хорошо, спасибо! А у тебя?', time: '14:32', isOwn: false, status: 'read' },
    { id: '0195f3a3-4d5e-7f6a-b17c-3d4e5f6a7b8c_1746000013000', text: 'Тоже норм, работаю над проектом', time: '14:33', isOwn: true, status: 'delivered' },
  ],
  '0195f3a2-2c5d-7f3e-a02b-4d9c1e5f6a7b_1746000001000': [
    { id: '0195f3a4-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000020000', text: 'Ты завтра свободна?', time: 'вчера', isOwn: true, status: 'read' },
    { id: '0195f3a4-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000021000', text: 'Да, буду', time: 'вчера', isOwn: false, status: 'read' },
    { id: '0195f3a4-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000022000', text: 'Увидимся завтра', time: 'вчера', isOwn: false, status: 'read' },
  ],
  '0195f3a2-3d6e-7a4f-b13c-5e0d2f6a7b8c_1746000002000': [
    { id: '0195f3a5-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000030000', text: 'Встреча в 15:00?', time: 'вчера', isOwn: true, status: 'read' },
    { id: '0195f3a5-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000031000', text: 'Окей, договорились', time: 'вчера', isOwn: false, status: 'read' },
    { id: '0195f3a5-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000032000', text: 'Увидимся на конференции', time: '10:14', isOwn: true, status: 'read' },
    { id: '0195f3a5-4d5e-7f6a-b17c-3d4e5f6a7b8c_1746000033000', text: 'Не отправлено', time: '10:15', isOwn: true, status: 'failed' },
  ],
  '0195f3a2-4e7f-7b50-c24d-6f1e3a7b8c9d_1746000003000': [
    { id: '0195f3a6-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000040000', text: 'Привет! Жду ответа...', time: 'только что', isOwn: true, status: 'pending_key' },
  ],
  // Алексей К. — MacBook Air M3, чат «Работа»
  '0195f3a2-1b4c-7e2d-9f1a-3c8b0d4e5f6b_1746000000500': [
    { id: '0195f3b1-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000050000', text: 'Привет, пришли доку по API до пятницы', time: '10:55', isOwn: false, status: 'read' },
    { id: '0195f3b1-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000051000', text: 'Окей, пришлю в четверг вечером', time: '11:02', isOwn: true, status: 'read' },
    { id: '0195f3b1-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000052000', text: 'Пришли доку в пятницу', time: '11:05', isOwn: false, status: 'delivered' },
  ],
  // Мария В. — Samsung Galaxy S24, чат «Личное»
  '0195f3a2-2c5d-7f3e-a02b-4d9c1e5f6a7c_1746000001500': [
    { id: '0195f3b2-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000060000', text: 'Как дела вообще?', time: 'пн', isOwn: false, status: 'read' },
    { id: '0195f3b2-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000061000', text: 'Норм, загружен проектом', time: 'пн', isOwn: true, status: 'read' },
    { id: '0195f3b2-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000062000', text: '😄', time: 'пн', isOwn: false, status: 'read' },
  ],
  // Вадим Р. — «Мой iPad mini» (он сам дал имя), чат «Выходные»
  '0195f3a2-5f8a-7c61-d35e-7a2f4b8c9d0e_1746000004000': [
    { id: '0195f3b3-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000070000', text: 'Привет! На выходных что делаешь?', time: 'вт', isOwn: false, status: 'read' },
    { id: '0195f3b3-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000071000', text: 'Пока не решил. Варианты есть?', time: 'вт', isOwn: true, status: 'read' },
    { id: '0195f3b3-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000072000', text: 'Хотим выехать за город, есть место', time: 'вт', isOwn: false, status: 'read' },
    { id: '0195f3b3-4d5e-7f6a-b17c-3d4e5f6a7b8c_1746000073000', text: 'Едем в субботу?', time: 'вт', isOwn: false, status: 'delivered' },
  ],
};
/* eslint-enable @typescript-eslint/naming-convention */
