import { useCallback } from 'react';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, toast } from '@/components/core/Toast';
import { logger } from '@/lib/logger';
import { type AnyPost, getPostId } from '@/lib/utils/post-helpers';

type BookmarkablePost = AnyPost;

export const useBookmarks = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const {
    bookmarks,
    isLoading,
    error,
    addBookmark: storeAddBookmark,
    removeBookmark: storeRemoveBookmark,
    isBookmarked: storeIsBookmarked,
    getBookmarks: storeGetBookmarks,
    clearBookmarks: storeClearBookmarks,
    setLoading,
    setError,
  } = useBookmarkStore();

  const addBookmark = useCallback(
    async (post: BookmarkablePost) => {
      if (!user) {
        addToast(toast.error('Authentication Required', 'Please sign in to bookmark posts.'));
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const postId = getPostId(post);

        // Check if already bookmarked
        if (storeIsBookmarked(postId, user.id)) {
          addToast(toast.info('Already Bookmarked', 'This post is already in your bookmarks.'));
          return;
        }

        storeAddBookmark(post, user.id);
        addToast(toast.success('Bookmarked!', 'Post added to your bookmarks.'));
      } catch (err) {
        logger.error('Error adding bookmark', 'useBookmarks', err);
        setError('Failed to bookmark post. Please try again.');
        addToast(toast.error('Bookmark Failed', 'Failed to bookmark post. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [user, storeAddBookmark, storeIsBookmarked, addToast, setLoading, setError]
  );

  const removeBookmark = useCallback(
    async (post: BookmarkablePost) => {
      if (!user) {
        addToast(toast.error('Authentication Required', 'Please sign in to manage bookmarks.'));
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const postId = getPostId(post);
        storeRemoveBookmark(postId, user.id);
        addToast(toast.success('Removed', 'Post removed from your bookmarks.'));
      } catch (err) {
        logger.error('Error removing bookmark', 'useBookmarks', err);
        setError('Failed to remove bookmark. Please try again.');
        addToast(toast.error('Remove Failed', 'Failed to remove bookmark. Please try again.'));
      } finally {
        setLoading(false);
      }
    },
    [user, storeRemoveBookmark, addToast, setLoading, setError]
  );

  const toggleBookmark = useCallback(
    async (post: BookmarkablePost) => {
      if (!user) {
        addToast(toast.error('Authentication Required', 'Please sign in to bookmark posts.'));
        return;
      }

      const postId = getPostId(post);

      if (storeIsBookmarked(postId, user.id)) {
        await removeBookmark(post);
      } else {
        await addBookmark(post);
      }
    },
    [user, storeIsBookmarked, addBookmark, removeBookmark, addToast]
  );

  const isBookmarked = useCallback(
    (post: BookmarkablePost) => {
      if (!user) return false;
      const postId = getPostId(post);
      return storeIsBookmarked(postId, user.id);
    },
    [user, storeIsBookmarked]
  );

  const getUserBookmarks = useCallback(() => {
    if (!user) return [];
    return storeGetBookmarks(user.id);
  }, [user, storeGetBookmarks]);

  const clearAllBookmarks = useCallback(async () => {
    if (!user) {
      addToast(toast.error('Authentication Required', 'Please sign in to manage bookmarks.'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      storeClearBookmarks(user.id);
      addToast(toast.success('Cleared', 'All bookmarks have been cleared.'));
    } catch (err) {
      logger.error('Error clearing bookmarks', 'useBookmarks', err);
      setError('Failed to clear bookmarks. Please try again.');
      addToast(toast.error('Clear Failed', 'Failed to clear bookmarks. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [user, storeClearBookmarks, addToast, setLoading, setError]);

  return {
    bookmarks,
    isLoading,
    error,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    getUserBookmarks,
    clearAllBookmarks,
  };
};
