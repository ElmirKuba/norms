/** Элемент списка чатов */
export interface MockChat {
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
  readonly lastMessage: string;
  readonly time: string;
  readonly unread: number;
  readonly initials: string;
  readonly avatarColor: string;
  /** Ключ ещё не обменян — чат только что создан */
  readonly pendingKey?: boolean;
}

/** Статус сообщения */
export type MessageStatus = 'pending_key' | 'sent' | 'delivered' | 'read' | 'failed';

/** Сообщение в чате */
export interface MockMessage {
  readonly id: string;
  readonly text: string;
  readonly time: string;
  readonly isOwn: boolean;
  readonly status: MessageStatus;
}

/** Мок-список чатов */
export const MOCK_CHATS: MockChat[] = [
  {
    id: '0195f3a2-1b4c-7e2d-9f1a-3c8b0d4e5f6a_1746000000000',
    name: 'Алексей К.',
    uin: '10042',
    username: 'alex_k',
    deviceLabel: 'iPhone 15 Pro',
    chatName: 'Поход в кино',
    lastMessage: 'Привет! Как дела?',
    time: '14:32',
    unread: 2,
    initials: 'АК',
    avatarColor: '#FF6B6B',
  },
  {
    id: '0195f3a2-2c5d-7f3e-a02b-4d9c1e5f6a7b_1746000001000',
    name: 'Мария В.',
    uin: '20817',
    deviceLabel: 'Samsung Galaxy S24',
    chatName: 'Рабочие вопросы',
    lastMessage: 'Увидимся завтра',
    time: 'вчера',
    unread: 0,
    initials: 'МВ',
    avatarColor: '#4ECDC4',
  },
  {
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
    id: '0195f3a2-4e7f-7b50-c24d-6f1e3a7b8c9d_1746000003000',
    name: 'Анна С.',
    uin: '44561',
    deviceLabel: 'Pixel 8',
    chatName: 'Проект',
    lastMessage: 'Жду ответа...',
    time: 'только что',
    unread: 0,
    initials: 'АС',
    avatarColor: '#A855F7',
    pendingKey: true,
  },
];

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
};
