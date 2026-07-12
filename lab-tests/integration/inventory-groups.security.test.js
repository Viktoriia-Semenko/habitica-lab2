import {
  generateUser,
  createAndPopulateGroup,
  requester,
  translate as t,
} from '../../test/helpers/api-integration/v3';

describe('groups and items security', () => {
  it('rejects a request without auth headers (GET /groups)', async () => {
    const client = requester({}, { 'x-client': 'habitica-web' });

    try {
      await client.get('/groups');
      expect.fail('The request should have been rejected');
    } catch (err) {
      expect(err.code).to.equal(401);
      expect(err.error).to.equal('NotAuthorized');
    }
  });

  it('rejects a group update from a non-leader member', async () => {
    const { group, members } = await createAndPopulateGroup({
      groupDetails: { name: 'Test Party', type: 'party' },
      members: 1,
    });
    const nonLeader = members[0];

    await expect(nonLeader.put(`/groups/${group._id}`, {
      name: 'Hacked name',
    })).to.eventually.be.rejected.and.eql({
      code: 401,
      error: 'NotAuthorized',
      message: t('messageGroupOnlyLeaderCanUpdate'),
    });
  });

  it('rejects equipping with an invalid type', async () => {
    const user = await generateUser();

    await expect(user.post('/user/equip/notAValidType/weapon_warrior_0'))
      .to.eventually.be.rejected.and.have.property('code', 400);
  });
});
