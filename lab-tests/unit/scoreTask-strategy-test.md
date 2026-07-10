# стратегія для юніт-тестів `scoreTask.js`

Отримати повне, змістовне юніт-покриття логіки нарахуванняочок (`website/common/script/ops/scoreTask.js`) для типів Habit, Daily, Todo (Reward — другорядно), придатне для генерації агентом за один прохід.

## Область покриття

- Файл: `website/common/script/ops/scoreTask.js`
- Типи тасків: `habit`, `daily`, `todo` (обов'язково), `reward` (бажано)
- Framework: Mocha + Chai + Sinon (як у решті проєкту Habitica)

## Підхід до test doubles

- `user` та `task` — прості plain-object моки (не Mongoose-документи).
- `crit.crit` **ЗАВЖДИ** заглушувати через
    `sinon.stub(crit, 'crit').returns(1)` в `beforeEach` і `restore()` в `afterEach`. Це єдина реально випадкова залежність у файлі; без стаба тести будуть флейкі (нестабільно падатимуть без змін у коді).
- `statsComputed`, `updateStats`, `i18n`, `getUtcOffset` — **не мокати**,
    хай виконуються по-справжньому. Мок `user` повинен містити мінімально потрібні поля: `stats.buffs`, `stats.training`, `preferences.dayStart`, `preferences.automaticAllocation`. Якщо тест падає з помилкою на кшталт "cannot read property X of undefined" це сигнал доповнити мок, а не
    привід огортати ці функції моками.
- `addNotification`, `addAchievement` `sinon.spy()`.

## Структура файлу(ів)

- Один `describe` верхнього рівня на тип таска: Habit / Daily / Todo /
    Reward, плюс окремий `describe('Validation & Security')`.
- `beforeEach` всередині кожного `describe` готує мок `user`/`task`,
    специфічний для цього типу (а не один спільний мок на всі типи).
- Стиль тесту: AAA (Arrange – Act – Assert), без логіки/умов усередині
    `it`.
- Назва тесту: `"<дія> <очікуваний результат>"`, без загальних формулювань
    типу "works correctly" чи "test 1".

## Обов'язковий чекліст гілок коду (що МАЄ бути покрито)

**Habit**

- [ ] up-скор: `counterUp`, приріст `value`
- [ ] down-скор: `counterDown`, зменшення `value`, зменшення `hp`
- [ ] дедублікація history-запису в межах одного дня (другий скор того ж дня оновлює існуючий запис, а не додає новий)
- [ ] межове значення `value` (нижче `MIN_TASK_VALUE` / вище `MAX_TASK_VALUE`) не дає "вибухового" приросту

**Daily**

- [ ] up-скор (не cron): `streak++`, `completed = true`
- [ ] down-скор (не cron): `streak--`, `completed = false`
- [ ] ачивка на `streak % 21 === 0` при up, і її знімання при down
- [ ] cron-скоринг: `buffs.streaks = false` → `streak` скидається в 0
- [ ] cron-скоринг: `buffs.streaks = true` → `streak` НЕ скидається
- [ ] групова daily (`task.group.id` задано): окрема гілка через `assignedUsersDetail`, не плутати з індивідуальною

**Todo**

- [ ] up-скор: `completed = true`, `dateCompleted` встановлено
- [ ] down-скор: `completed = false`, `dateCompleted` очищено
- [ ] чекліст: виконані пункти збільшують приріст `value`
- [ ] групове todo (`task.group.id` задано): окрема гілка

**Reward**

- [ ] успішна покупка: `gp` зменшується на `task.value`, сам `task.value` не змінюється
- [ ] недостатньо `gp` → кидається `NotAuthorized`

**Security / Validation**

- [ ] чужий `task.userId` → `BadRequest`
- [ ] `task.group.id`, недоступний юзеру (немає в `guilds`, не збігається `party._id`) → `BadRequest`

**Інше**

- [ ] `times > 1` (пропущені дні) — скоринг застосовується кратно

## Правила для asserts

- Для поведінкових фактів (флаги, лічильники, значення streak) —
    конкретні matchers (`equal`, `true`/`false`), не розпливчасті
    `greaterThan`/`lessThan`, якщо можна перевірити точне значення.
- `greaterThan`/`lessThan` — тільки там, де точне число залежить від незамокованої залежності (напр. `updateStats`) і ми свідомо не хочемо дублювати її внутрішню логіку в тесті.
- Мінімум 1 тест на describe-блок демонструє розуміння формули (явний розрахунок очікуваного числа)

## Заборонено

- Не мокати `crit`/`statsComputed`/`updateStats` через важкі інструменти (proxyquire, rewire) без потреби — тільки прямий `sinon.stub` на об'єкт модуля, і тільки для `crit`.
- Не дублювати однакові тести під різними назвами.
- Не залишати `it.skip` / `describe.skip` без коментаря-причини.

## Обов'язкова структура beforeEach

- Кореневий beforeEach ЗАВЖДИ ініціалізує І user, І task (мінімальний habit-об'єкт
    з полями: id, type='habit', value=0, priority=1, counterUp=0, counterDown=0,
    history=[], group={}).
- Кожен describe для daily/todo/reward доповнює task своїми полями
    у власному вкладеному beforeEach — НЕ замінює кореневий, а розширює.
- Перед відправкою відповіді: перевір, що жоден it() не звертається до task.\*
    раніше, ніж task було створено в якомусь beforeEach по ланцюгу.

## Ітераційний процес

1. Дати агенту цю стратегію + файл `scoreTask.js` одним промптом:
      "Згенеруй юніт-тести для scoreTask.js строго за доданою тестовою стратегією."
2. Звірити результат з чеклистом вище (усі пункти мають бути позначені).
3. Якщо чогось бракує або підхід порушено **не правити згенерований тест руками**, а уточнити/доповнити відповідний пункт стратегії й попросити перегенерувати.
4. Повторювати, поки один прохід (one-shot) не дасть результат, що повністю закриває чекліст без ручних правок
