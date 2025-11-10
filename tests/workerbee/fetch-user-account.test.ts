/** @jest-environment node */

import { fetchUserAccount } from '@/lib/hive-workerbee/account';

jest.mock('@/lib/hive-workerbee/optimization', () => ({
  getAccountOptimized: jest.fn(),
  getContentOptimized: jest.fn(),
}));

jest.mock('@/lib/hive-workerbee/api', () => ({
  makeHiveApiCall: jest.fn(),
}));

const { getAccountOptimized, getContentOptimized } = jest.requireMock('@/lib/hive-workerbee/optimization');
const { makeHiveApiCall } = jest.requireMock('@/lib/hive-workerbee/api');

const baseAccount = {
  name: 'sample',
  balance: '1.000 HIVE',
  hbd_balance: '2.000 HBD',
  savings_balance: '0.000 HIVE',
  savings_hbd_balance: '0.000 HBD',
  vesting_shares: '1000.000000 VESTS',
  comment_count: 0,
  lifetime_vote_count: 0,
  json_metadata: '{}',
  posting_json_metadata: '{}',
  profile: {},
  posting: {},
  memo_key: '',
  owner: {},
  active: {},
  last_post: null,
  last_vote_time: null,
  created: '2020-01-01T00:00:00',
  reputation: '0',
  can_vote: true,
  voting_power: 0,
};

beforeEach(() => {
  jest.clearAllMocks();

  getAccountOptimized.mockResolvedValue({
    ...baseAccount,
  });

  getContentOptimized.mockImplementation((method: string) => {
    switch (method) {
      case 'get_account_reputations':
        return Promise.resolve([{ reputation: '1000' }]);
      case 'get_follow_count':
        return Promise.resolve({ follower_count: 5, following_count: 3 });
      case 'get_dynamic_global_properties':
        return Promise.resolve({
          total_vesting_fund_hive: '1000.000 HIVE',
          total_vesting_shares: '1000.000000 VESTS',
          hbd_interest_rate: 0,
        });
      default:
        return Promise.resolve(null);
    }
  });

  makeHiveApiCall.mockImplementation((api: string, method: string) => {
    if (api === 'condenser_api' && method === 'get_dynamic_global_properties') {
      return Promise.resolve({
        total_vesting_fund_hive: '1000.000 HIVE',
        total_vesting_shares: '1000.000000 VESTS',
        hbd_interest_rate: 0,
      });
    }

    if (api === 'rc_api' && method === 'find_rc_accounts') {
      return Promise.resolve({
        rc_accounts: [
          {
            rc_manabar: { current_mana: '1000' },
            max_rc: '1000',
          },
        ],
      });
    }

    if (api === 'condenser_api' && method === 'get_discussions_by_author_before_date') {
      return Promise.resolve([
        {
          author: 'sample',
          permlink: 'post-1',
          net_votes: 3,
          children: 2,
        },
        {
          author: 'sample',
          permlink: 'post-2',
          net_votes: 1,
          children: 0,
        },
      ]);
    }

    return Promise.resolve({});
  });
});

describe('fetchUserAccount', () => {
  it('derives stats without querying get_content_replies', async () => {
    await fetchUserAccount('sample');

    expect(makeHiveApiCall).not.toHaveBeenCalledWith(
      'condenser_api',
      'get_content_replies',
      expect.anything()
    );
  });
});

