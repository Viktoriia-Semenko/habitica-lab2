import {
  generateUsername,
  loginRes,
  isRestrictedEmailDomain,
  RESTRICTED_EMAIL_DOMAINS,
} from '../../../../../website/server/libs/auth/utils';
import {
  generateReq,
  generateRes,
} from '../../../../helpers/api-unit.helper';

describe('auth utils', () => {
  describe('generateUsername', () => {
    it('generates a username', () => {
      const username = generateUsername();
      expect(username).to.be.a('string');
    });

    it('prefixes the username with hb-', () => {
      const username = generateUsername();
      expect(username.startsWith('hb-')).to.equal(true);
    });

    it('generates different usernames on each call', () => {
      const username1 = generateUsername();
      const username2 = generateUsername();
      expect(username1).to.not.equal(username2);
    });
  });

  describe('isRestrictedEmailDomain', () => {
    it('returns false when no email is passed', () => {
      expect(isRestrictedEmailDomain()).to.equal(false);
    });

    it('returns false for a normal email', () => {
      expect(isRestrictedEmailDomain('test@example.com')).to.equal(false);
    });

    it('returns true for a restricted domain', () => {
      const restrictedEmail = `test@${RESTRICTED_EMAIL_DOMAINS[0]}`;
      expect(isRestrictedEmailDomain(restrictedEmail)).to.equal(true);
    });
  });

  describe('loginRes', () => {
    let user; let req; let res;

    beforeEach(() => {
      user = {
        _id: 'user-id',
        apiToken: 'api-token',
        auth: {
          blocked: false,
          local: {
            username: 'test-user',
          },
        },
      };
      req = generateReq();
      res = generateRes();
    });

    it('responds with the user data', () => {
      loginRes(user, req, res);

      expect(res.respond).to.be.calledOnce;
      expect(res.respond).to.be.calledWith(200);
    });

    it('throws if the user is blocked', () => {
      user.auth.blocked = true;

      expect(() => loginRes(user, req, res)).to.throw;
    });
  });
});