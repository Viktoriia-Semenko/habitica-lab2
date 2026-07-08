import nconf from 'nconf';
import superagent from 'superagent';

import {
  generateUser,
} from '../../test/helpers/api-integration/v3';

const API_BASE_URL = `http://localhost:${nconf.get('PORT')}/api/v3`;

function createCredentials (prefix) {
  const randomPart = `${Date.now()}${Math.floor(Math.random() * 10000)}`;

  const username = `${prefix}-${randomPart}`.substring(0, 20);

  return {
    username,
    email: `${username}@example.com`,
    password: 'ContractPassword123',
  };
}

describe('Auth API contract tests', () => {
  describe('Business process 1: local user registration', () => {
    it('returns the documented success contract for valid registration', async () => {
      const credentials = createCredentials('register');

      const response = await superagent
        .post(`${API_BASE_URL}/user/auth/local/register`)
        .set('x-client', 'habitica-web')
        .accept('application/json')
        .send({
          username: credentials.username,
          email: credentials.email,
          password: credentials.password,
          confirmPassword: credentials.password,
        });

      expect(response.status).to.equal(201);
      expect(response.headers['content-type']).to.match(/application\/json/);

      expect(response.body).to.be.an('object');
      expect(response.body.success).to.equal(true);
      expect(response.body.appVersion).to.be.a('string');

      const { data } = response.body;

      expect(data).to.be.an('object');
      expect(data._id).to.be.a('string').and.not.be.empty;
      expect(data.apiToken).to.be.a('string').and.not.be.empty;
      expect(data.newUser).to.equal(true);

      expect(data.auth).to.be.an('object');
      expect(data.auth.local).to.be.an('object');
      expect(data.auth.local.username).to.equal(credentials.username);
      expect(data.auth.local.email).to.equal(credentials.email);

      expect(data.auth.local).to.not.have.property('hashed_password');
      expect(data.auth.local).to.not.have.property('salt');
    });

    it('returns the documented error contract when passwords do not match', async () => {
      const credentials = createCredentials('invalid-register');

      const response = await superagent
        .post(`${API_BASE_URL}/user/auth/local/register`)
        .set('x-client', 'habitica-web')
        .accept('application/json')
        .send({
          username: credentials.username,
          email: credentials.email,
          password: credentials.password,
          confirmPassword: 'DifferentPassword123',
        })
        .ok(() => true);

      expect(response.status).to.equal(400);
      expect(response.headers['content-type']).to.match(/application\/json/);

      expect(response.body).to.be.an('object');
      expect(response.body.success).to.equal(false);
      expect(response.body.error).to.equal('BadRequest');
      expect(response.body.message).to.be.a('string').and.not.be.empty;

      expect(response.body.errors).to.be.an('array').and.not.be.empty;

      response.body.errors.forEach(validationError => {
        expect(validationError).to.have.property('message');
        expect(validationError.message).to.be.a('string');
        expect(validationError).to.have.property('param');
      });
    });
  });

  describe('Business process 2: local user login', () => {
    let credentials;
    let registeredUser;

    before(async () => {
      credentials = createCredentials('login');

      registeredUser = await generateUser(
        {},
        {
          username: credentials.username,
          email: credentials.email,
          password: credentials.password,
        },
      );
    });

    it('returns the documented success contract for valid credentials', async () => {
      const response = await superagent
        .post(`${API_BASE_URL}/user/auth/local/login`)
        .set('x-client', 'habitica-web')
        .accept('application/json')
        .send({
          username: credentials.username,
          password: credentials.password,
        });

      expect(response.status).to.equal(200);
      expect(response.headers['content-type']).to.match(/application\/json/);

      expect(response.body).to.be.an('object');
      expect(response.body.success).to.equal(true);
      expect(response.body.appVersion).to.be.a('string');

      const { data } = response.body;

      expect(data).to.be.an('object');
      expect(data).to.include.all.keys(
        'id',
        'apiToken',
        'newUser',
        'username',
      );

      expect(data.id).to.be.a('string').and.not.be.empty;
      expect(data.apiToken).to.be.a('string').and.not.be.empty;
      expect(data.newUser).to.be.a('boolean');
      expect(data.username).to.be.a('string');

      expect(data.id).to.equal(registeredUser._id);
      expect(data.username).to.equal(credentials.username);
      expect(data.newUser).to.equal(false);
    });

    it('returns the documented error contract for an invalid password', async () => {
      const response = await superagent
        .post(`${API_BASE_URL}/user/auth/local/login`)
        .set('x-client', 'habitica-web')
        .accept('application/json')
        .send({
          username: credentials.username,
          password: 'IncorrectPassword123',
        })
        .ok(() => true);

      expect(response.status).to.equal(401);
      expect(response.headers['content-type']).to.match(/application\/json/);

      expect(response.body).to.be.an('object');
      expect(response.body.success).to.equal(false);
      expect(response.body.error).to.equal('NotAuthorized');
      expect(response.body.message).to.be.a('string').and.not.be.empty;
      expect(response.body).to.not.have.property('data');
    });
  });
});