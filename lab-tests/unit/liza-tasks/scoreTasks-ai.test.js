import { expect } from 'chai';
import sinon from 'sinon';
import scoreTask from '../scoreTask'; // Вкажіть правильний шлях до файлу
import { BadRequest, NotAuthorized } from '../libs/errors';
import updateStats from '../fns/updateStats';
import crit from '../fns/crit';

describe('scoreTask', () => {
  let user;
  let task;

  beforeEach(() => {
    // Базовий мок користувача
    user = {
      _id: 'user-123',
      guilds: ['guild-abc'],
      party: { _id: 'party-xyz', quest: { progress: {} } },
      stats: {
        gp: 50,
        hp: 50,
        exp: 10,
        mp: 10,
        str: 10,
        con: 10,
        int: 10,
        per: 10,
        buffs: { streaks: true },
        training: { str: 0, int: 0, con: 0, per: 0 },
      },
      preferences: {
        automaticAllocation: false,
        allocationMode: 'flat',
        dayStart: 3,
      },
      achievements: {},
      _tmp: {},
      addNotification: sinon.spy(),
      addAchievement: sinon.spy(),
    };

    // Базовий мок завдання (Звичка)
    task = {
      id: 'task-1',
      type: 'habit',
      value: 0,
      priority: 1,
      counterUp: 0,
      counterDown: 0,
      history: [],
      group: {},
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Validation & Security', () => {
    it('throws BadRequest if task belongs to another user (userId mismatch)', () => {
      task.userId = 'another-user-999';

      expect(() => scoreTask({ user, task, direction: 'up' })).to.throw(BadRequest);
    });

    it('throws BadRequest if task belongs to an inaccessible group/guild/party', () => {
      task.group = { id: 'forbidden-group' };

      expect(() => scoreTask({ user, task, direction: 'up' })).to.throw(BadRequest);
    });

    it('throws NotAuthorized if user does not have enough GP for a reward', () => {
      task.type = 'reward';
      task.value = 100; // У користувача лише 50 GP

      expect(() => scoreTask({ user, task, direction: 'up' }, { language: 'en' })).to.throw(NotAuthorized);
    });
  });

  describe('Habit Scoring', () => {
    it('increases counterUp and value when scored up', () => {
      const initialValue = task.value;
      scoreTask({ user, task, direction: 'up' });

      expect(task.counterUp).to.equal(1);
      expect(task.value).to.be.greaterThan(initialValue);
    });

    it('decreases value and increases counterDown when scored down', () => {
      scoreTask({ user, task, direction: 'down' });

      expect(task.counterDown).to.equal(1);
      expect(task.value).to.be.lessThan(0);
    });

    it('adds history entry for habit if it is the first entry', () => {
      scoreTask({ user, task, direction: 'up' });

      expect(task.history).to.have.lengthOf(1);
      expect(task.history[0].scoredUp).to.equal(1);
    });
  });

  describe('Daily Scoring', () => {
    beforeEach(() => {
      task.type = 'daily';
      task.streak = 5;
      task.completed = false;
    });

    it('marks daily as completed and increments streak when scored up', () => {
      scoreTask({ user, task, direction: 'up' });

      expect(task.completed).to.be.true;
      expect(task.streak).to.equal(6);
    });

    it('gives STREAK_ACHIEVEMENT notification and achievement count when streak hits multiple of 21', () => {
      task.streak = 20; // Стане 21
      scoreTask({ user, task, direction: 'up' });

      expect(user.achievements.streak).to.equal(1);
      expect(user.addNotification.calledWith('STREAK_ACHIEVEMENT')).to.be.true;
    });

    it('unmarks daily completion and decrements streak when scored down', () => {
      task.completed = true;
      task.streak = 6;
      task.history = [{ date: Date.now(), value: 1, completed: true }];

      scoreTask({ user, task, direction: 'down' });

      expect(task.completed).to.be.false;
      expect(task.streak).to.equal(5);
    });
  });

  describe('Todo Scoring', () => {
    beforeEach(() => {
      task.type = 'todo';
      task.completed = false;
    });

    it('marks todo as completed and sets dateCompleted when scored up', () => {
      scoreTask({ user, task, direction: 'up' });

      expect(task.completed).to.be.true;
      expect(task.dateCompleted).to.be.an.instanceOf(Date);
    });

    it('unmarks todo completion when scored down', () => {
      task.completed = true;
      task.dateCompleted = new Date();

      scoreTask({ user, task, direction: 'down' });

      expect(task.completed).to.be.false;
      expect(task.dateCompleted).to.be.undefined;
    });
  });

  describe('Reward Purchasing', () => {
    beforeEach(() => {
      task.type = 'reward';
      task.value = 10;
    });

    it('decreases user GP by reward value without changing task value', () => {
      const initialTaskValue = task.value;
      scoreTask({ user, task, direction: 'up' });

      expect(user.stats.gp).to.equal(40); // 50 - 10
      expect(task.value).to.equal(initialTaskValue);
    });
  });
});