/** Устройство пользователя (для выбора при создании чата) */
export interface MockUserDevice {
  readonly deviceId: string;
  readonly label: string;
}

/** Результат поиска пользователя */
export interface MockSearchUser {
  readonly id: string;
  readonly name: string;
  readonly uin: string;
  readonly initials: string;
  readonly avatarColor: string;
  /** Устройства пользователя */
  readonly devices: readonly MockUserDevice[];
}

/** Мок-пользователи для поиска */
export const MOCK_SEARCH_USERS: MockSearchUser[] = [
  {
    id: '0195f3b0-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000100000',
    name: 'Алексей К.',
    uin: '10042',
    initials: 'АК',
    avatarColor: '#FF6B6B',
    devices: [
      { deviceId: '0195f3c0-1111-7000-a000-000000000001_1746000200000', label: 'iPhone 15 Pro' },
      { deviceId: '0195f3c0-1111-7000-a000-000000000002_1746000200001', label: 'MacBook Air M3' },
    ],
  },
  {
    id: '0195f3b0-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000101000',
    name: 'Мария В.',
    uin: '20817',
    initials: 'МВ',
    avatarColor: '#4ECDC4',
    devices: [
      { deviceId: '0195f3c0-2222-7000-b000-000000000001_1746000201000', label: 'Samsung Galaxy S24' },
    ],
  },
  {
    id: '0195f3b0-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000102000',
    name: 'Дмитрий Н.',
    uin: '33190',
    initials: 'ДН',
    avatarColor: '#45B7D1',
    devices: [
      { deviceId: '0195f3c0-3333-7000-c000-000000000001_1746000202000', label: 'iPhone 14' },
      { deviceId: '0195f3c0-3333-7000-c000-000000000002_1746000202001', label: 'Windows PC' },
    ],
  },
  {
    id: '0195f3b0-4d5e-7f6a-b17c-3d4e5f6a7b8c_1746000103000',
    name: 'Анна С.',
    uin: '44561',
    initials: 'АС',
    avatarColor: '#A855F7',
    devices: [
      { deviceId: '0195f3c0-4444-7000-d000-000000000001_1746000203000', label: 'Pixel 8' },
    ],
  },
];
