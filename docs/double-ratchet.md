# Double Ratchet (Forward Secrecy) — план реализации

> **Статус:** отложено. В MVP отключено через одну строку в `chat-events.service.ts`. План полной реализации зафиксирован здесь.

## 1. Контекст

### Текущее состояние (2026-05-16)

- Все чаты используют **только начальный AES-256-GCM ключ K0**, выведенный из `ECDH P-256 + HKDF-SHA256(info='normisy-chat-key-v1')`.
- Double Ratchet **отключён** в [chat-events.service.ts](../application-with-frontend/src/app/core/services/chat/chat-events.service.ts):
  ```ts
  // В sendMessage:
  const ratchetPubKey: string | null = null;  // никогда не шлём ratchet pub
  ```
- Инфраструктура сохранена как dormant:
  - SQLite-таблица `chat_keys`: поля `my_ratchet_encrypted_priv_key`, `my_ratchet_priv_key_iv`, `my_ratchet_pub_key`, `peer_ratchet_pub_key`, `prev_encrypted_key`, `prev_key_iv` — продолжают записываться в `_handleChatKeyReady` и `_commitRatchet`, но не читаются для шифрования.
  - В `crypto.service.ts`: методы `deriveRatchetAesKey`, `parseRatchetPubKey`, `RATCHET_HKDF_PARAMS` остаются.
  - В `chat-events.service.ts`: методы `_advanceRatchet`, `_commitRatchet`, `_isPeerRatchetKeyNew` остаются (вызываются только если `peerRatchetPubKeyBase64 !== null` — а такой нет в blob).
- Blob-формат: flag-байт `0x00` (no ratchet) или `0x01` (has ratchet). Сейчас всегда шлём `0x00`.

### Почему MVP без FS допустим временно

- В CLAUDE.md явно: «Forward secrecy не в MVP».
- Без FS Е2Е всё равно работает: транзитный сервер сообщения не видит, ключи на нём не хранятся.
- **Что НЕ покрывается без FS:** компрометация устройства даёт расшифровку **всех прошлых сообщений** (потому что K0 не ротируется). Это критический недостаток для «безопасного мессенджера» — закрыть до бета-релиза.

## 2. Анатомия бага в первой попытке реализации

Тест: Android (creator) ↔ Electron (responder), `chatId=734932`. После `chat_key_ready` обе стороны вывели одинаковый K0 (fingerprint `UAN2qZLEDW0=`). Первое сообщение от Android расшифровывалось, ответ от Electron — нет.

Лог Electron (responder) после получения первого сообщения от Android:
```
[DECRYPT] AES-FP chatId=734932 fp=UAN2qZLEDW0=    ← K0, расшифровка ✓
[ENCRYPT] AES-FP chatId=734932 fp=fnvh2GnmfCk=    ← УЖЕ ДРУГОЙ ключ!
```

