import {
  generateUser,
  requester,
} from '../../test/helpers/api-integration/v3';

describe('GET /user authentication security', () => {
  let user;
  let blockedUser;

  before(async () => {
    user = await generateUser();

    blockedUser = await generateUser({
      'auth.blocked': true,
    });
  });

  it('rejects a request without authentication headers', async () => {
    const unauthenticatedClient = requester(
      {},
      {
        'x-client': 'habitica-web',
      },
    );

    try {
      await unauthenticatedClient.get('/user');
      expect.fail('The request should have been rejected');
    } catch (err) {
      expect(err.code).to.equal(401);
      expect(err.error).to.equal('NotAuthorized');
      expect(err.message).to.be.a('string');
    }
  });

  it('rejects a request with an invalid API token', async () => {
    const clientWithInvalidToken = requester(
      {},
      {
        'x-api-user': user._id,
        'x-api-key': 'invalid-api-token',
        'x-client': 'habitica-web',
      },
    );

    try {
      await clientWithInvalidToken.get('/user');
      expect.fail('The request should have been rejected');
    } catch (err) {
      expect(err.code).to.equal(401);
      expect(err.error).to.equal('invalid_credentials');
      expect(err.message).to.be.a('string');
    }
  });

  it('allows access when the user ID and API token are valid', async () => {
    const returnedUser = await user.get('/user');

    expect(returnedUser._id).to.equal(user._id);
  });

  it('does not expose private authentication fields', async () => {
    const returnedUser = await user.get('/user');

    expect(returnedUser.apiToken).to.not.exist;
    expect(returnedUser.auth.local.hashed_password).to.not.exist;
    expect(returnedUser.auth.local.salt).to.not.exist;
  });

  it('rejects valid credentials when the account is blocked', async () => {
    try {
      await blockedUser.get('/user');
      expect.fail('The request should have been rejected');
    } catch (err) {
      expect(err.code).to.equal(401);
      expect(err.error).to.equal('NotAuthorized');
      expect(err.message).to.be.a('string');
    }
  });
});