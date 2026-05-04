/** Осиротевший собеседник — аккаунт, с которым были чаты с других устройств */
export interface MockOrphanPeer {
  /** Уникальный идентификатор аккаунта */
  readonly id: string;
  /** Имя пользователя */
  readonly name: string;
  /** UIN пользователя */
  readonly uin: string;
  /** Инициалы для аватара */
  readonly initials: string;
  /** Цвет аватара */
  readonly avatarColor: string;
  /** Когда последний раз общались */
  readonly lastChatAt: string;
}

/** Мок-список осиротевших собеседников */
export const MOCK_ORPHAN_PEERS: MockOrphanPeer[] = [
  {
    id: '0195f3b0-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000100000',
    name: 'Алексей К.',
    uin: '10042',
    initials: 'АК',
    avatarColor: '#FF6B6B',
    lastChatAt: '3 дня назад',
  },
  {
    id: '0195f3b0-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000101000',
    name: 'Мария В.',
    uin: '20817',
    initials: 'МВ',
    avatarColor: '#4ECDC4',
    lastChatAt: 'неделю назад',
  },
  {
    id: '0195f3b0-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000102000',
    name: 'Дмитрий Н.',
    uin: '33190',
    initials: 'ДН',
    avatarColor: '#45B7D1',
    lastChatAt: '2 недели назад',
  },
];
