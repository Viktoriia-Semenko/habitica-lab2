import equip from '../../../website/common/script/ops/equip';
import { unEquipByType } from '../../../website/common/script/ops/unequip';
import sell from '../../../website/common/script/ops/sell';
import isPinned from '../../../website/common/script/libs/isPinned';
import gold from '../../../website/common/script/libs/gold';
import silver from '../../../website/common/script/libs/silver';
import {
  checkPinnedAreasForNullEntries,
  addPinnedGear,
  removeItemByPath,
} from '../../../website/common/script/ops/pinnedGearUtils';
import { leaveGroup } from '../../../website/server/libs/groups';
import { model as Group } from '../../../website/server/models/group';
import { NotFound, BadRequest } from '../../../website/common/script/libs/errors';

function makeBaseUser () {
  return {
    items: {
      mounts: {}, pets: {}, currentMount: '', currentPet: '',
      gear: {
        owned: {},
        equipped: { weapon: 'weapon_base_0' },
        costume: { weapon: 'weapon_base_0' },
      },
      eggs: {},
    },
    preferences: { background: 'violet' },
    stats: { gp: 0 },
    pinnedItems: [],
    unpinnedItems: [],
    markModified: () => {},
  };
}

describe('equip', () => {
  let user;

  beforeEach(() => {
    user = makeBaseUser();
    user.items.gear.owned = { weapon_warrior_0: true };
  });

  it('equips a gear item the user owns', () => {
    equip(user, { params: { key: 'weapon_warrior_0', type: 'equipped' } });

    expect(user.items.gear.equipped.weapon).to.equal('weapon_warrior_0');
  });

  it('un-equips it again if called a second time (toggle)', () => {
    equip(user, { params: { key: 'weapon_warrior_0', type: 'equipped' } });
    equip(user, { params: { key: 'weapon_warrior_0', type: 'equipped' } });

    expect(user.items.gear.equipped.weapon).to.equal('weapon_base_0');
  });

  it('throws NotFound when the item does not belong to the user', () => {
    expect(() => equip(user, { params: { key: 'weapon_warrior_2', type: 'equipped' } }))
      .to.throw(NotFound);
  });
});

describe('unEquipByType', () => {
  it('unequips mount, pet and background when type=all', () => {
    const user = makeBaseUser();
    user.items.currentMount = 'Wolf-Base';
    user.items.currentPet = 'Wolf-Base';

    unEquipByType(user, { params: { type: 'all' } });

    expect(user.items.currentMount).to.equal('');
    expect(user.items.currentPet).to.equal('');
    expect(user.preferences.background).to.equal('');
  });

  it('throws BadRequest for an invalid type', () => {
    const user = makeBaseUser();

    expect(() => unEquipByType(user, { params: { type: 'notAValidType' } }))
      .to.throw(BadRequest);
  });
});

describe('sell', () => {
  it('reduces the item count and adds gold to stats.gp', () => {
    const user = makeBaseUser();
    user.items.eggs.Wolf = 5;

    sell(user, { params: { key: 'Wolf', type: 'eggs' }, query: { amount: 2 } });

    expect(user.items.eggs.Wolf).to.equal(3);
    expect(user.stats.gp).to.be.above(0);
  });

  it('throws NotFound when trying to sell more than the user owns', () => {
    const user = makeBaseUser();
    user.items.eggs.Wolf = 1;

    expect(() => sell(user, {
      params: { key: 'Wolf', type: 'eggs' }, query: { amount: 10 },
    })).to.throw(NotFound);
  });
});

describe('isPinned', () => {
  it('returns true when the item is in user.pinnedItems', () => {
    const user = { pinnedItems: [{ path: 'gear.flat.weapon_warrior_0' }], unpinnedItems: [] };

    expect(isPinned(user, { path: 'gear.flat.weapon_warrior_0' })).to.equal(true);
  });

  it('returns false when the item is nowhere to be found', () => {
    const user = { pinnedItems: [], unpinnedItems: [] };

    expect(isPinned(user, { path: 'gear.flat.weapon_warrior_0' })).to.equal(false);
  });
});

describe('gold', () => {
  it('floors a decimal amount down', () => {
    expect(gold(12.9)).to.equal(12);
  });
});

describe('silver', () => {
  it('returns the cent portion of an amount', () => {
    expect(silver(12.5)).to.equal('50');
  });
});

describe('checkPinnedAreasForNullEntries', () => {
  it('removes null/undefined entries from pinnedItems and unpinnedItems', () => {
    const user = {
      pinnedItems: [{ path: 'a' }, null, undefined],
      unpinnedItems: [null, { path: 'c' }],
    };

    checkPinnedAreasForNullEntries(user);

    expect(user.pinnedItems).to.eql([{ path: 'a' }]);
    expect(user.unpinnedItems).to.eql([{ path: 'c' }]);
  });
});

describe('addPinnedGear / removeItemByPath', () => {
  it('adds a new pinned item and can remove it again', () => {
    const user = { pinnedItems: [] };

    addPinnedGear(user, 'gear.flat', 'gear.flat.weapon_warrior_0');
    expect(user.pinnedItems).to.eql([{ type: 'gear.flat', path: 'gear.flat.weapon_warrior_0' }]);

    const removed = removeItemByPath(user, 'gear.flat.weapon_warrior_0');
    expect(removed).to.equal(true);
    expect(user.pinnedItems).to.eql([]);
  });
});

describe('leaveGroup', () => {
  let fakeGroup;
  let user;
  let res;

  beforeEach(() => {
    fakeGroup = {
      type: 'guild',
      quest: null,
      _id: 'group-id-1',
      leave: sinon.stub().resolves(),
      hasNotCancelled: () => false,
    };
    user = {
      _id: 'user-id-1',
      newMessages: {},
      notifications: [],
      markModified: sinon.spy(),
      save: sinon.stub().resolves(),
    };
    res = { t: sinon.stub().returnsArg(0) };

    sinon.stub(Group, 'getGroup').resolves(fakeGroup);
  });

  afterEach(() => {
    Group.getGroup.restore();
  });

  it('leaves the group and saves the user', async () => {
    await leaveGroup({
      groupId: 'group-id-1', user, res, keep: 'keep-all', keepChallenges: 'remain-in-challenges',
    });

    expect(fakeGroup.leave).to.be.calledOnce;
    expect(user.save).to.be.calledOnce;
  });

  it('throws NotFound when the group does not exist', async () => {
    Group.getGroup.resolves(null);

    await expect(leaveGroup({
      groupId: 'missing-group', user, res, keep: 'keep-all', keepChallenges: 'remain-in-challenges',
    })).to.be.rejectedWith(NotFound);
  });
});
