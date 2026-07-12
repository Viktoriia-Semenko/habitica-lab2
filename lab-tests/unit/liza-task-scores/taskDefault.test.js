import { expect } from 'chai';
import taskDefaults from '../../../website/common/script/libs/taskDefaults.js';

describe('taskDefaults.js', () => {
  let user;

  beforeEach(() => {
    user = {
      preferences: { dayStart: 0 },
    };
  });

  describe('type resolution', () => {
    it('якщо type відсутній — стає habit', () => {
      const task = {};
      taskDefaults(task, user);
      expect(task.type).to.equal('habit');
    });

    it('якщо type невалідний — стає habit', () => {
      const task = { type: 'not-a-real-type' };
      taskDefaults(task, user);
      expect(task.type).to.equal('habit');
    });

    it('якщо type валідний — зберігається як є', () => {
      const task = { type: 'daily' };
      taskDefaults(task, user);
      expect(task.type).to.equal('daily');
    });
  });

  describe('common defaults (all task types)', () => {
    it('генерує _id, якщо відсутній', () => {
      const task = { type: 'todo' };
      taskDefaults(task, user);
      expect(task._id).to.be.a('string').and.not.be.empty;
    });

    it('не перезаписує вже задані поля (напр. priority)', () => {
      const task = { type: 'todo', priority: 2 };
      taskDefaults(task, user);
      expect(task.priority).to.equal(2);
    });

    it('задає priority=1 за замовчуванням, якщо не вказано', () => {
      const task = { type: 'todo' };
      taskDefaults(task, user);
      expect(task.priority).to.equal(1);
    });

    it('value за замовчуванням дорівнює 10 для reward', () => {
      const task = { type: 'reward' };
      taskDefaults(task, user);
      expect(task.value).to.equal(10);
    });

    it('value за замовчуванням дорівнює 0 для habit', () => {
      const task = { type: 'habit' };
      taskDefaults(task, user);
      expect(task.value).to.equal(0);
    });

    it('заповнює notes/tags/reminders/attribute порожніми значеннями', () => {
      const task = { type: 'todo' };
      taskDefaults(task, user);
      expect(task.notes).to.equal('');
      expect(task.tags).to.be.an('array').that.is.empty;
      expect(task.reminders).to.be.an('array').that.is.empty;
      expect(task.attribute).to.equal('str');
    });
  });

  describe('habit-specific defaults', () => {
    it('додає up/down/counterUp/counterDown/frequency для habit', () => {
      const task = { type: 'habit' };
      taskDefaults(task, user);

      expect(task.up).to.be.true;
      expect(task.down).to.be.true;
      expect(task.counterUp).to.equal(0);
      expect(task.counterDown).to.equal(0);
      expect(task.frequency).to.equal('daily');
    });

    it('додає порожній history для habit', () => {
      const task = { type: 'habit' };
      taskDefaults(task, user);
      expect(task.history).to.be.an('array').that.is.empty;
    });

    it('НЕ додає up/down/counterUp для todo', () => {
      const task = { type: 'todo' };
      taskDefaults(task, user);
      expect(task.up).to.be.undefined;
      expect(task.counterUp).to.be.undefined;
    });
  });

  describe('daily & todo-specific defaults', () => {
    it('daily отримує checklist/completed/collapseChecklist і history', () => {
      const task = { type: 'daily' };
      taskDefaults(task, user);

      expect(task.completed).to.be.false;
      expect(task.collapseChecklist).to.be.false;
      expect(task.checklist).to.be.an('array').that.is.empty;
      expect(task.history).to.be.an('array').that.is.empty;
    });

    it('todo отримує checklist/completed, але НЕ history', () => {
      const task = { type: 'todo' };
      taskDefaults(task, user);

      expect(task.completed).to.be.false;
      expect(task.checklist).to.be.an('array').that.is.empty;
      expect(task.history).to.be.undefined;
    });

    it('daily отримує streak=0, repeat (усі дні true), everyX=1, frequency=weekly', () => {
      const task = { type: 'daily' };
      taskDefaults(task, user);

      expect(task.streak).to.equal(0);
      expect(task.everyX).to.equal(1);
      expect(task.frequency).to.equal('weekly');
      expect(task.repeat).to.deep.equal({
        m: true, t: true, w: true, th: true, f: true, s: true, su: true,
      });
      expect(task.daysOfMonth).to.be.an('array').that.is.empty;
      expect(task.weeksOfMonth).to.be.an('array').that.is.empty;
      expect(task.yesterDaily).to.be.true;
    });

    it('daily отримує startDate типу Date ', () => {
      const task = { type: 'daily' };
      taskDefaults(task, user);
      expect(task.startDate).to.be.an.instanceOf(Date);
    });

    it('reward НЕ отримує checklist/streak/history (не habit/daily/todo)', () => {
      const task = { type: 'reward' };
      taskDefaults(task, user);

      expect(task.checklist).to.be.undefined;
      expect(task.streak).to.be.undefined;
      expect(task.history).to.be.undefined;
    });
  });
});