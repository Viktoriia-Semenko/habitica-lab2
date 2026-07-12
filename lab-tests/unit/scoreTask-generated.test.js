import { expect } from 'chai';
import sinon from 'sinon';
import scoreTask from '../../website/common/script/ops/scoreTask.js';
import crit from '../../website/common/script/fns/crit.js';

describe('scoreTask.js', () => {
  let user;
  let task;

  beforeEach(() => {
    user = {
      _id: 'user1',
      stats: {
        gp: 100, hp: 50, exp: 0, mp: 0,
        str: 10, int: 10, per: 10, con: 10, // Поставив значення > 0 для реалістичного розрахунку
        lvl: 5,
        class: 'warrior',
        buffs: { streaks: false, str: 0, int: 0, per: 0, con: 0 },
        training: { str: 0, int: 0, con: 0, per: 0 },
      },
      items: { gear: { equipped: {} } },
      flags: { customizationsNotification: false, levelDrops: {} },
      party: { _id: 'party1', quest: { progress: { up: 0 } } },
      guilds: [],
      preferences: { dayStart: 0, automaticAllocation: false },
      achievements: {},
      _tmp: {},
      addNotification: sinon.spy(),
      addAchievement: sinon.spy(),
    };

    task = {
      id: 't1', type: 'habit', value: 0, priority: 1, 
      counterUp: 0, counterDown: 0, history: [], group: {}
    };

    sinon.stub(crit, 'crit').returns(1);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Habit', () => {
    it('збільшує counterUp та value при позитивному скорингу', () => {
      scoreTask({ user, task, direction: 'up' });
      expect(task.counterUp).to.equal(1);
      expect(task.value).to.be.above(0);
    });

    it('зменшує hp при негативному скорингу', () => {
      const initialHp = user.stats.hp;
      scoreTask({ user, task, direction: 'down' });
      expect(task.counterDown).to.equal(1);
      expect(user.stats.hp).to.be.below(initialHp);
    });
  });

  describe('Daily', () => {
    beforeEach(() => {
      task.type = 'daily';
      task.streak = 0;
    });

    it('збільшує streak та позначає як виконаний при up-скорингу', () => {
      scoreTask({ user, task, direction: 'up' });
      expect(task.streak).to.equal(1);
      expect(task.completed).to.be.true;
    });
  });

  describe('Validation & Security', () => {
    it('кидає BadRequest, якщо task належить іншому користувачу', () => {
      task.userId = 'other_user';
      expect(() => scoreTask({ user, task, direction: 'up' })).to.throw(/Cannot score task belonging to another user/);
    });
  });
});