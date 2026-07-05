const {
  generateUsername,
  loginRes,
  isRestrictedEmailDomain,
  RESTRICTED_EMAIL_DOMAINS,
} = require('../../../website/server/libs/auth/utils');

describe('auth utils', () => {
  describe('generateUsername', () => {
    it('generates a username', () => {
      const username = generateUsername();
      expect(typeof username).toBe('string');
    });

    it('prefixes the username with hb-', () => {
      const username = generateUsername();
      expect(username.startsWith('hb-')).toBe(true);
    });

    it('generates different usernames on each call', () => {
      const username1 = generateUsername();
      const username2 = generateUsername();
      expect(username1).not.toBe(username2);
    });
  });

  describe('isRestrictedEmailDomain', () => {
    it('returns false when no email is passed', () => {
      expect(isRestrictedEmailDomain()).toBe(false);
    });

    it('returns false for a normal email', () => {
      expect(isRestrictedEmailDomain('test@example.com')).toBe(false);
    });

    it('returns true for a restricted domain', () => {
      const restrictedEmail = `test@${RESTRICTED_EMAIL_DOMAINS[0]}`;
      expect(isRestrictedEmailDomain(restrictedEmail)).toBe(true);
    });
  });

  describe('loginRes', () => {
    let user, req, res;

    beforeEach(() => {
      user = {
        _id: 'user-id',
        apiToken: 'api-token',
        auth: {
          blocked: false,
          local: { username: 'test-user' },
        },
      };
      req = {
        url: '/api/v3/user/login', 
        headers: {} 
      };
      res = {
        respond: jest.fn() 
      };
    });

    it('responds with the user data', () => {
      loginRes(user, req, res);
      expect(res.respond).toHaveBeenCalledTimes(1);
      expect(res.respond).toHaveBeenCalledWith(200, {
        apiToken: 'api-token',
        id: 'user-id',
        newUser: false,
        username: 'test-user'
        });
    });

    it('throws if the user is blocked', () => {
      user.auth.blocked = true;
      expect(() => loginRes(user, req, res)).toThrow();
    });

    it('throws if user object is undefined', () => {
      expect(() => loginRes(undefined, req, res)).toThrow();
    });
  });
});