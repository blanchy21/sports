/**
 * Beneficiary Verification
 *
 * Fetches fresh beneficiary data from the Hive blockchain for a post.
 * Always called at curation time — never trust cached data for MEDALS allocation.
 */

import { parseJsonMetadata } from '@/lib/utils/hive';
import { logger } from '@/lib/logger';

interface HiveBeneficiary {
  account: string;
  weight: number;
}

interface PostBeneficiaryInfo {
  author: string;
  permlink: string;
  beneficiaries: HiveBeneficiary[];
  category: string;
  parentAuthor: string;
  title: string;
  tags: string[];
}

/**
 * Fetch post data including beneficiaries directly from the Hive blockchain.
 */
export async function fetchPostWithBeneficiaries(
  author: string,
  permlink: string
): Promise<PostBeneficiaryInfo | null> {
  try {
    const response = await fetch(process.env.NEXT_PUBLIC_HIVE_API_URL || 'https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_content',
        params: [author, permlink],
        id: 1,
      }),
    });

    if (!response.ok) {
      logger.error(
        `Hive API returned ${response.status} for ${author}/${permlink}`,
        'curation:beneficiary-check'
      );
      return null;
    }

    const data = await response.json();
    const post = data.result;

    if (!post || !post.author) return null;

    const jsonMetadata = parseJsonMetadata(post.json_metadata || '');
    const tags = Array.isArray(jsonMetadata.tags) ? (jsonMetadata.tags as string[]) : [];

    return {
      author: post.author,
      permlink: post.permlink,
      beneficiaries: Array.isArray(post.beneficiaries) ? post.beneficiaries : [],
      category: post.category || '',
      parentAuthor: post.parent_author || '',
      title: post.title || '',
      tags,
    };
  } catch (error) {
    logger.error(
      `Error fetching beneficiaries for ${author}/${permlink}`,
      'curation:beneficiary-check',
      error
    );
    return null;
  }
}
