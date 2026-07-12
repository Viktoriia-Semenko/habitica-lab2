import { expect } from 'chai';
import addTask from '../../../website/common/script/ops/addTask.js';

describe('addTask.js', () => {
  let user;

  beforeEach(() => {
    user = {
      tasksOrder: {
        habits: [], dailys: [], todos: [], rewards: [],
      },
      habits: [],
      dailys: [],
      todos: [],
      rewards: [],
      preferences: { newTaskEdit: false },
    };
  });

  it('додає habit-таск на початок user.habits і user.tasksOrder.habits', () => {
    const task = addTask(user, { body: { type: 'habit', text: 'Do the thing' } });

    expect(user.habits).to.have.lengthOf(1);
    expect(user.habits[0]).to.equal(task);
    expect(user.tasksOrder.habits[0]).to.equal(task._id);
  });

  it('додає todo-таск саме в user.todos, а не в інші списки', () => {
    addTask(user, { body: { type: 'todo', text: 'Buy milk' } });

    expect(user.todos).to.have.lengthOf(1);
    expect(user.habits).to.have.lengthOf(0);
    expect(user.dailys).to.have.lengthOf(0);
  });

  it('новий таск додається на початок списку (unshift), а не в кінець', () => {
    addTask(user, { body: { type: 'todo', text: 'First' } });
    const second = addTask(user, { body: { type: 'todo', text: 'Second' } });

    expect(user.todos[0]).to.equal(second);
    expect(user.todos[1].text).to.equal('First');
  });

  it('якщо req не передано — використовує дефолтний {body:{}} і не падає', () => {
    expect(() => addTask(user)).to.not.throw();
    expect(user.habits).to.have.lengthOf(1);
  });

  it('коли user.preferences.newTaskEdit=true — виставляє _editing і клонує в _edit', () => {
    user.preferences.newTaskEdit = true;
    const task = addTask(user, { body: { type: 'todo', text: 'Edit me' } });

    expect(task._editing).to.be.true;
    expect(task._edit).to.deep.equal(task._edit);
    expect(task._edit.text).to.equal('Edit me');
  });

  it('коли user.preferences.newTaskEdit=false  НЕ виставляє _editing/_edit', () => {
    const task = addTask(user, { body: { type: 'todo', text: 'No edit' } });

    expect(task._editing).to.be.false;
    expect(task._edit).to.be.undefined;
  });
});