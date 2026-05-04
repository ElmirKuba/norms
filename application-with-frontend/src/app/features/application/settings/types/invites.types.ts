/** Активный инвайт-код */
export interface MockInviteCode {
  /** Уникальный идентификатор кода */
  readonly id: string;
  /** Строка инвайт-кода (формат: XXXX-XXXX-XX) */
  readonly code: string;
  /** Дата истечения */
  readonly expiresAt: string;
}

/** Приглашённый пользователь */
export interface MockInvitedUser {
  /** Уникальный идентификатор */
  readonly id: string;
  /** Имя пользователя */
  readonly name: string;
  /** UIN пользователя */
  readonly uin: string;
  /** Инициалы для аватара */
  readonly initials: string;
  /** Цвет аватара */
  readonly avatarColor: string;
  /** Дата приглашения */
  readonly invitedAt: string;
}

/** Мок: активные инвайт-коды */
export const MOCK_INVITE_CODES: MockInviteCode[] = [
  {
    id: '0195f3d0-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000400000',
    code: '3847-5029-61',
    expiresAt: '15 мая 2025',
  },
  {
    id: '0195f3d0-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000401000',
    code: '7261-0384-92',
    expiresAt: '20 мая 2025',
  },
];

/** Мок: приглашённые пользователи */
export const MOCK_INVITED_USERS: MockInvitedUser[] = [
  {
    id: '0195f3d1-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000500000',
    name: 'Дмитрий Н.',
    uin: '33190',
    initials: 'ДН',
    avatarColor: '#45B7D1',
    invitedAt: '12 апр 2025',
  },
];
