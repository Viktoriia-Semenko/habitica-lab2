# стратегія для тестів `scoreTask.js` (v2)

Отримати повне, змістовне юніт-покриття логіки нарахування очок
(`website/common/script/ops/scoreTask.js`) для типів Habit, Daily, Todo
(Reward — другорядно), придатне для генерації агентом за один прохід.

## Область покриття

- Файл: `website/common/script/ops/scoreTask.js`
- Типи тасків: `habit`, `daily`, `todo` (обов'язково), `reward` (бажано)
- Framework: Mocha + Chai + Sinon (як у решті проєкту Habitica)
- Тести — **ES-модулі** (`import`/`export default`), як і сам код проєкту.
  НЕ використовувати `require()` для файлів проєкту (`scoreTask.js`, `crit.js`
  тощо) — вони самі є ESM, і `require()` дає інший, "порожній" інстанс
  модуля (звідси помилки на кшталт `Cannot stub non-existent property`).

## Підхід до test doubles

- `user` та `task` — прості plain-object моки (не Mongoose-документи).
- `crit.crit` **ЗАВЖДИ** заглушувати через
  `sinon.stub(crit, 'crit').returns(1)` в `beforeEach` і `restore()` в
  `afterEach`. Це єдина реально випадкова залежність у файлі.
- `statsComputed`, `updateStats`, `i18n`, `getUtcOffset` — **не мокати**,
  хай виконуються по-справжньому. Це означає, що мок `user` мусить бути
  ДОСТАТНІМ для повного, реального проходження цих функцій без падінь.
- `addNotification`, `addAchievement` — `sinon.spy()`.

## Обов'язкова структура `user`-мока (мінімально повний)

`scoreTask.js` викликає всередині `statsComputed()`, `updateStats()` і читає
`user.party.quest.progress` для habit/daily/todo scoring через `_changeTaskValue`
(lodash `times`). Якщо будь-яке з цих полів відсутнє — тест впаде НЕ на
асерті, а всередині залежності, з помилкою типу
`Cannot read properties of undefined`. Тому кореневий мок `user` має
включати **всі** нижченаведені гілки, навіть якщо конкретний тест їх
напряму не перевіряє:

**Обґрунтування кожного поля (не видаляти без перевірки трейсу):** (таблицю допоміг згенерити клод)

| Поле                                                   | Хто читає                                            | Симптом відсутності                                                          |
| ------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| `stats.buffs.str/int/per/con`                          | `statsComputed` -> `equipmentStatBonusComputed`      | помилки/NaN у розрахунку бонусів                                             |
| `items.gear.equipped`                                  | `statsComputed.js:15 equipmentStatBonusComputed`     | `Cannot read properties of undefined (reading 'gear')`                       |
| `flags.customizationsNotification`, `flags.levelDrops` | `updateStats.js:68`                                  | `Cannot read properties of undefined (reading 'customizationsNotification')` |
| `party.quest.progress`                                 | `scoreTask.js:168 _changeTaskValue` (lodash `times`) | `Cannot read properties of undefined (reading 'progress')`                   |
| `stats.lvl`, `stats.class`                             | `statsComputed` (клас-бонуси)                        | тихі неправильні числа або падіння при подальших розрахунках                 |

Це стосується і **габаритного** таска (group/guild): якщо тест перевіряє
групову daily/todo, `user.guilds` і `user.party._id` мають бути узгоджені
з `task.group.id`, інакше впаде на `Validation & Security`, а не на
бізнес-логіці.

## Структура файлу(ів)

- Один `describe` верхнього рівня на тип таска: Habit / Daily / Todo /Reward, плюс окремий `describe('Validation & Security')`.
- `beforeEach` всередині кожного `describe` доповнює мок `user`/`task`,
  специфічний для цього типу (а не замінює кореневий мок).
- Стиль тесту: AAA (Arrange – Act – Assert), без логіки/умов усередині
  `it`.
- Назва тесту: `"<дія> <очікуваний результат>"`, без загальних формулювань
  типу "works correctly" чи "test 1".

## Обов'язковий чекліст гілок коду (що МАЄ бути покрито)

**Habit**

- [ ] up-скор: `counterUp`, приріст `value`
- [ ] down-скор: `counterDown`, зменшення `value`, зменшення `hp`
- [ ] дедублікація history-запису в межах одного дня
- [ ] межове значення `value` (нижче `MIN_TASK_VALUE` / вище `MAX_TASK_VALUE`)

**Daily**

- [ ] up-скор (не cron): `streak++`, `completed = true`
- [ ] down-скор (не cron): `streak--`, `completed = false`
- [ ] ачивка на `streak % 21 === 0` при up, і її знімання при down
- [ ] cron-скоринг: `buffs.streaks = false` → `streak` скидається в 0
- [ ] cron-скоринг: `buffs.streaks = true` → `streak` НЕ скидається
- [ ] групова daily (`task.group.id` задано, збігається з `user.party._id`
      або є в `user.guilds`): окрема гілка через `assignedUsersDetail`

**Todo**

- [ ] up-скор: `completed = true`, `dateCompleted` встановлено
- [ ] down-скор: `completed = false`, `dateCompleted` очищено
- [ ] чекліст: виконані пункти збільшують приріст `value`
- [ ] групове todo: окрема гілка через `assignedUsersDetail`

**Reward**

- [ ] успішна покупка: `gp` зменшується на `task.value`, сам `task.value`
      не змінюється
- [ ] недостатньо `gp` → кидається `NotAuthorized`

**Security / Validation**

- [ ] чужий `task.userId` → `BadRequest`
- [ ] `task.group.id`, недоступний юзеру → `BadRequest`

**Інше**

- [ ] `times > 1` (пропущені дні) — скоринг застосовується кратно

## Правила для asserts

- Для поведінкових фактів (флаги, лічильники, streak) — конкретні matchers
  (`equal`, `true`/`false`), не розпливчасті `greaterThan`/`lessThan`, якщо
  можна перевірити точне значення.
- `greaterThan`/`lessThan` — тільки там, де точне число залежить від
  незамокованої залежності (`updateStats`/`statsComputed`) і ми свідомо не
  дублюємо її внутрішню логіку в тесті.
- Мінімум 1 тест на describe-блок демонструє розуміння формули (явний
  розрахунок очікуваного числа).

## Заборонено

- Не мокати `crit`/`statsComputed`/`updateStats` через важкі інструменти
  (proxyquire, rewire) — лише прямий `sinon.stub` на об'єкт модуля, і
  лише для `crit`.
- Не спрощувати мок `user`, прибираючи поля з таблиці вище "бо тест і так
  зелений" — якщо тест зелений з неповним моком, це означає, що гілка
  коду, яка потребує цього поля, не виконалась (хибне покриття).
- Не дублювати однакові тести під різними назвами.
- Не залишати `it.skip`/`describe.skip` без коментаря-причини.

## Обов'язкова структура beforeEach

- Кореневий `beforeEach` ЗАВЖДИ ініціалізує І `user` (повний мок за
  таблицею вище), І `task` (мінімальний habit-об'єкт: `id`, `type='habit'`,
  `value=0`, `priority=1`, `counterUp=0`, `counterDown=0`, `history=[]`,
  `group={}`).
- Кожен `describe` для daily/todo/reward доповнює `task` своїми полями у
  власному вкладеному `beforeEach` — НЕ замінює кореневий, а розширює.
- Перед видачею відповіді агент має подумки прогнати кожен `it()` через
  реальний виклик `scoreTask` і перевірити на відповідність таблиці полів
  вище: чи не звертається код до `user.items`, `user.flags`,
  `user.party.quest`, `user.stats.buffs.<attr>` без того, щоб ці поля були
  в моку.

## Ітераційний процес

1. Дати агенту цю стратегію + файл `scoreTask.js` (і за потреби
   `statsComputed.js`, `updateStats.js`) одним промптом: "Згенеруй
   юніт-тести для scoreTask.js строго за доданою тестовою стратегією."
2. Прогнати тести реально (`mocha ...`), а не лише звірити з чеклистом
   на око — саме реальний прогін ловить пропущені поля моку.
3. Якщо тест падає всередині залежності (`statsComputed`, `updateStats`,
   lodash `times` тощо), а не на `expect(...)` — це сигнал доповнити
   таблицю обов'язкових полів `user` у цій стратегії, а НЕ правити
   згенерований тест руками.
4. Повторювати, поки один прохід (one-shot) не дасть результат, що
   повністю закриває чекліст без ручних правок і без падінь у
   залежностях.
