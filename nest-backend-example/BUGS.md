# BUGS

## Backend

Полный аудит `nest-backend/src` (16.04.2026).

---

### 🟡 Средние

4. **CORS `origin: '*'` + `credentials: true` — сломанная комбинация**

   - Файл: [`nest-backend/src/main.ts:75-79`](nest-backend/src/main.ts#L75-L79)
   - Браузеры отклоняют credentialed CORS-запросы с wildcard origin. Cookie-авторизация НЕ работает из фронтенда.
   - Решение: указать конкретные origins (например `http://localhost:4200`) или сделать динамический allowlist.


6. **`accountId as string` без null-проверки в контроллерах**

   - Файлы: [`delete.controller.ts:72,77`](nest-backend/src/api-endpoints/session/delete/delete.controller.ts#L72), [`read.controller.ts:64`](nest-backend/src/api-endpoints/session/read/read.controller.ts#L64), [`delete.controller.ts:129`](nest-backend/src/api-endpoints/session/delete/delete.controller.ts#L129)
   - `req.authData?.accountDto.id` кастуется `as string`. Если authData окажется null (теоретически невозможно после guard, но guard проверяет token, не payload), то `undefined` уйдёт как строка `"undefined"`.
   - Решение: добавить раннюю проверку `if (!req.authData) throw new UnauthorizedException()`.

7. **Последовательное удаление сессий в `clearOthers`**

   - Файл: [`nest-backend/src/managers-level/session/delete/delete.manager.service.ts:126-158`](nest-backend/src/managers-level/session/delete/delete.manager.service.ts#L126-L158)
   - Сессии удаляются одна за одной через `await` в цикле `for`. При 10+ сессиях — 10+ последовательных запросов в БД.
   - Решение: `Promise.all` или один SQL `DELETE FROM sessions WHERE accountId = ? AND id != ?`.

8. **`logger.error` для success-сообщения**

   - Файл: [`nest-backend/src/managers-level/session/delete/delete.manager.service.ts:195`](nest-backend/src/managers-level/session/delete/delete.manager.service.ts#L195)
   - `this.logger.error(...)` используется для логирования успешного удаления сессий. Должен быть `this.logger.log(...)`.

9. **Access token cookie `maxAge: 1000 * 20` (20 секунд)**
   - Файлы: [`api-auth-account.controller.ts:116`](nest-backend/src/api-endpoints/account/auth/api-auth-account.controller.ts#L116), [`refresh.controller.ts:124`](nest-backend/src/api-endpoints/session/refresh/refresh.controller.ts#L124)
   - Браузер удаляет cookie через 20 секунд. Если `ACCESS_TOKEN_LIFETIME` в JWT > 20s — cookie истечёт раньше токена. Возможно задумано (force-refresh), но выглядит подозрительно.
   - Решение: убедиться что `maxAge` совпадает с `ACCESS_TOKEN_LIFETIME` из `.env`.

---

### 🟢 Мелочи

10. **8 одинаковых `TODO` про HTTP-статусы** — ⏳ ждёт решения
    - 8 контроллеров с `TODO` от 2025-08-20 «выбрать корректный HTTP-статус».

---

### Технический долг

- **`.env`** отсутствует (не скопирован из старого проекта) — нужно создать `.env.example` со списком переменных.
- **`package-lock.json`** ссылается на удалённый `iconv-lite` — пересоберётся при `npm install`.
- **Тестов 0** — конфиг Jest есть, `.spec.ts` файлов нет.
