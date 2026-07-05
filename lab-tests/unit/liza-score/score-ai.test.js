import scoreTask from '../../../website/common/script/ops/scoreTask';

jest.mock('../../../website/common/script/libs/statsComputed', () => jest.fn(() => ({
  str: 10,
  int: 10,
  con: 10,
  per: 10,
  maxMP: 50,
})));

jest.mock('../../../website/common/script/fns/crit', () => ({
  crit: jest.fn(() => 1),
}));

jest.mock('../../../website/common/script/fns/updateStats', () => jest.fn());

jest.mock('../../../website/common/script/libs/onboarding', () => ({
  checkOnboardingStatus: jest.fn(),
}));

const user = {
  _id: 'user-1',
  stats: {
    gp: 100, hp: 50, exp: 0, mp: 10, lvl: 1, class: 'warrior', buffs: {},
  },
  _tmp: {},
  preferences: { automaticAllocation: false },
  party: { quest: { progress: {} }, _id: 'party-1' },
  guilds: [],
  achievements: {},
};

const task = {
  _id: 'task-1',
  type: 'habit',
  value: 0,
  priority: 1,
  up: true,
  down: true,
  history: [],
  counterUp: 0,
  counterDown: 0,
  group: {},
};

describe('scoreTask', () => {
  it('should score a habit up without throwing an error', () => {
    const result = scoreTask({ user, task, direction: 'up' });
    expect(result).toBeDefined();
  });

  it('should increase the task value when scored up', () => {
    const before = task.value;
    scoreTask({ user, task, direction: 'up' });
    expect(task.value).toBeGreaterThan(before);
  });

  it('should return a number', () => {
    const result = scoreTask({ user, task, direction: 'up' });
    expect(typeof result).toBe('number');
  });

  it('should not throw when scoring down', () => {
    expect(() => scoreTask({ user, task, direction: 'down' })).not.toThrow();
  });
});