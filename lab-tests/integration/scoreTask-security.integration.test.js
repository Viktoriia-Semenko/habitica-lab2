import { expect } from 'chai';
import sinon from 'sinon';
import scoreTask from '../../website/common/script/ops/scoreTask.js';
import crit from '../../website/common/script/fns/crit.js';

describe('scoreTask.js - security (authorization)', () => {
  let user;

  function makeTask (overrides = {}) {
    return {
      id: 't1',
      type: 'todo',
      value: 0,
      priority: 1,
      counterUp: 0,
      counterDown: 0,
      history: [],
      group: {},
      checklist: [],
      ...overrides,
    };
  }

  beforeEach(() => {
    user = {
      _id: 'user1',
      stats: {
        gp: 100,
        hp: 50,
        exp: 0,
        mp: 0,
        str: 10,
        int: 10,
        per: 10,
        con: 10,
        lvl: 5,
        class: 'warrior',
        buffs: {
          streaks: false, str: 0, int: 0, per: 0, con: 0,
        },
        training: {
          str: 0, int: 0, con: 0, per: 0,
        },
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

    sinon.stub(crit, 'crit').returns(1);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('ownership check (personal tasks)', () => {
    it('кидає BadRequest, якщо task належить іншому користувачу', () => {
      const task = makeTask({ userId: 'other_user' });

      expect(() => scoreTask({ user, task, direction: 'up' }))
        .to.throw(/Cannot score task belonging to another user/);
    });

    it('дозволяє скоринг, якщо task.userId збігається з поточним юзером', () => {
      const task = makeTask({ userId: user._id });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.not.throw();
      expect(task.completed).to.be.true;
    });

    it('дозволяє скоринг таску без userId (відкритий/груповий за замовчуванням)', () => {
      const task = makeTask({ userId: undefined });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.not.throw();
    });
  });

  describe('group / guild membership check', () => {
    it('кидає BadRequest при скорингу групового таску, якщо юзер не в guild і не в party', () => {
      user.guilds = ['guild-a', 'guild-b'];
      user.party._id = 'my-party-id';

      const task = makeTask({
        userId: undefined,
        group: { id: 'some-unrelated-group-id' },
      });

      expect(() => scoreTask({ user, task, direction: 'up' }))
        .to.throw(/Cannot score task belonging to another user/);
    });

    it('дозволяє скоринг групового таску, якщо юзер є членом цієї guild', () => {
      user.guilds = ['guild-a', 'shared-group-id'];

      const task = makeTask({
        userId: undefined,
        group: { id: 'shared-group-id', assignedUsers: [] },
      });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.not.throw();
    });

    it('дозволяє скоринг, якщо груповий id збігається з party юзера', () => {
      user.party._id = 'shared-party-id';
      user.guilds = [];

      const task = makeTask({
        userId: undefined,
        group: { id: 'shared-party-id', assignedUsers: [] },
      });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.not.throw();
    });
  });

  describe('reward purchase funds check', () => {
    it('кидає NotAuthorized, якщо reward коштує дорожче ніж є gp', () => {
      user.stats.gp = 5;
      const task = makeTask({ type: 'reward', userId: user._id, value: 10 });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.throw();
    });

    it('дозволяє покупку, якщо gp рівно достатньо', () => {
      user.stats.gp = 10;
      const task = makeTask({ type: 'reward', userId: user._id, value: 10 });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.not.throw();
    });

    it('дозволяє покупку, якщо gp більше ніж достатньо', () => {
      user.stats.gp = 100;
      const task = makeTask({ type: 'reward', userId: user._id, value: 10 });

      expect(() => scoreTask({ user, task, direction: 'up' })).to.not.throw();
    });
  });
});