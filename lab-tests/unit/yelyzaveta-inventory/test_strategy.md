# Стратегія генерації Unit-тестів

## 1. Мета та контекст

Ця стратегія для генерації unit-тестів для решти моєї частині роботи
**Items & Groups** у проєкті Habitica (покупка предметів, екіпіровка, групи/parties).

Функції `validateItemPath`, `castItemVal` та `removeMessagesFromMember` вже
покриті вручну (`manual.test.js`), тому в цій стратегії їх не повторювала.

Файли, що тестуємо:

- `website/common/script/ops/equip.js` — `equip(user, req)` (default export)
- `website/common/script/ops/unequip.js` — `unEquipByType(user, req)`
- `website/common/script/ops/sell.js` — `sell(user, req)` (default export)
- `website/common/script/libs/isPinned.js` — `isPinned(user, item, checkOfficialPinnedItems)` (default export)
- `website/common/script/libs/gold.js` — `gold(num)` (default export)
- `website/common/script/libs/silver.js` — `silver(num)` (default export)
- `website/common/script/ops/pinnedGearUtils.js` — тільки прості функції:
  `checkPinnedAreasForNullEntries`, `addPinnedGear`, `removeItemByPath`
  (інші функції з цього файлу залежать від `content.gear.tree` і потребують
  набагато важчого мокування контенту — свідомо залишені поза цим one-shot прогоном)
