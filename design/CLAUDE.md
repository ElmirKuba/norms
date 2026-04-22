# CLAUDE.md — Design

Это `CLAUDE.md` папки `design/` проекта **Нормисы**.

Родительский `CLAUDE.md` с описанием всего проекта находится на уровень выше:
[`../CLAUDE.md`](../CLAUDE.md) — там контекст по архитектуре, tech stack, целях и философии проекта.
Если есть вопросы по проекту в целом — читай его.

---

## Обзор
Дизайн-файлы мессенджера **Нормисы** — кросс-платформенного E2E-шифрованного мессенджера.
Папка: `~/coding/norms/design/`
Инструмент: **Pencil** (`.pen` файлы, редактируются только через Pencil MCP).

## Файлы
- `norms.pen` — основной дизайн-файл

## Платформы
- **Мобилка** (iOS / Android) — основной UI
- **Десктоп** (Windows / macOS / Linux) — адаптация
- **Лендинг** (браузер) — только страница с ссылками на скачивание, без функционала приложения

## Дизайн-токены
- **Основной текст:** `#1A1A1A`
- **Вторичный текст:** `#8E8E93`
- **Бренд / акцент:** `#582CFF` (фиолетовый)
- **Светло-фиолетовый фон:** `#F0EBFF`
- **Серый фон экрана:** `#F5F5F7`
- **Разделители / бордеры:** `#E0E0E0` / `#F0F0F0`
- **Красный (ошибки, опасные действия):** `#FF3B30`
- **Оранжевый (предупреждения):** `#FF9500`
- **Шрифт:** Inter

## Компоненты (reusable, используй через `ref`)
| ID | Название | Что это |
|---|---|---|
| `ZpYN4` | Component/Input | Поле ввода с плейсхолдером |
| `iqdGP` | Component/Button/Primary | Основная кнопка (фиолетовая) |
| `5Pfuc` | Component/BottomNav | Нижняя навигация (Чаты / Настройки) |
| `WklIA` | Component/ChatItem | Элемент списка чатов |

---

## Экраны по фичам (`norms.pen`)

Чтобы посмотреть экран: `batch_get(["NODE_ID"])` или `get_screenshot("NODE_ID")`.

### Лендинг
| ID | Экран | Фича / doc |
|---|---|---|
| `lDpSn` | Landing | Главная страница сайта |
| `eM77T` | О проекте | Страница "О проекте" |
| `1sp1y` | Безопасность | Страница "Безопасность" |

### Онбординг / Авторизация
| ID | Экран | Фича / doc |
|---|---|---|
| `1i81t` | Welcome | Стартовый экран (Войти / Зарегистрироваться) |
| `rZeHG` | Reg — Invite Code | Ввод инвайт-кода → `docs/invites.md` |
| `jy0Ao` | Reg — Create Account | Создание аккаунта (пароль) → `docs/identity.md` |
| `lIRWk` | Login | Вход по UIN/username + пароль + "Забыли пароль?" |
| `Oa6Fb` | UIN Pending | Ожидание присвоения UIN → `docs/identity.md` |
| `k2sb4` | UIN Assigned | UIN присвоен, показываем номер → `docs/identity.md` |

### Recovery (восстановление доступа)
| ID | Экран | Фича / doc |
|---|---|---|
| `YH1Ct` | Recovery — Введите UIN | Шаг 1: ввод UIN → `docs/recovery.md` |
| `Ukwhp` | Recovery — Выберите вопрос | Шаг 2: выбор секретного вопроса |
| `aZA6c` | Recovery — Ответьте на вопрос | Шаг 3: ввод ответа |
| `YKpXD` | Recovery — Новый пароль | Шаг 4: новый пароль |

### Чаты
| ID | Экран | Фича / doc |
|---|---|---|
| `KJwi2` | Chats — Empty | Список чатов пустой (новый аккаунт) |
| `vvu7S` | Chats — List | Список чатов с собеседниками |
| `hOooS` | Chat Conversation | Открытый чат, статусы сообщений (✓ ✓✓ ✓✓🟣) → `docs/message-statuses.md` |
| `41fWL` | Chat — Pending Key | Чат: ключ ещё не обменян → `docs/encryption.md` |
| `2PVZr` | Chat — Failed Message | Чат: сообщение не отправлено, кнопка "Повторить" → `docs/message-statuses.md` |
| `c1ClV` | Create Chat Modal | Модалка создания чата (выбор устройства) → `docs/encryption.md` |

### Мульти-девайс / Onboarding
| ID | Экран | Фича / doc |
|---|---|---|
| `VteWg` | Orphan Peers | Список "осиротевших" собеседников на новом устройстве → `docs/devices-and-chats.md` |
| `pqEvY` | First Chat Modal | Onboarding-модалка при создании первого чата (объяснение модели) → `docs/devices-and-chats.md` |

### Поиск и профиль
| ID | Экран | Фича / doc |
|---|---|---|
| `DfkQd` | Search | Глобальный поиск по UIN / username → `docs/identity.md` |
| `Sm102` | User Profile | Профиль пользователя + кнопка "Начать чат" |

### Настройки
| ID | Экран | Фича / doc |
|---|---|---|
| `BDWzl` | Settings | Главный экран настроек |
| `LeGvW` | Settings — Change Password | Смена пароля → `docs/auth-devices.md` |
| `0JMVj` | Settings — Devices | Список устройств / сессий → `docs/auth-devices.md` |
| `5G6Lj` | Settings — Invites | Инвайты: остаток, создать, список → `docs/invites.md` |
| `P3bn2` | Settings — Recovery | Секретные вопросы: список, добавить, удалить → `docs/recovery.md` |
| `Y0zPY` | Settings — Privacy | Приватность (MVP: всё открыто) → `docs/privacy.md` |

### Модалки поверх настроек
| ID | Экран | Фича / doc |
|---|---|---|
| `jw1Fc` | Kick Device Confirmation | Подтверждение кика устройства → `docs/auth-devices.md` |
| `4njd6` | Device Rename | Переименование устройства (прозвище) → `docs/auth-devices.md` |
| `IK5Jd` | Add Recovery Question | Добавить секретный вопрос + ответ → `docs/recovery.md` |
| `DtzMs` | Create Invite — Success | Инвайт создан: код + скопировать → `docs/invites.md` |

### WSS-события (системные состояния)
| ID | Экран | Фича / doc |
|---|---|---|
| `fNQiR` | Session Kicked | Модалка при кике сессии (`session_kicked` WSS) → `docs/auth-devices.md` |
| `clgAm` | Password Reset Banner | Баннер при сбросе пароля через recovery (`password_reset_via_recovery` WSS) → `docs/recovery.md` |

---

## Разрешения
- Claude может свободно создавать и редактировать любые файлы в `~/coding/norms/design/`
- При создании новых файлов — добавлять запись о них в этот CLAUDE.md
- `.pen` файлы редактировать **только** через Pencil MCP инструменты (не Read/Grep/Write)
- `CLAUDE.md` в папке design — можно обновлять свободно для сохранения контекста между сессиями
- При добавлении новых экранов — добавлять их в таблицу выше
