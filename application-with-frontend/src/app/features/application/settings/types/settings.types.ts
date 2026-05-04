/** Активное устройство/сессия */
export interface MockDevice {
  /** Уникальный идентификатор устройства */
  readonly id: string;
  /** Название устройства (прозвище или системное) */
  readonly name: string;
  /** Платформа устройства */
  readonly platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux';
  /** Время последней активности */
  readonly lastSeen: string;
  /** Является ли текущим устройством */
  readonly isCurrent: boolean;
}

/** Preset-вопрос восстановления доступа */
export interface RecoveryPresetQuestion {
  /** Уникальный идентификатор вопроса */
  readonly id: string;
  /** Текст вопроса */
  readonly text: string;
}

/** Настроенная Q&A пара */
export interface MockRecoveryQA {
  /** Уникальный идентификатор */
  readonly id: string;
  /** Текст вопроса */
  readonly question: string;
  /** Дата создания */
  readonly createdAt: string;
}

/** Мок-список устройств */
export const MOCK_DEVICES: MockDevice[] = [
  {
    id: '0195f3c0-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000200000',
    name: 'iPhone 15 Pro',
    platform: 'ios',
    lastSeen: 'сейчас',
    isCurrent: true,
  },
  {
    id: '0195f3c0-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000201000',
    name: 'MacBook Pro',
    platform: 'macos',
    lastSeen: '2 часа назад',
    isCurrent: false,
  },
  {
    id: '0195f3c0-3c4d-7e5f-a06b-2c3d4e5f6a7b_1746000202000',
    name: 'Windows PC',
    platform: 'windows',
    lastSeen: 'вчера',
    isCurrent: false,
  },
];

/** Мок-список preset-вопросов */
export const RECOVERY_PRESET_QUESTIONS: RecoveryPresetQuestion[] = [
  { id: 'q1', text: 'Девичья фамилия матери' },
  { id: 'q2', text: 'Кличка первого питомца' },
  { id: 'q3', text: 'Город рождения отца' },
  { id: 'q4', text: 'Название любимой книги в детстве' },
  { id: 'q5', text: 'Имя лучшего друга в школе' },
  { id: 'q6', text: 'Название первой школы' },
];

/** Мок-список настроенных Q&A */
export const MOCK_RECOVERY_QA: MockRecoveryQA[] = [
  {
    id: '0195f3c1-1a2b-7c3d-8e4f-0a1b2c3d4e5f_1746000300000',
    question: 'Кличка первого питомца',
    createdAt: '12 апр 2025',
  },
  {
    id: '0195f3c1-2b3c-7d4e-9f5a-1b2c3d4e5f6a_1746000301000',
    question: 'Город рождения отца',
    createdAt: '12 апр 2025',
  },
];
