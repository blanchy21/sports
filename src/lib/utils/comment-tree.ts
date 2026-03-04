/**
 * Build a threaded comment tree from a flat list of comments.
 * Used by both CommentsModal (full posts) and InlineReplies (sportsbites).
 */

export interface CommentData {
  author: string;
  permlink: string;
  body: string;
  created: string;
  parent_author?: string;
  parent_permlink?: string;
  net_votes?: number;
  source?: string;
  parentCommentId?: string;
  [key: string]: unknown;
}

export interface CommentNode {
  comment: CommentData;
  children: CommentNode[];
}

export interface FlatComment {
  node: CommentNode;
  depth: number;
  parentAuthor?: string;
}

/**
 * Organise a flat array of comments into a tree based on parent relationships.
 * Comments whose parent is the root post become top-level nodes; everything else
 * is nested under its parent comment.
 */
export function buildCommentTree(
  comments: CommentData[],
  rootAuthor: string,
  rootPermlink: string
): CommentNode[] {
  const byPermlink = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // Create all nodes first
  for (const comment of comments) {
    byPermlink.set(comment.permlink, { comment, children: [] });
  }

  // Link children to parents
  for (const comment of comments) {
    const node = byPermlink.get(comment.permlink)!;
    let parentKey: string | undefined;

    if (comment.source === 'soft' && comment.parentCommentId) {
      parentKey = comment.parentCommentId;
    } else if (
      comment.parent_author &&
      comment.parent_permlink &&
      !(comment.parent_author === rootAuthor && comment.parent_permlink === rootPermlink)
    ) {
      parentKey = comment.parent_permlink;
    }

    const parentNode = parentKey ? byPermlink.get(parentKey) : undefined;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Walk the tree into a flat list preserving depth (capped at maxDepth). */
export function flattenCommentTree(tree: CommentNode[], maxDepth = 2): FlatComment[] {
  const result: FlatComment[] = [];

  function walk(nodes: CommentNode[], depth: number, parentAuth?: string) {
    for (const n of nodes) {
      result.push({ node: n, depth, parentAuthor: parentAuth });
      walk(n.children, Math.min(depth + 1, maxDepth), n.comment.author);
    }
  }

  walk(tree, 0);
  return result;
}
