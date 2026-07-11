import { expect } from 'chai';

const WIREMOCK_URL = 'http://localhost:8080';
const FAKE_TASK_ID = 'task-abc-123';


async function stubScoreUpSuccess () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'POST',
        urlPath: `/api/v3/tasks/${FAKE_TASK_ID}/score/up`,
      },
      response: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          success: true,
          data: {
            delta: 1,
            _tmp: {},
            id: FAKE_TASK_ID,
            type: 'habit',
            value: 1.23,
            counterUp: 1,
            counterDown: 0,
          },
          notifications: [],
        },
      },
    }),
  });
}

async function stubScoreRewardRejected () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request: {
        method: 'POST',
        urlPath: `/api/v3/tasks/${FAKE_TASK_ID}/score/up`,
      },
      response: {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: {
          success: false,
          error: 'NotAuthorized',
          message: 'Not enough gold.',
        },
      },
    }),
  });
}

async function resetWiremockMappings () {
  await fetch(`${WIREMOCK_URL}/__admin/mappings/reset`, { method: 'POST' });
}

describe('scoreTask HTTP contract (via WireMock provider stub)', () => {
  afterEach(async () => {
    await resetWiremockMappings();
  });

  describe('business process 1: successful up-scoring', () => {
    before(async () => {
      await stubScoreUpSuccess();
    });

    it('returns the documented success response shape', async () => {
      const res = await fetch(`${WIREMOCK_URL}/api/v3/tasks/${FAKE_TASK_ID}/score/up`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).to.equal(200);
      expect(body).to.have.property('success', true);
      expect(body).to.have.property('data');
      expect(body).to.have.property('notifications');

      expect(body.data).to.have.property('delta').that.is.a('number');
      expect(body.data).to.have.property('id').that.is.a('string');
      expect(body.data).to.have.property('type').that.is.a('string');
      expect(body.data).to.have.property('value').that.is.a('number');
      expect(body.data).to.have.property('counterUp').that.is.a('number');
      expect(body.data).to.have.property('counterDown').that.is.a('number');

      expect(body.notifications).to.be.an('array');
    });
  });

  describe('business process 2: rejected reward purchase (insufficient gold)', () => {
    before(async () => {
      await stubScoreRewardRejected();
    });

    it('returns the documented NotAuthorized error contract', async () => {
      const res = await fetch(`${WIREMOCK_URL}/api/v3/tasks/${FAKE_TASK_ID}/score/up`, {
        method: 'POST',
      });
      const body = await res.json();

      expect(res.status).to.equal(401);
      expect(body).to.have.property('success', false);
      expect(body).to.have.property('error', 'NotAuthorized');
      expect(body).to.have.property('message').that.is.a('string');

      expect(body).to.not.have.property('data');
    });
  });
});