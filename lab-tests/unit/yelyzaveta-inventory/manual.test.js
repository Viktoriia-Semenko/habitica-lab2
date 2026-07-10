import {
  validateItemPath,
  castItemVal,
} from '../../../website/server/libs/items/utils';
import { removeMessagesFromMember } from '../../../website/server/libs/groups';

describe('validateItemPath', () => {
  it('returns false for a path that does not start with items.', () => {
    expect(validateItemPath('gear.owned.weapon_warrior_1')).to.equal(false);
  });

  it('returns true for an owned gear path that exists in content', () => {
    expect(validateItemPath('items.gear.owned.weapon_warrior_0')).to.equal(true);
  });

  it('returns false for an owned gear path that does not exist in content', () => {
    expect(validateItemPath('items.gear.owned.weapon_not_real')).to.equal(false);
  });

  it('returns true for a normal schema path like items.currentPet', () => {
    expect(validateItemPath('items.currentPet')).to.equal(true);
  });
});

describe('castItemVal', () => {
  it('returns the value untouched when the path is not an item path', () => {
    expect(castItemVal('something.else', 'hello')).to.equal('hello');
  });

  it('turns egg item values into numbers', () => {
    expect(castItemVal('items.eggs.Wolf', '3')).to.equal(3);
  });

  it('turns owned gear values into true/false', () => {
    expect(castItemVal('items.gear.owned.weapon_warrior_0', 'true')).to.equal(true);
    expect(castItemVal('items.gear.owned.weapon_warrior_0', 'false')).to.equal(false);
  });

  it('turns mount values of "null" into null', () => {
    expect(castItemVal('items.mounts.Wolf-Base', 'null')).to.equal(null);
  });
});

describe('removeMessagesFromMember', () => {
  let member;

  beforeEach(() => {
    member = {
      newMessages: {
        'group-1': true,
      },
      notifications: [
        { type: 'NEW_CHAT_MESSAGE', data: { group: { id: 'group-1' } } },
        { type: 'NEW_CHAT_MESSAGE', data: { group: { id: 'group-2' } } },
        { type: 'SOME_OTHER_NOTIFICATION', data: {} },
      ],
      markModified: () => {},
    };
  });

  it('removes the newMessages entry for the given group', () => {
    removeMessagesFromMember(member, 'group-1');

    expect(member.newMessages['group-1']).to.equal(undefined);
  });

  it('does nothing if the member has no newMessages for that group', () => {
    removeMessagesFromMember(member, 'group-does-not-exist');

    expect(member.newMessages['group-1']).to.equal(true);
  });

  it('removes only the chat notification for the given group', () => {
    removeMessagesFromMember(member, 'group-1');

    const groupIds = member.notifications
      .filter(n => n.type === 'NEW_CHAT_MESSAGE')
      .map(n => n.data.group.id);

    expect(groupIds).to.eql(['group-2']);
  });

  it('keeps notifications of a different type untouched', () => {
    removeMessagesFromMember(member, 'group-1');

    const hasOtherNotification = member.notifications
      .some(n => n.type === 'SOME_OTHER_NOTIFICATION');
    expect(hasOtherNotification).to.equal(true);
  });
});
