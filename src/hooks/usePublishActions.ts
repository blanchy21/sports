import { useCallback } from 'react';
import { toast } from '@/components/core/Toast';
import { publishPost, validatePostData } from '@/lib/hive-workerbee/posting';
import type { PostData } from '@/lib/hive-workerbee/posting';
import { logger } from '@/lib/logger';
import type { usePublishForm } from './usePublishForm';

type FormState = ReturnType<typeof usePublishForm>;

export function usePublishActions(form: FormState) {
  const handleSaveDraft = useCallback(() => {
    if (typeof window === 'undefined') return;

    const draftId = form.searchParams.get('draft');
    const existingDrafts = JSON.parse(localStorage.getItem('drafts') || '[]');

    const draftData = {
      id: draftId || Date.now().toString(),
      title: form.title,
      content: form.content,
      excerpt: form.excerpt,
      sport: form.selectedSport,
      tags: form.tags,
      imageUrl: form.coverImage,
      createdAt: draftId
        ? existingDrafts.find((d: { id: string }) => d.id === draftId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wordCount: form.content.split(/\s+/).filter((word: string) => word.length > 0).length,
    };

    if (draftId) {
      const updatedDrafts = existingDrafts.map((draft: { id: string }) =>
        draft.id === draftId ? draftData : draft
      );
      try {
        localStorage.setItem('drafts', JSON.stringify(updatedDrafts));
        form.addToast(toast.success('Success', 'Draft updated!'));
      } catch (error) {
        logger.error('Error saving draft', 'PublishPage', error);
        form.addToast(toast.error('Error', 'Failed to save draft.'));
      }
    } else {
      existingDrafts.push(draftData);
      try {
        localStorage.setItem('drafts', JSON.stringify(existingDrafts));
        form.addToast(toast.success('Success', 'Draft saved!'));
      } catch (error) {
        logger.error('Error saving draft', 'PublishPage', error);
        form.addToast(toast.error('Error', 'Failed to save draft.'));
      }
    }
  }, [form]);

  /**
   * Check posting authority before opening schedule modal.
   * For Hive users: verify @sportsblock has posting authority.
   * For soft users: no authority check needed (scheduled posts
   * are for Hive publishing via the cron job).
   */
  const handleScheduleClick = useCallback(async () => {
    if (form.authType !== 'hive' || !form.hiveUser?.username) {
      // Soft users can schedule too — the post is stored in DB
      form.setShowScheduleModal(true);
      return;
    }

    try {
      // Check posting authority via account summary endpoint
      const res = await fetch(
        `/api/hive/account/summary?username=${form.hiveUser.username}`
      );
      const data = await res.json();
      if (!data.success || !data.account) {
        form.setShowScheduleModal(true); // Fall through, let server catch errors
        return;
      }

      const hasAuthority = data.account.posting?.account_auths?.some(
        ([auth]: [string, number]) => auth === 'sportsblock'
      );

      if (hasAuthority) {
        form.setShowScheduleModal(true);
      } else {
        form.setShowAuthorityPrompt(true);
      }
    } catch (error) {
      logger.error('Error checking posting authority', 'PublishPage', error);
      // On error, still let them try to schedule
      form.setShowScheduleModal(true);
    }
  }, [form]);

  const handleSchedule = useCallback(
    async (scheduledAt: Date) => {
      if (!form.user) return;

      try {
        if (!form.title.trim()) {
          form.setPublishError('Title is required');
          return;
        }
        if (!form.content.trim()) {
          form.setPublishError('Content is required');
          return;
        }
        if (!form.selectedSport) {
          form.setPublishError('Please select a sport category');
          return;
        }

        const scheduleResponse = await fetch('/api/soft/scheduled-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: form.user.id,
            postData: {
              authorId: form.user.id,
              authorUsername: form.user.username,
              authorDisplayName: form.user.displayName,
              authorAvatar: form.user.avatar,
              title: form.title.trim(),
              content: form.content.trim(),
              tags: form.tags,
              sportCategory: form.selectedSport,
              featuredImage: form.coverImage || undefined,
              communityId: form.selectedCommunity?.id,
              communitySlug: form.selectedCommunity?.slug,
              communityName: form.selectedCommunity?.name,
            },
            scheduledAt: scheduledAt.toISOString(),
          }),
        });
        const scheduleData = await scheduleResponse.json();
        if (!scheduleData.success) {
          throw new Error(scheduleData.error || 'Failed to schedule post');
        }

        if (form.tags.length > 0) {
          form.addRecentTags(form.tags);
        }

        form.addToast(
          toast.success('Scheduled', `Post scheduled for ${scheduledAt.toLocaleString()}`)
        );
        form.router.push('/drafts?tab=scheduled');
      } catch (error) {
        logger.error('Error scheduling post', 'PublishPage', error);
        form.setPublishError('Failed to schedule post');
      }
    },
    [form]
  );

  const handlePublish = useCallback(async () => {
    if (!form.user) return;

    form.setPublishError(null);
    form.setIsPublishing(true);

    try {
      if (!form.title.trim()) {
        form.setPublishError('Title is required');
        return;
      }
      if (!form.content.trim()) {
        form.setPublishError('Content is required');
        return;
      }
      if (!form.selectedSport) {
        form.setPublishError('Please select a sport category');
        return;
      }

      if (form.authType === 'hive' && form.hiveUser?.username) {
        // HIVE USER: Publish to blockchain
        const hiveBeneficiaries = form.beneficiaries.map((b) => ({
          account: b.account,
          weight: b.weight * 100,
        }));

        const hasAiMedia =
          (form.coverImage && form.aiGeneratedUrls.has(form.coverImage)) ||
          Array.from(form.aiGeneratedUrls).some((url) => form.content.includes(url));

        const postData: PostData = {
          title: form.title.trim(),
          body: form.content.trim(),
          sportCategory: form.selectedSport,
          tags: form.tags,
          featuredImage: form.coverImage || undefined,
          author: form.hiveUser.username,
          subCommunity: form.selectedCommunity
            ? {
                id: form.selectedCommunity.id,
                slug: form.selectedCommunity.slug,
                name: form.selectedCommunity.name,
              }
            : undefined,
          beneficiaries: hiveBeneficiaries,
          rewardsOption: form.rewardsOption,
          aiGenerated: hasAiMedia ? { coverImage: true } : undefined,
        };

        const validation = validatePostData(postData);
        if (!validation.isValid) {
          form.setPublishError(validation.errors.join(', '));
          return;
        }

        if (form.rcStatus && !form.rcStatus.canPost) {
          form.setPublishError(
            form.rcStatus.message || 'Insufficient Resource Credits to post.'
          );
          return;
        }

        const result = await publishPost(postData, form.broadcast);

        if (result.success) {
          if (form.tags.length > 0) {
            form.addRecentTags(form.tags);
          }
          form.addToast(
            toast.success('Success', `Post published to Hive! View: ${result.url}`)
          );
          if (result.transactionId) {
            form.confirmTx(result.transactionId);
          }
          form.router.push('/feed');
        } else {
          form.setPublishError(result.error || 'Failed to publish post');
        }
      } else {
        // SOFT USER: Publish via API
        const response = await fetch('/api/posts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorId: form.user.id,
            authorUsername: form.user.username,
            authorDisplayName: form.user.displayName,
            authorAvatar: form.user.avatar,
            title: form.title.trim(),
            content: form.content.trim(),
            tags: form.tags,
            sportCategory: form.selectedSport,
            featuredImage: form.coverImage || undefined,
            communityId: form.selectedCommunity?.id,
            communitySlug: form.selectedCommunity?.slug,
            communityName: form.selectedCommunity?.name,
          }),
        });

        const data = await response.json();

        if (data.success) {
          if (form.tags.length > 0) {
            form.addRecentTags(form.tags);
          }
          if (data.postLimitInfo) {
            form.setPostLimitInfo(data.postLimitInfo);
          }
          form.setShowPostPublishedPrompt(true);
        } else if (data.limitReached) {
          form.setPublishError(
            data.message ||
              `You've reached the limit of ${data.limit} posts. Upgrade to Hive for unlimited posts!`
          );
          form.setPostLimitInfo({
            currentCount: data.currentCount,
            limit: data.limit,
            remaining: 0,
            isNearLimit: true,
            upgradePrompt: data.message,
          });
        } else {
          form.setPublishError(data.error || 'Failed to publish post');
        }
      }
    } catch (error) {
      logger.error('Error publishing post', 'PublishPage', error);
      form.setPublishError('An unexpected error occurred while publishing.');
    } finally {
      form.setIsPublishing(false);
    }
  }, [form]);

  return { handleSaveDraft, handleScheduleClick, handleSchedule, handlePublish };
}
