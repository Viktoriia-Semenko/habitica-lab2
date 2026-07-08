# Стратегія генерації Unit-тестів (AI Prompting Strategy)

## 1. Мета та контекст

Ця стратегія використовується для генерації unit-тестів для модуля **Auth & User** у проєкті Habitica.

Файл, що тестується:

`website/server/libs/auth/utils.js`

Основні експортовані елементи:

- `generateUsername`
- `isRestrictedEmailDomain`
- `loginRes`
- `RESTRICTED_EMAIL_DOMAINS`

Мета стратегії — отримувати тести, які:

- відповідають реальному коду Habitica;
- запускаються в тестовому середовищі проєкту;
- не потребують підключення до MongoDB;
- перевіряють не лише happy path, а й важливі edge cases та окремі гілки коду;
- не використовують вигадані функції, поля або test helpers.

## 2. Фреймворк, синтаксис і запуск

- **Тестовий фреймворк:** Mocha.
- **Assertions:** Chai.
- **Test doubles:** Sinon.
- **Assertions для Sinon stubs:** Sinon-Chai.
- Jest у цьому проєкті для цих server unit-тестів не використовується.

Дозволені приклади assertions:

```js
expect(value).to.equal(expected);
expect(value).to.be.a('string');
expect(() => functionCall()).to.throw();
expect(stub).to.be.calledOnce;
expect(stub).to.be.calledWithExactly(...);
```

Заборонено використовувати Jest syntax:

```js
expect(value).toBe(expected);
expect(value).toEqual(expected);
jest.fn();
expect(mock).toHaveBeenCalled();
```

Вихідний код Habitica використовує ES6 `import` / `export`, тому тести також мають використовувати цей синтаксис.

Тести потрібно запускати через Mocha з Babel configuration проєкту. Приклад команди:

```bash
npx mocha test/api/unit/libs/auth/auth-utils.test.js
```

Project configuration у `test/mocha.opts` підключає `@babel/register` і `test/helpers/globals.helper`. Тому помилка `Cannot use import statement outside a module` означає проблему з test runner setup, а не необхідність замінити `import` на `require`.

## 3. Імпорти та test setup

- `describe`, `it`, `beforeEach` надаються Mocha.
- `expect` і `sinon` можуть надаватися стандартним `test/helpers/globals.helper`.
- Дозволено імпортувати `sinon` безпосередньо у test file, якщо це відповідає поточному test setup.
- Не потрібно підключати Jest або змішувати Jest assertions із Chai/Sinon-Chai.
- Import path до source file має визначатися відповідно до фактичного розташування test file. Заборонено вгадувати кількість `../`.

Перед генерацією AI має отримати:

1. точний шлях до test file;
2. точний шлях до source file;
3. вихідний код функцій, які потрібно протестувати;
4. наявний test setup проєкту.

## 4. Ізоляція та мокування

Unit-тести повинні бути ізольованими:

- не звертатися до реальної MongoDB;
- не виконувати HTTP-запити;
- не використовувати production services;
- не залежати від стану інших тестів;
- не змінювати реальну конфігурацію застосунку.

Для цього вузького unit test заборонено використовувати:

```text
test/helpers/api-unit.helper.js
```

Цей helper імпортує Mongoose і server models, тому є занадто важким для ізольованого тестування `auth/utils.js`.

Використання:

```text
test/helpers/globals.helper.js
```

дозволене, оскільки він забезпечує стандартний test setup, зокрема Chai, Sinon-Chai, Sinon і test configuration. Його не слід плутати з `api-unit.helper.js`.

Об’єкти Express `req` і `res` потрібно створювати локально та передавати лише необхідні поля.

Приклад `req`:

```js
req = {
  url: '/api/v3/user/auth/local/login',
  headers: {},
};
```

Приклад `res`:

```js
res = {
  respond: sinon.stub(),
  redirect: sinon.stub(),
  t: sinon.stub().returns('Account Suspended'),
};
```

Не можна припускати, що `req` або `res` містять методи чи поля, яких немає у source code або явно створеному test double.

Source module може читати `nconf` під час імпорту. Тести не повинні самостійно змінювати production configuration, але стандартний test setup `nconf`, необхідний для імпорту module, дозволений.

## 5. Структура test fixtures

Кожна експортована функція повинна тестуватися в окремому `describe`.

Мінімальна структура:

```js
describe('generateUsername', () => {
  // мінімум 3 сфокусовані тести
});

describe('isRestrictedEmailDomain', () => {
  // мінімум 3 сфокусовані тести
});

describe('loginRes', () => {
  // мінімум 3 сфокусовані тести
});
```

Кожен тест має перевіряти одну чітку поведінку.

Назва тесту повинна описувати очікуваний результат, наприклад:

```js
it('returns false when no email is passed', () => {});
```

Тести мають використовувати структуру AAA:

1. **Arrange** — підготувати дані та stubs.
2. **Act** — викликати функцію.
3. **Assert** — перевірити результат і побічні виклики.

## 6. Обов’язкові сценарії

### `generateUsername`

Перевірити:

- функція повертає string;
- username починається з `hb-`;
- довжина не перевищує 20 символів;
- значення містить лише дозволені символи;
- послідовні виклики зазвичай повертають різні значення.

Не потрібно перевіряти внутрішню реалізацію бібліотеки генерації випадкових слів.

### `isRestrictedEmailDomain`

Перевірити:

- відсутній email повертає `false`;
- звичайний домен повертає `false`;
- restricted domain повертає `true`;
- перевірка не залежить від регістру;
- некоректний рядок без `@` не визначається як restricted domain.

### `loginRes`

Перевірити:

- normal login викликає `res.respond(200, payload)`;
- response містить `id`, `apiToken`, `newUser` і `username`;
- відсутній `newUser` перетворюється на `false`;
- значення `newUser: true` зберігається у response;
- blocked user спричиняє очікуваний authorization error;
- для blocked user не викликаються `respond` і `redirect`;
- Android client на Apple auth route отримує redirect;
- redirect містить очікувані параметри;
- Android client на іншому route не отримує Apple redirect;
- non-Android client на Apple route не отримує Android redirect.

Для exception test бажано перевіряти не лише факт помилки, а й очікуваний тип або message, якщо їх можна коректно імпортувати з source code.

## 7. Перевірка branch behaviour

AI має аналізувати умови `if`, логічні оператори `&&`, `||` та fallback values.

Для кожної суттєвої гілки потрібно створити окремий test case.

Особливу увагу приділити:

- `user.auth.blocked`;
- Android + Apple redirect condition;
- `user.newUser || false`;
- case-insensitive email comparison;
- відсутнім optional values.

Не можна вважати функцію повністю протестованою лише тому, що її було викликано хоча б один раз.

## 8. Запобігання галюцинаціям

AI категорично заборонено:

- вигадувати назви exports;
- вигадувати поля `user`, `req` або `res`;
- припускати наявність методів у project helpers;
- використовувати helper, не перевіривши його реалізацію;
- вгадувати import path;
- змішувати різні test frameworks;
- змінювати production code, якщо завдання полягає лише в написанні tests.

Генерація дозволена лише після отримання точного source code.

Після генерації необхідно перевірити:

1. чи всі imports існують;
2. чи import paths правильні;
3. чи всі stubs відповідають реальним викликам source code;
4. чи assertions справді виконуються;
5. чи тести не залежать від MongoDB;
6. чи кожен test може впасти при неправильній поведінці production code.