import { expect } from 'chai';
import sinon from 'sinon';
import scoreTask from '../../website/common/script/ops/scoreTask.js';
import crit from '../../website/common/script/fns/crit.js';

describe('scoreTask fixture tests', () => {
  let user;
  let task;
  let critStub;

  beforeEach(() => {
    critStub = sinon.stub(crit, 'crit').returns(1);

    user = {
      _id: 'user-123',
      guilds: ['guild-abc'],
      party: { _id: 'party-xyz', quest: { progress: {} } },
      stats: {
        gp: 50,
        hp: 50,
        exp: 10,
        mp: 10,
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
    critStub.restore();
  });

  // ФІКСТУРА 1: Habit
  describe('Habit scoring', () => {
    it('up-скор збільшує counterUp і value', () => {
      const initialValue = task.value;
      scoreTask({ user, task, direction: 'up' });

      expect(task.counterUp).to.equal(1);
      expect(task.value).to.be.greaterThan(initialValue);
    });

    it('down-скор зменшує value і збільшує counterDown', () => {
      scoreTask({ user, task, direction: 'down' });

      expect(task.counterDown).to.equal(1);
      expect(task.value).to.be.lessThan(0);
    });

    it('перший up-скор додає один запис в history зі scoredUp=1', () => {
      scoreTask({ user, task, direction: 'up' });

      expect(task.history).to.have.lengthOf(1);
      expect(task.history[0].scoredUp).to.equal(1);
    });

    it('другий up-скор того самого дня НЕ додає новий запис, а оновлює існуючий', () => {
      scoreTask({ user, task, direction: 'up' });
      scoreTask({ user, task, direction: 'up' });

      expect(task.history).to.have.lengthOf(1);
      expect(task.history[0].scoredUp).to.equal(2);
    });
  });

  // ФІКСТУРА 2: Daily
  describe('Daily scoring', () => {
    beforeEach(() => {
      task.type = 'daily';
      task.streak = 5;
      task.completed = false;
      task.challenge = {};
    });

    it('up-скор позначає daily виконаним і збільшує streak', () => {
      scoreTask({ user, task, direction: 'up' });

      expect(task.completed).to.be.true;
      expect(task.streak).to.equal(6);
    });

    it('streak, кратний 21, дає ачивку і нотифікацію', () => {
      task.streak = 20;
      scoreTask({ user, task, direction: 'up' });

      expect(user.achievements.streak).to.equal(1);
      expect(user.addNotification.calledWith('STREAK_ACHIEVEMENT')).to.be.true;
    });

    it('down-скор знімає completed і зменшує streak', () => {
      task.completed = true;
      task.streak = 6;
      task.history = [{ date: Date.now(), value: 1, completed: true }];

      scoreTask({ user, task, direction: 'down' });

      expect(task.completed).to.be.false;
      expect(task.streak).to.equal(5);
    });

    it('cron-скоринг без Chilling Frost (buffs.streaks=false) скидає streak в 0', () => {
      user.stats.buffs.streaks = false;
      scoreTask({
        user, task, direction: 'down', cron: true,
      });

      expect(task.streak).to.equal(0);
    });
  });


  // ФІКСТУРА 3: Todo
  describe('Todo scoring', () => {
    beforeEach(() => {
      task.type = 'todo';
      task.completed = false;
    });

    it('up-скор позначає todo виконаним і виставляє dateCompleted', () => {
      scoreTask({ user, task, direction: 'up' });

      expect(task.completed).to.be.true;
      expect(task.dateCompleted).to.be.an.instanceOf(Date);
    });

    it('down-скор знімає completed', () => {
      task.completed = true;
      task.dateCompleted = new Date();

      scoreTask({ user, task, direction: 'down' });

      expect(task.completed).to.be.false;
      expect(task.dateCompleted).to.be.undefined;
    });

    it('виконаний пункт чекліста збільшує приріст value порівняно з todo без чекліста', () => {
      const plainTask = { ...task, checklist: [] };
      const checklistTask = {
        ...task, checklist: [{ completed: true }, { completed: false }],
      };

      scoreTask({ user, task: plainTask, direction: 'up' });
      scoreTask({ user, task: checklistTask, direction: 'up' });

      expect(checklistTask.value).to.be.greaterThan(plainTask.value);
    });
  });
});