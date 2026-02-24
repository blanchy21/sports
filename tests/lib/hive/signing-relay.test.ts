/** @jest-environment node */

import type { HiveOperation } from '@/types/hive-operations';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    custodialUser: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/hive/key-encryption', () => ({
  decryptKeys: jest.fn(),
}));

const mockSendOperations = jest.fn();
jest.mock('@hiveio/dhive', () => ({
  Client: jest.fn().mockImplementation(() => ({
    broadcast: { sendOperations: (...args: unknown[]) => mockSendOperations(...args) },
  })),
  PrivateKey: { fromString: jest.fn().mockReturnValue('mock-private-key') },
}));

jest.mock('@/lib/hive-workerbee/nodes', () => ({ HIVE_NODES: ['https://api.hive.blog'] }));
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  validateOperations,
  signAndBroadcast,
  OperationValidationError,
} from '@/lib/hive/signing-relay';
import { prisma } from '@/lib/db/prisma';
import { decryptKeys } from '@/lib/hive/key-encryption';

const mockFindUnique = prisma.custodialUser.findUnique as jest.Mock;
const mockDecryptKeys = decryptKeys as jest.Mock;

const USER = 'sb-testuser';

// ---------------------------------------------------------------------------
// validateOperations
// ---------------------------------------------------------------------------

