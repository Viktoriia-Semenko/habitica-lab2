import { expect } from 'chai';

const WIREMOCK_URL = 'http://localhost:8080';
const FAKE_TASK_ID = 'task-created-456';


async function stubCreateTaskSuccess () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'POST',
        urlPath: '/api/v3/tasks/user',
      },
      response: {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          success: true,
          data: {
            _id: FAKE_TASK_ID,
            type: 'todo',
            text: 'Write lab report',
            userId: 'user-abc-123',
            value: 0,
            priority: 1,
            createdAt: '2026-07-12T00:00:00.000Z',
            updatedAt: '2026-07-12T00:00:00.000Z',
          },
        },
      },
    }),
  });
}

async function stubCreateTaskValidationError () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'POST',
        urlPath: '/api/v3/tasks/user',
      },
      response: {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          success: false,
          error: 'BadRequest',
          message: '"text" is required',
        },
      },
    }),
  });
}

async function resetWiremockMappings () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings/reset`, { method: 'POST' });
}

describe('Create Task HTTP contract (via WireMock provider stub)', () => {
  afterEach(async () => {
    await resetWiremockMappings();
  });

  describe('business process: successful task creation', () => {
    before(async () => {
      await stubCreateTaskSuccess();
    });

    it('returns the documented success response shape', async () => {
      const res = await fetch(`${WIREMOCK_URL}/api/v3/tasks/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'todo', text: 'Write lab report' }),
      });
      const body = await res.json();

      expect(res.status).to.equal(201);
      expect(body).to.have.property('success', true);
      expect(body).to.have.property('data');

      expect(body.data).to.have.property('_id').that.is.a('string');
      expect(body.data).to.have.property('type').that.is.a('string');
      expect(body.data).to.have.property('text').that.is.a('string');
      expect(body.data).to.have.property('userId').that.is.a('string');
      expect(body.data).to.have.property('value').that.is.a('number');
      expect(body.data).to.have.property('priority').that.is.a('number');
      expect(body.data).to.have.property('createdAt').that.is.a('string');
      expect(body.data).to.have.property('updatedAt').that.is.a('string');

      expect(['habit', 'daily', 'todo', 'reward']).to.include(body.data.type);
    });
  });

  describe('business process: rejected creation (missing required field)', () => {
    before(async () => {
      await stubCreateTaskValidationError();
    });

    it('returns the documented BadRequest validation error contract', async () => {
      const res = await fetch(`${WIREMOCK_URL}/api/v3/tasks/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'todo' }),
      });
      const body = await res.json();

      expect(res.status).to.equal(400);
      expect(body).to.have.property('success', false);
      expect(body).to.have.property('error', 'BadRequest');
      expect(body).to.have.property('message').that.is.a('string');

      expect(body).to.not.have.property('data');
    });
  });
});