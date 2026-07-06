import { scoreTasks } from '../../../../../website/server/libs/tasks';
import { Task } from '../../../../../website/server/models/task';
import shared from '../../../../../website/common';

jest.mock('../../../../../website/server/models/task');
jest.mock('../../../../../website/common', () => ({
  ops: { scoreTask: jest.fn(() => 10) },
  fns: { randomDrop: jest.fn() },
}));

describe('Tasks - Unit Tests', () => {
  let mockUser;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = {
      _id: 'user-uuid',
      stats: { toJSON: () => ({ hp: 50, exp: 100 }) },
      achievements: { completedTask: true },
      save: jest.fn().mockResolvedValue(true),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) })
    };
    mockReq = { body: [{ id: 'task-1', direction: 'up' }] };
    mockRes = { t: (key) => key };
  });

  test('should successfully score a habit and return correct structure', async () => {
    // завдання
    const mockTask = {
      _id: 'task-1',
      type: 'habit',
      completed: false,
      group: {},
      isModified: () => true,
      save: jest.fn().mockResolvedValue(true)
    };
    
    Task.findMultipleByIdOrAlias.mockResolvedValue([mockTask]);

    const result = await scoreTasks(mockUser, [{ id: 'task-1', direction: 'up' }], mockReq, mockRes);

    // Перевіряємо, чи викликався розрахунок очок
    expect(shared.ops.scoreTask).toHaveBeenCalled();
    // Перевіряємо структуру відповіді
    expect(result[0]).toHaveProperty('id', 'task-1');
    expect(result[0]).toHaveProperty('delta', 10);
    // чи збереглися дані користувача
    expect(mockUser.save).toHaveBeenCalled();
  });

  test('should throw BadRequest if direction is invalid', async () => {
    const invalidScoring = [{ id: 'task-1', direction: 'left' }];
    
    await expect(scoreTasks(mockUser, invalidScoring, mockReq, mockRes))
      .rejects.toThrow(); // BadRequest
  });

  test('should throw NotFound if task does not exist', async () => {
    Task.findMultipleByIdOrAlias.mockResolvedValue([]);
    
    await expect(scoreTasks(mockUser, [{ id: 'non-existent', direction: 'up' }], mockReq, mockRes))
      .rejects.toThrow();
  });
});