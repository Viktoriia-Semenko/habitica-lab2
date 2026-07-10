import { expect } from 'chai';
import sinon from 'sinon';
import scoreTask from '../../website/common/script/ops/scoreTask.js';
import crit from '../../website/common/script/fns/crit.js';

describe('scoreTask.js', () => {
  let user;
  let task;
  let critStub;

  beforeEach(() => {
    critStub = sinon.stub(crit, 'crit').returns(1);

    user = {
      _id: 'user1',
      stats: {
        gp: 100, hp: 50, exp: 0, mp: 0, str: 0, int: 0, per: 0, con: 0, buffs: { streaks: false },
      },
      _tmp: {},
      preferences: { dayStart: 0, automaticAllocation: false },
      guilds: [],
      party: { _id: 'party1' },
      achievements: {},
      addNotification: sinon.spy(),
      addAchievement: sinon.spy(),
    };

    task = {
      id: 'task1',
      type: 'habit',
      userId: 'user1',
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

  describe('Validation & Security', () => {
    it('throws BadRequest when task belongs to another user', () => {
      task.userId = 'otherUser';
      expect(() => scoreTask({ user, task, direction: 'up' })).to.throw();
    });

    it('throws BadRequest when task group is inaccessible', () => {
      task.group.id = 'secretGuild';
      expect(() => scoreTask({ user, task, direction: 'up' })).to.throw();
    });
  });

  describe('Habit', () => {
    it('increments counterUp and increases value on up-score', () => {
      scoreTask({ user, task, direction: 'up' });
      expect(task.counterUp).to.equal(1);
      expect(task.value).to.be.above(0);
    });

    it('decrements counterDown and decreases value/hp on down-score', () => {
      scoreTask({ user, task, direction: 'down' });
      expect(task.counterDown).to.equal(1);
      expect(task.value).to.be.below(0);
    });
  });

  describe('Daily', () => {
    beforeEach(() => {
      task.type = 'daily';
      task.streak = 0;
      task.completed = false;
    });

    it('increments streak and sets completed true on up-score', () => {
      scoreTask({ user, task, direction: 'up' });
      expect(task.streak).to.equal(1);
      expect(task.completed).to.equal(true);
    });

    it('decrements streak and sets completed false on down-score', () => {
      task.streak = 1;
      task.completed = true;
      scoreTask({ user, task, direction: 'down' });
      expect(task.streak).to.equal(0);
      expect(task.completed).to.equal(false);
    });
  });

  describe('Todo', () => {
    beforeEach(() => {
      task.type = 'todo';
    });

    it('marks completed and sets dateCompleted on up-score', () => {
      scoreTask({ user, task, direction: 'up' });
      expect(task.completed).to.equal(true);
      expect(task.dateCompleted).to.exist;
    });
  });

  describe('Reward', () => {
    beforeEach(() => {
      task.type = 'reward';
      task.value = 50;
    });

    it('reduces gp by task value on purchase', () => {
      const initialGp = user.stats.gp;
      scoreTask({ user, task, direction: 'up' });
      expect(user.stats.gp).to.equal(initialGp - 50);
    });
  });
});