- `website/server/libs/groups.js` — `leaveGroup(data)` (потребує мок `Group.getGroup`
  і мок group-об'єкта з методом `.leave()`)

Мета - отримати тести, які:

- відповідають реальному коду цих файлів;
- перевіряють не лише happy path, а й гілки з помилками (`BadRequest`, `NotFound`, `NotAuthorized`);
- не вигадують поля `user`/`req`, яких нема в коді.

## 2. Фреймворк, синтаксис і запуск

- **Тестовий фреймворк:** Mocha.
- **Assertions:** Chai.
- **Test doubles:** Sinon.
- Jest у цьому проєкті не використовується (він навіть не є залежністю `package.json`).

Запуск:

```bash
npx mocha lab-tests/unit/yelyzaveta-inventory/inventory-groups-ai.test.js --require @babel/register --require ./test/helpers/globals.helper
```

`--require @babel/register` дає можливість використовувати `import`/`export`
(ES6), `--require ./test/helpers/globals.helper` підключає глобальні `expect`
і `sinon`, які вже налаштовані в проєкті.

## 3. Імпорти та test setup

- `describe`, `it`, `beforeEach` — від Mocha (глобальні).
- `expect` і `sinon` — глобальні, з `test/helpers/globals.helper.js`. Не треба
  імпортувати `chai`/`sinon` напряму в файл тесту.
- Import path до source-файлу рахується від
  `lab-tests/unit/yelyzaveta-inventory/`, тобто три рівні вгору (`../../../website/...`).
  Заборонено вгадувати кількість `../` — перевіряти по фактичному розташуванню.
- Не використовувати `test/helpers/api-unit.helper.js` (він тягне за собою
  Mongoose-моделі та важкий для вузьких unit-тестів) — тільки простий
  саморобний об'єкт `user`/`req`.

## 4. Мокування

- `user` — звичайний plain-об'єкт, не Mongoose-документ. Якщо функція
  викликає `user.markModified(...)`, у тестовому `user` це поле треба задати
  як `() => {}` (або `sinon.spy()`, якщо потрібно перевірити виклик).
- `content` (`website/common/script/content/index.js`) — імпортується як є,
  не мокається повністю, бо: (а) це чистий JS-об'єкт без побічних ефектів,
  (б) значення предметів (`content.gear.flat`, `content.eggs`, тощо) потрібні
  тесту, щоб перевірити реальну поведінку (наприклад, скільки золота додається
  при продажу). Використовувати РЕАЛЬНІ ключі з content (наприклад,
  `weapon_warrior_0`, `Wolf` для яйця) — не вигадувати неіснуючі ключі.
- `i18n` — не мокати, він повертає рядки за замовчуванням навіть без
  `req.language`; тест не повинен перевіряти точний текст повідомлення, лише
  сам факт, що воно є (`to.be.a('string')`), якщо це не критична бізнес-логіка.
- `Group` model (для `leaveGroup`) — мокати `Group.getGroup` через
  `sinon.stub(Group, 'getGroup').resolves(fakeGroup)`, де `fakeGroup` — plain
  об'єкт з полями `type`, `quest`, `_id`, методами `leave: sinon.stub().resolves()`
  і `hasNotCancelled: () => false` (щоб не заходити у `updateGroupPlan`).
  Не піднімати реальну Mongoose-модель.
- Ніяких HTTP-запитів і реальної бази даних.

## 5. Структура тестів

Кожна функція — окремий `describe`. Мінімум 3 тести на функцію, кожен
перевіряє одну конкретну поведінку/гілку. Структура AAA (Arrange-Act-Assert).

## 6. Обов'язкові сценарії по функціях

### `equip`

- екіпірування нового предмета (`equipped`/`costume`) власником предмета;
- зняття предмета, якщо він вже екіпірований (toggle);
- `NotFound`, якщо предмет не належить користувачу;
- `BadRequest`, якщо відсутній `key` або `type`;
- `BadRequest`, якщо `type` не з дозволеного списку;
- toggle `currentMount`/`currentPet` для типів `mount`/`pet`.

### `unEquipByType`

- зняття всього спорядження при `type=all` (mount, pet, background, gear);
- зняття тільки фону при `type=background`;
- `BadRequest` для невалідного типу.

### `sell`

- зменшення кількості предмета і збільшення `stats.gp` на очікувану суму;
- `BadRequest`, якщо `amount` від'ємний;
- `NotAuthorized`, якщо тип предмета не входить у `ACCEPTEDTYPES`;
- `NotFound`, якщо предмета нема в `user.items[type]` або кількості не вистачає.

### `isPinned`

- `false`, якщо `user === null`;
- `true`, якщо предмет офіційно запінений і не є в `unpinnedItems`;
- `true`, якщо предмет є у `user.pinnedItems`;
- `false`, якщо предмета нема ніде.

### `gold` / `silver`

- `gold(0)` повертає рядок `'0'`;
- `gold(12.9)` повертає `12` (округлення вниз);
- `silver(0)` повертає `'00'`;
- `silver(12.5)` повертає `'50'`.

### `checkPinnedAreasForNullEntries`

- прибирає `null`/`undefined` елементи з `pinnedItems` та `unpinnedItems`.

### `addPinnedGear` / `removeItemByPath`

- додає новий елемент, якщо шляху ще нема в `pinnedItems`;
- не додає дубль, якщо шлях вже є;
- `removeItemByPath` видаляє існуючий елемент і повертає `true`;
- `removeItemByPath` повертає `false`, якщо шляху нема.

### `leaveGroup`

- успішний вихід зі звичайної групи (гільдії);
- `NotFound`, якщо групу не знайдено (`Group.getGroup` повертає `null`);
- `NotAuthorized`, якщо користувач — лідер квесту в party і намагається вийти;
- викликає `group.leave(...)` з правильними аргументами (`keep`, `keepChallenges`).

## 7. Заборонено

- вигадувати назви полів `user`/`req`, яких нема в коді;
- вигадувати ключі content, яких нема насправді (перевіряти реальний
  `content/gear`, `content/eggs` тощо);
- використовувати Jest-синтаксис;
- мокати `content` повністю (це прибере всю бізнес-логіку з поля зору тесту —
  саме та помилка, яку ми вже бачили в блайнд-тесті на `scoreTask.js`);
- вважати функцію протестованою лише тому, що її викликали один раз без
  перевірки конкретного результату.

## 8. Результат one-shot прогону

Перший (і єдиний) прогін за цією стратегією дав **27 з 27** тестів зелених одразу.
Стратегію оновлювати не довелось:)