### Цепочка событий
1. Электрон расшифровал сообщение Android с K0 ✓.
2. В заголовке blob был `R_A_init_pub` (initial ratchet Android'а).
3. `_isPeerRatchetKeyNew(R_A_init_pub, ...)` → true (peer_ratchet_pub_key в БД был null).
4. `_advanceRatchet` вывел `K_BR = DH(R_B_init_priv, R_A_init_pub) → HKDF(info='normisy-ratchet-v1')`.
5. `_commitRatchet`: сгенерировал **новую** ratchet-пару `(R_B_new_priv, R_B_new_pub)`, записал её как `my_ratchet_*`, сохранил `K_BR` как `encrypted_key`, K0 — как `prev_encrypted_key`.
6. Кэш `_aesKeyCache` перезаписался на `K_BR`.
7. Electron шлёт ответ зашифрованный `K_BR`, в заголовок вкладывает `R_B_new_pub`.

Android получает:
- Текущий ключ K0 → fail (Electron зашифровал K_BR).
- DH-candidate = `DH(R_A_init_priv, R_B_new_pub)` ≠ `K_BR`, потому что `K_BR` выводился из `R_B_init`, а не `R_B_new`. fail.
- prev key — нет. fail.
- → `[не удалось расшифровать]`.

### Корень: смешение sending и receiving chains

В Signal Double Ratchet **sending chain key** и **receiving chain key** — это **разные ключи**, выводимые из **двух разных DH-шагов**:
- При получении нового peer pub: `(RK, CKr) = KDF(RK, DH(my_priv_current, peer_pub_new))` — для расшифровки.
- Сразу после: генерируем **новую** свою DH-пару, потом `(RK, CKs) = KDF(RK, DH(my_priv_new, peer_pub_new))` — для шифрования следующих сообщений.

Первая попытка реализации смешала всё в один ключ K и сделала только один DH-шаг — поэтому отправитель и получатель получали разные ключи на симметричных операциях.

## 3. Архитектура Signal Double Ratchet (для будущей реализации)

### Состояние стороны
- **RK** (Root Key, 32 байта) — главный ключ, ротируется на каждом DH-шаге.
- **CKs** (Sending Chain Key) — выводит message keys для исходящих, продвигается симметричным ratchet на каждое отправленное сообщение.
- **CKr** (Receiving Chain Key) — то же для входящих.
- **DHs** (my current ratchet pair) — приватный + публичный ключ.
- **DHr** (peer's current ratchet pub) — последний полученный.
- **Ns**, **Nr** (message numbers) — счётчики в текущих цепочках.
- **PN** (previous send chain length) — сколько было сообщений в предыдущей sending chain до DH-ratchet (нужно для skipped messages).
- **MKSKIPPED** — map `(DHr, N) → MK` для сообщений, пришедших не по порядку или из старой цепочки.

### Инициализация (после нашего ECDH-обмена)

Текущий код в `_handleChatKeyReady` выводит K0. Это будет **начальный RK**, не sending key:
```ts
// CREATOR (Alice):
RK = K0  // или RK = HKDF(K0, salt='', info='normisy-rk-init')
DHs = generateEcdhKeyPair()  // первая ratchet-пара
DHr = null                    // ещё не получили
CKs = null                    // выведется при отправке первого сообщения
CKr = null
Ns = Nr = PN = 0

// При первом sendMessage:
dh_out = DH(DHs.priv, peerStaticPub /* B_pub из chat_key_ready */)
(RK, CKs) = KDF_RK(RK, dh_out)
mk = KDF_CK(CKs)
header = { dh_pub: DHs.pub, pn: PN, n: Ns }
Ns += 1
encrypt(content, mk, header)
```

```ts
// RESPONDER (Bob), при получении первого сообщения от Alice:
DHr = header.dh_pub  // A_pub_0
dh_in = DH(DHs.priv /* B's initial */, DHr)
(RK, CKr) = KDF_RK(RK, dh_in)
mk = KDF_CK(CKr)
Nr += 1
decrypt(blob, mk)

// Сразу делаем DH ratchet шаг:
PN = Ns; Ns = 0; Nr = 0
DHs = generateEcdhKeyPair()  // новая пара
dh_out = DH(DHs.priv, DHr)
(RK, CKs) = KDF_RK(RK, dh_out)
```

### KDF-функции (HKDF-SHA256)

```ts
// Root key ratchet
function kdfRootKey(rk: Uint8Array, dhOut: Uint8Array): { rk: Uint8Array, ck: Uint8Array } {
  // HKDF(salt=rk, ikm=dhOut, info='normisy-rk-v1', L=64)
  // первые 32 байта = new RK, следующие 32 = new chain key
}

// Symmetric chain ratchet
function kdfChainKey(ck: Uint8Array): { ck: Uint8Array, mk: Uint8Array } {
  // HMAC-SHA256(ck, 0x01) = new ck
  // HMAC-SHA256(ck, 0x02) = message key
  // ИЛИ через HKDF: HKDF(salt=ck, ikm='', info='normisy-ck-v1', L=64)
}
```

Для WebCrypto-friendly реализации: HMAC через `crypto.subtle.sign('HMAC', ...)`. HKDF через `deriveBits`.

### Формат заголовка blob (новый)

Старый: `[flag:1][ratchet_pub:65, если flag=0x01][iv:12][ciphertext+tag]`.

Новый:
```
[flag:1 = 0x02]            // версия 2: full Double Ratchet
[dh_pub:65]                // P-256 uncompressed
[pn:4]                     // uint32 BE — prev chain length
[n:4]                      // uint32 BE — message number in current sending chain
[iv:12]
[ciphertext+tag]
```

Total header overhead: 1 + 65 + 4 + 4 + 12 = **86 байт**. Старый MVP-формат (`flag=0x00`): 13 байт. Прирост приемлемый.

Backward compat: `flag=0x00` — старый формат без ratchet (для существующих MVP-чатов), `flag=0x01` — старый «broken» формат (deprecated, можно отбросить), `flag=0x02` — новый. Получатель определяет по flag-байту.

## 4. План реализации

### 4.1. Crypto-слой (`crypto.service.ts`)

**Добавить:**
- `kdfRootKey(rk, dhOut): { newRk, ck }` — HKDF-SHA256, salt=rk, ikm=dhOut, info='normisy-rk-v1', L=64.
- `kdfChainKey(ck): { newCk, mk }` — два HMAC-SHA256(ck, 0x01) и HMAC-SHA256(ck, 0x02), или HKDF(salt=ck, info='normisy-ck-v1', L=64).
- `encryptWithMessageKey(content, mk, headerBytes)` — AES-256-GCM, AAD=headerBytes.
- `decryptWithMessageKey(blob, mk, headerBytes)` — то же.
- Helper для парсинга/сборки заголовка нового формата.

**Удалить (после миграции):**
- `deriveRatchetAesKey` — заменяется на `kdfChainKey + kdfRootKey`.
- `RATCHET_HKDF_PARAMS` — не нужен.
- `parseRatchetPubKey` (старый формат) — заменить на парсер нового заголовка.

**Сохранить как есть:**
- `deriveAesKey` — оставляем, но результат теперь = **RK** для нового Double Ratchet, а не finished AES.
- `wrapEcdhPrivateKey` / `unwrapEcdhPrivateKey` — нужны для хранения `DHs.priv`.
- `wrapAesKey` / `unwrapAesKey` — нужны для хранения CKs, CKr, RK, и skipped message keys (raw 32-байтные секреты обёрнутые мастер-ключом).

### 4.2. SQLite-схема `chat_keys`

**Удалить:**
- `encrypted_key`, `key_iv` (был K0 — теперь его роль играет RK)
- `prev_encrypted_key`, `prev_key_iv` (заменяется на MKSKIPPED-таблицу)

**Переименовать/добавить:**
- `root_key_encrypted` TEXT NOT NULL
- `root_key_iv` TEXT NOT NULL
- `send_chain_key_encrypted` TEXT (NULL если CKs ещё не выведен — до первой отправки)
- `send_chain_key_iv` TEXT
- `recv_chain_key_encrypted` TEXT (NULL аналогично)
- `recv_chain_key_iv` TEXT
- `dhs_encrypted_priv_key` TEXT NOT NULL (переименование `my_ratchet_encrypted_priv_key`)
- `dhs_priv_key_iv` TEXT NOT NULL
- `dhs_pub_key` TEXT NOT NULL
- `dhr_pub_key` TEXT (= peer's current ratchet pub, переименование `peer_ratchet_pub_key`)
- `send_msg_num` INTEGER NOT NULL DEFAULT 0
- `recv_msg_num` INTEGER NOT NULL DEFAULT 0
- `prev_send_chain_len` INTEGER NOT NULL DEFAULT 0

**Новая таблица `chat_skipped_keys`:**
```sql
CREATE TABLE chat_skipped_keys (
  chat_id            TEXT NOT NULL REFERENCES chat_keys(chat_id) ON DELETE CASCADE,
  dh_pub             TEXT NOT NULL,           -- peer's DH pub for that chain
  msg_num            INTEGER NOT NULL,
  message_key_encrypted TEXT NOT NULL,
  message_key_iv     TEXT NOT NULL,
  created_at         INTEGER NOT NULL,
  PRIMARY KEY (chat_id, dh_pub, msg_num)
);
CREATE INDEX idx_skipped_chat ON chat_skipped_keys(chat_id, created_at);
```

Лимит на skipped keys: **макс 1000 на чат**, TTL **30 дней** — старые удалять при каждом DH-шаге.

Файлы:
- Бэкенд миграцию НЕ трогаем (это локальная SQLite на устройстве).
- `local-db.service.ts` (Electron `electron/main.ts` + Capacitor SQLite) — обновить DDL.
- `local-chat.repository.ts` — обновить `RawChatKey`, `saveChatKey`, `getChatKey`, добавить `getSkippedKey`, `saveSkippedKey`, `deleteSkippedKey`, `gcSkippedKeys`.

### 4.3. Логика в `chat-events.service.ts`

**`_handleChatKeyReady` (creator):**
```ts
const sharedSecret = await deriveSharedBits(myPriv, peerPub);  // 32 байта
const RK = sharedSecret;  // или HKDF от него
const DHs = await generateEcdhKeyPair();
// Сразу делаем initial DH ratchet step для CKs:
const dhOut = await deriveSharedBits(DHs.priv, peerStaticPub);  // peerStaticPub = B_pub из chat_key_ready
const { newRk, ck } = kdfRootKey(RK, dhOut);
// сохраняем: rootKey=newRk, sendChainKey=ck, recvChainKey=null, dhs=DHs, dhr=null, ns=nr=pn=0
```

Wait — это для случая когда creator. Но Bob (responder) тоже должен инициализироваться. Логичнее: creator сразу запускает sending chain (он отправляет первым), responder ждёт первого сообщения для запуска receiving chain.

**Уточнённая схема (соответствие Signal):**
- **Creator (Alice)** делает «активный» init: после ECDH сразу выводит первый sending CK.
- **Responder (Bob)** делает «пассивный» init: после ECDH только сохраняет RK, ждёт первого сообщения от Alice для DH-step → CKr.

### 4.4. `sendMessage`

```ts
const state = await loadChatKeyState(chatId);
if (state.sendChainKey === null) {
  // Первая отправка после receive-step или после init responder'a — нужен DH-ratchet
  const dhOut = await deriveSharedBits(state.DHs.priv, state.DHr);
  ({ rootKey: state.rootKey, chainKey: state.sendChainKey } = kdfRootKey(state.rootKey, dhOut));
}
const { newCk, mk } = kdfChainKey(state.sendChainKey);
const header = { dh_pub: state.DHs.pubBase64, pn: state.prevSendChainLen, n: state.sendMsgNum };
const blob = encryptWithMessageKey(content, mk, header);
state.sendChainKey = newCk;
state.sendMsgNum += 1;
await persistState(state);
return wss.send('send_message', { chat_id, encrypted_blob: blob });
```

### 4.5. `_decryptIncoming`

```ts
const header = parseHeader(blob);
const state = await loadChatKeyState(chatId);

// 1. Сообщение из skipped keys?
const skipped = await getSkippedKey(chatId, header.dh_pub, header.n);
if (skipped !== null) {
  const mk = unwrapMessageKey(skipped);
  await deleteSkippedKey(chatId, header.dh_pub, header.n);
  return decryptWithMessageKey(blob, mk, header);
}

// 2. Новый DH-ключ от peer?
if (header.dh_pub !== state.DHr) {
  // Сохраняем все пропущенные сообщения из текущей recv chain
  await skipMessageKeys(state, header.pn);  // до header.pn включительно
  // DH ratchet step: receiving chain
  state.PN = state.sendMsgNum;
  state.sendMsgNum = 0;
  state.recvMsgNum = 0;
  state.DHr = header.dh_pub;
  let dhIn = await deriveSharedBits(state.DHs.priv, state.DHr);
  ({ rootKey: state.rootKey, chainKey: state.recvChainKey } = kdfRootKey(state.rootKey, dhIn));
  // DH ratchet step: sending chain (regenerate DHs)
  state.DHs = await generateEcdhKeyPair();
  dhIn = await deriveSharedBits(state.DHs.priv, state.DHr);
  ({ rootKey: state.rootKey, chainKey: state.sendChainKey } = kdfRootKey(state.rootKey, dhIn));
}

// 3. Сообщение из текущей recv chain, но пропущены предыдущие?
await skipMessageKeys(state, header.n);  // сохранить mk_keys для пропущенных n

// 4. Расшифровка текущего
const { newCk, mk } = kdfChainKey(state.recvChainKey);
state.recvChainKey = newCk;
state.recvMsgNum = header.n + 1;
await persistState(state);
return decryptWithMessageKey(blob, mk, header);
```

`skipMessageKeys`:
```ts
async function skipMessageKeys(state, until) {
  // Сохраняем mk для всех (recvMsgNum .. until-1) в chat_skipped_keys
  while (state.recvMsgNum < until) {
    const { newCk, mk } = kdfChainKey(state.recvChainKey);
    await saveSkippedKey(chatId, state.DHr, state.recvMsgNum, wrap(mk, masterKey));
    state.recvChainKey = newCk;
    state.recvMsgNum += 1;
  }
}
```

### 4.6. Идемпотентность и race conditions

- `_handleChatKeyRequest` — добавить проверку: если для chatId уже есть запись с `dhs_encrypted_priv_key !== null` (т.е. ratchet-пара уже сгенерирована), не перегенерировать. Закрывает баг с дублирующими `chat_key_request` при реконнекте WSS.
- `_handleChatKeyReady` — уже идемпотентен через проверку `encryptedPrivKey === null`.
- Все обновления state в `_decryptIncoming` и `sendMessage` должны быть атомарны — желательно в одной SQLite транзакции (через `_db.transaction(() => {...})` хук).

## 5. Что переиспользовать из текущего кода

| Текущий код | Статус после переделки |
|---|---|
| `generateEcdhKeyPair`, `exportPublicKey`, `importPublicKey` | Оставить как есть |
| `wrapEcdhPrivateKey` / `unwrapEcdhPrivateKey` | Оставить (для DHs.priv) |
| `wrapAesKey` / `unwrapAesKey` | Оставить (для wrap всех ключей: RK, CKs, CKr, MKs в skipped) |
| `encryptMessage` / `decryptMessage` | **Переписать** — новый формат заголовка + AAD = header bytes |
| `deriveAesKey` | Оставить, но результат стал **RK** (initial root key), не finished AES |
| `deriveRatchetAesKey`, `parseRatchetPubKey`, `RATCHET_HKDF_PARAMS` | **Удалить** |
| `_advanceRatchet`, `_commitRatchet`, `_isPeerRatchetKeyNew` | **Удалить**, переписать через новую state-машину |
| `prev_encrypted_key`, `prev_key_iv` в SQLite | **Удалить**, заменить на `chat_skipped_keys` |
| `my_ratchet_*`, `peer_ratchet_pub_key` | **Переименовать** в `dhs_*`, `dhr_pub_key` (логика та же) |

## 6. Тест-кейсы

Обязательные:
1. **Симметричный обмен.** Alice ↔ Bob, по одному сообщению в каждую сторону → оба расшифровываются.
2. **Подряд от одной стороны.** Alice → Bob: 5 сообщений подряд без ответа → все расшифровываются (sending chain ratchet).
3. **Out-of-order.** Alice шлёт msg1, msg2, msg3 → Bob получает в порядке msg2, msg1, msg3 → все расшифровываются (skipped keys).
4. **DH ratchet step.** Alice → Bob (1 msg), Bob → Alice (1 msg), Alice → Bob (1 msg) — между шагами должны меняться `RK`, `DHs`, `DHr`.
5. **Out-of-order через DH-step.** Alice msg1 → Bob, Bob msg2 → Alice, но Alice получает msg2 ПЕРЕД своим следующим отправлением — Bob's msg2 расшифровывается, и Alice's следующий send делает новый DH-step.
6. **Пропущенное сообщение → recovery.** Alice msg1 теряется, Alice msg2 приходит → Bob сохраняет mk1 в skipped → если msg1 придёт позже (повтор), он расшифруется через skipped.
7. **Лимит skipped.** Bob накапливает > 1000 skipped → старые удаляются.
8. **Forward secrecy.** После N-го DH-step нельзя расшифровать сообщения N-1-го шага даже зная текущий state (проверяется выдачей экспортного `rk`, `ck` и попыткой расшифровки старого blob).
9. **Кросс-платформа.** Alice=iOS, Bob=Android, Charlie=Electron — все попарные комбинации работают (HMAC-SHA256 и P-256 deriveBits должны давать байт-в-байт одинаковый результат).
10. **Reconnect resilience.** WSS падает между sendMessage и receive — после реконнекта непросмотренные сообщения корректно вытягиваются через `findPendingMessagesForSession` и расшифровываются (state в SQLite корректен).

Регрессионные:
- Старые MVP-чаты (`flag=0x00`) продолжают работать пока не пройдёт первый DH-ratchet step (обратная совместимость на чтение).
- При первом DH-step на старом чате — миграция state: текущий `encrypted_key` становится RK, генерируем DHs, очищаем prev_*.

## 7. Миграция существующих чатов

После релиза:
- Старые `chat_keys` имеют только `encrypted_key`, `my_ratchet_*`.
- Первая отправка/приём после релиза:
  - Если blob flag=0x00 (старый формат) — расшифровать старым путём, не обновлять state.
  - Если blob flag=0x02 (новый формат) — нужен полный state. При первой встрече: вывести RK из существующего AES-ключа (или из ECDH ещё раз?), сгенерировать DHs, запустить полный Double Ratchet.
- Альтернатива: **«мягкая миграция»** — при логине после релиза показать пользователю «обновляем шифрование» и заставить каждый чат пройти chat_key_renegotiation (новый WSS-event + новый ECDH-обмен). Это сложнее, но чище.

Решение по миграции принять при подходе к реализации — зависит от того, насколько много чатов будет к моменту релиза этой фичи.

## 8. Acceptance criteria

Считать «Forward secrecy в MVP» закрытой задачей когда:
1. Все 10 тест-кейсов из раздела 6 проходят на трёх платформах (Electron + iOS + Android).
2. Static analyzer без warnings (lint, tsc strict).
3. Документация в [encryption.md](encryption.md) обновлена (полное описание Double Ratchet, его роль, гарантии).
4. CLAUDE.md обновлён: «Forward secrecy включён» вместо «не в MVP».
5. Performance: send/receive не превышают 50ms p99 на iPhone 12 (baseline сейчас ~5ms — пока AES без ratchet).
6. Размер blob увеличился на ~73 байта на сообщение (1+65+4+4 - 1 = +73) — приемлемо.
7. Skipped key store не растёт без ограничений (тест #7).

## 9. Что НЕ делать в этой задаче (out of scope)

- **Multi-device sync.** Сообщения не синхронизируются между моими устройствами — это per-device модель (см. [devices-and-chats.md](devices-and-chats.md)). Double Ratchet работает строго между двумя сессиями.
- **Group chats.** MVP — только 1-на-1, групп нет.
- **PQ resistance.** Quantum-safe ratchet (Signal PQXDH) — далеко future.
- **Sealed sender.** Метаданные отправителя — отдельная фича.
- **Header encryption.** Шифрование заголовка (HE-вариант Double Ratchet) — оптимизация, не критично.

## 10. Ссылки

- [Signal Double Ratchet specification](https://signal.org/docs/specifications/doubleratchet/)
- [Signal X3DH specification](https://signal.org/docs/specifications/x3dh/) — наш текущий ECDH-обмен это упрощённый аналог.
- [encryption.md](encryption.md) — текущее состояние E2E в проекте.
- [Текущий broken code](../application-with-frontend/src/app/core/services/chat/chat-events.service.ts) — отправная точка.