describe('validateOperations', () => {
  // ---- empty / non-array input ----

  it('throws on empty array', () => {
    expect(() => validateOperations([] as HiveOperation[], USER)).toThrow(
      'Operations array must be non-empty'
    );
  });

  it('throws on non-array input', () => {
    expect(() => validateOperations(null as unknown as HiveOperation[], USER)).toThrow(
      'Operations array must be non-empty'
    );
  });

  // ---- vote ----

  it('passes for vote with correct voter', () => {
    const ops: HiveOperation[] = [
      ['vote', { voter: USER, author: 'other', permlink: 'test', weight: 10000 }],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for vote with wrong voter, including both usernames', () => {
    const ops: HiveOperation[] = [
      ['vote', { voter: 'impersonator', author: 'other', permlink: 'test', weight: 10000 }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('impersonator');
    expect(() => validateOperations(ops, USER)).toThrow(USER);
  });

  // ---- comment ----

  it('passes for comment with correct author', () => {
    const ops: HiveOperation[] = [
      [
        'comment',
        {
          author: USER,
          permlink: 'my-post',
          parent_author: '',
          parent_permlink: 'sportsblock',
          title: 'Test',
          body: 'Hello',
          json_metadata: '{}',
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for comment with wrong author', () => {
    const ops: HiveOperation[] = [
      [
        'comment',
        {
          author: 'impersonator',
          permlink: 'post',
          parent_author: '',
          parent_permlink: 'sportsblock',
          title: '',
          body: '',
          json_metadata: '{}',
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(OperationValidationError);
    expect(() => validateOperations(ops, USER)).toThrow('Comment author');
  });

  // ---- comment_options ----

  it('passes for comment_options with correct author', () => {
    const ops: HiveOperation[] = [
      [
        'comment_options',
        {
          author: USER,
          permlink: 'my-post',
          max_accepted_payout: '1000.000 HBD',
          percent_hbd: 10000,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: [],
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for comment_options with wrong author', () => {
    const ops: HiveOperation[] = [
      ['comment_options', { author: 'someone-else', permlink: 'post' }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('Comment options author');
  });

  // ---- delete_comment ----

  it('passes for delete_comment with correct author', () => {
    const ops: HiveOperation[] = [['delete_comment', { author: USER, permlink: 'my-post' }]];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for delete_comment with wrong author', () => {
    const ops: HiveOperation[] = [['delete_comment', { author: 'wrong-author', permlink: 'post' }]];
    expect(() => validateOperations(ops, USER)).toThrow('Delete comment author');
  });

  // ---- disallowed operation types ----

  it('throws for disallowed op type "transfer"', () => {
    const ops: HiveOperation[] = [
      ['transfer', { from: USER, to: 'bob', amount: '1.000 HIVE', memo: '' }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('Operation type "transfer" is not allowed');
  });

  it('throws for disallowed op type "delegate_vesting_shares"', () => {
    const ops: HiveOperation[] = [
      [
        'delegate_vesting_shares',
        { delegator: USER, delegatee: 'bob', vesting_shares: '100.000000 VESTS' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      'Operation type "delegate_vesting_shares" is not allowed'
    );
  });

  it('throws for disallowed op type "witness_vote"', () => {
    const ops: HiveOperation[] = [
      ['witness_vote', { account: USER, witness: 'some-witness', approve: true }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      'Operation type "witness_vote" is not allowed'
    );
  });

  // ---- custom_json ----

  it('passes for valid custom_json follow op', () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        { required_auths: [], required_posting_auths: [USER], id: 'follow', json: '["follow",{}]' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('passes for valid custom_json reblog op', () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        { required_auths: [], required_posting_auths: [USER], id: 'reblog', json: '["reblog",{}]' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('passes for valid custom_json community op', () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        { required_auths: [], required_posting_auths: [USER], id: 'community', json: '{}' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for custom_json with disallowed id', () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        { required_auths: [], required_posting_auths: [USER], id: 'sm_market_sell', json: '{}' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      'custom_json id "sm_market_sell" is not allowed'
    );
  });

  it('throws for custom_json with required_auths (active authority)', () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        { required_auths: [USER], required_posting_auths: [], id: 'follow', json: '{}' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      'custom_json with required_auths (active authority) is not allowed'
    );
  });

  it('throws for custom_json when user not in required_posting_auths', () => {
    const ops: HiveOperation[] = [
      [
        'custom_json',
        { required_auths: [], required_posting_auths: ['other-user'], id: 'follow', json: '{}' },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      `custom_json required_posting_auths does not include "${USER}"`
    );
  });

  // ---- account_update2 ----

  it('passes for account_update2 with correct user and allowed posting_json_metadata keys', () => {
    const ops: HiveOperation[] = [
      [
        'account_update2',
        {
          account: USER,
          posting_json_metadata: JSON.stringify({
            profile: { name: 'Test', about: 'About me' },
            name: 'Test User',
          }),
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for account_update2 with wrong account', () => {
    const ops: HiveOperation[] = [['account_update2', { account: 'other-user' }]];
    expect(() => validateOperations(ops, USER)).toThrow(
      `Account update account "other-user" does not match authenticated user "${USER}"`
    );
  });

  it('throws for account_update2 with owner key change', () => {
    const ops: HiveOperation[] = [['account_update2', { account: USER, owner: { key_auths: [] } }]];
    expect(() => validateOperations(ops, USER)).toThrow('Authority key changes are not allowed');
  });

  it('throws for account_update2 with active key change', () => {
    const ops: HiveOperation[] = [
      ['account_update2', { account: USER, active: { key_auths: [] } }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('Authority key changes are not allowed');
  });

  it('throws for account_update2 with posting key change', () => {
    const ops: HiveOperation[] = [
      ['account_update2', { account: USER, posting: { key_auths: [] } }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('Authority key changes are not allowed');
  });

  it('throws for account_update2 with memo_key change', () => {
    const ops: HiveOperation[] = [['account_update2', { account: USER, memo_key: 'STM...' }]];
    expect(() => validateOperations(ops, USER)).toThrow('Authority key changes are not allowed');
  });

  it('throws for account_update2 with non-empty json_metadata', () => {
    const ops: HiveOperation[] = [
      ['account_update2', { account: USER, json_metadata: '{"foo":"bar"}' }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      'json_metadata changes are not allowed via the signing relay (use posting_json_metadata)'
    );
  });

  it('throws for account_update2 with disallowed posting_json_metadata key', () => {
    const ops: HiveOperation[] = [
      [
        'account_update2',
        {
          account: USER,
          posting_json_metadata: JSON.stringify({ profile: {}, malicious_key: 'bad' }),
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow(
      'posting_json_metadata key "malicious_key" is not allowed'
    );
  });

  it('throws for account_update2 with invalid JSON in posting_json_metadata', () => {
    const ops: HiveOperation[] = [
      ['account_update2', { account: USER, posting_json_metadata: 'not-json{' }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('posting_json_metadata must be valid JSON');
  });

  it('passes for account_update2 with valid profile URLs', () => {
    const ops: HiveOperation[] = [
      [
        'account_update2',
        {
          account: USER,
          posting_json_metadata: JSON.stringify({
            profile: {
              website: 'https://example.com',
              profile_image: 'https://images.hive.blog/avatar.jpg',
              cover_image: 'http://example.com/cover.png',
            },
          }),
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  it('throws for account_update2 with javascript: URL in profile field', () => {
    const ops: HiveOperation[] = [
      [
        'account_update2',
        {
          account: USER,
          posting_json_metadata: JSON.stringify({
            profile: { website: 'javascript:alert(1)' },
          }),
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('must use http or https protocol');
  });

  it('throws for account_update2 with invalid URL in profile_image', () => {
    const ops: HiveOperation[] = [
      [
        'account_update2',
        {
          account: USER,
          posting_json_metadata: JSON.stringify({
            profile: { profile_image: 'not-a-url' },
          }),
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('must be a valid URL');
  });

  it('allows empty string profile URL fields', () => {
    const ops: HiveOperation[] = [
      [
        'account_update2',
        {
          account: USER,
          posting_json_metadata: JSON.stringify({
            profile: { website: '', profile_image: '', cover_image: '' },
          }),
        },
      ],
    ];
    expect(() => validateOperations(ops, USER)).not.toThrow();
  });

  // ---- multiple operations ----

  it('throws on second operation when first is valid but second is invalid', () => {
    const ops: HiveOperation[] = [
      ['vote', { voter: USER, author: 'other', permlink: 'test', weight: 10000 }],
      ['transfer', { from: USER, to: 'bob', amount: '1.000 HIVE', memo: '' }],
    ];
    expect(() => validateOperations(ops, USER)).toThrow('Operation type "transfer" is not allowed');
  });
});

// ---------------------------------------------------------------------------
// signAndBroadcast
// ---------------------------------------------------------------------------

describe('signAndBroadcast', () => {
  const CUSTODIAL_ID = 'cust-123';
  const TX_ID = 'abc123txid';
  const ENCRYPTED_DATA = {
    encryptedKeys: 'encrypted-blob',
    encryptionIv: 'iv-value',
    encryptionSalt: 'salt-value',
  };
  const VALID_OPS: HiveOperation[] = [
    ['vote', { voter: USER, author: 'other', permlink: 'post', weight: 10000 }],
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds user, decrypts keys, broadcasts, and returns transactionId', async () => {
    mockFindUnique.mockResolvedValue(ENCRYPTED_DATA);
    mockDecryptKeys.mockReturnValue(JSON.stringify({ posting: '5Jfake', active: '5Jfake2' }));
    mockSendOperations.mockResolvedValue({ id: TX_ID });

    const result = await signAndBroadcast(USER, CUSTODIAL_ID, VALID_OPS);

    expect(result).toEqual({ transactionId: TX_ID });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: CUSTODIAL_ID },
      select: { encryptedKeys: true, encryptionIv: true, encryptionSalt: true },
    });
    expect(mockDecryptKeys).toHaveBeenCalledWith(
      ENCRYPTED_DATA.encryptedKeys,
      ENCRYPTED_DATA.encryptionIv,
      ENCRYPTED_DATA.encryptionSalt
    );
    expect(mockSendOperations).toHaveBeenCalled();
  });

  it('throws when no encrypted keys found for custodial user', async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(signAndBroadcast(USER, CUSTODIAL_ID, VALID_OPS)).rejects.toThrow(
      'keys have been removed from our server'
    );
  });

  it('throws when posting key is missing from decrypted keys', async () => {
    mockFindUnique.mockResolvedValue(ENCRYPTED_DATA);
    mockDecryptKeys.mockReturnValue(JSON.stringify({ active: '5Jfake' }));

    await expect(signAndBroadcast(USER, CUSTODIAL_ID, VALID_OPS)).rejects.toThrow(
      'Posting key not found in decrypted keys'
    );
  });

  it('propagates broadcast errors', async () => {
    mockFindUnique.mockResolvedValue(ENCRYPTED_DATA);
    mockDecryptKeys.mockReturnValue(JSON.stringify({ posting: '5Jfake' }));
    mockSendOperations.mockRejectedValue(new Error('Network failure'));

    await expect(signAndBroadcast(USER, CUSTODIAL_ID, VALID_OPS)).rejects.toThrow(
      'Network failure'
    );
  });
});
