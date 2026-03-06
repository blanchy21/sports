'use client';

import React, { Suspense } from 'react';
import { Button } from '@/components/core/Button';
import { Eye, EyeOff, Save, Send, AlertCircle, MoreVertical, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils/client';
import { usePublishForm } from '@/hooks/usePublishForm';
import { useEditorActions } from '@/hooks/useEditorActions';
import { usePublishActions } from '@/hooks/usePublishActions';
import { ImageDialog } from '@/components/publish/ImageDialog';
import { LinkDialog } from '@/components/publish/LinkDialog';
import { PostPublishedModal } from '@/components/publish/PostPublishedModal';
import { MarkdownPreview } from '@/components/publish/MarkdownPreview';
import { ScheduleModal } from '@/components/publish/ScheduleModal';
import { PostingAuthorityPrompt } from '@/components/publish/PostingAuthorityPrompt';
import { PublishEditorPanel } from '@/components/publish/PublishEditorPanel';
import { TopNavigation } from '@/components/layout/TopNavigation';

function PublishPageContent() {
  const form = usePublishForm();
  const editor = useEditorActions({
    content: form.content,
    setContent: form.setContent,
    textareaRef: form.textareaRef,
    cursorPositionRef: form.cursorPositionRef,
    setShowImageDialog: form.setShowImageDialog,
    setShowLinkDialog: form.setShowLinkDialog,
    setPublishError: form.setPublishError,
  });
  const { handleSaveDraft, handleScheduleClick, handleSchedule, handlePublish } =
    usePublishActions(form);

  if (form.isAuthLoading) return null;

  if (!form.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Authentication Required</h2>
          <p className="mb-4 text-muted-foreground">Please sign in to create and publish posts.</p>
          <Button onClick={() => form.router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const username = form.hiveUser?.username || form.user?.username || 'username';
  const previewLink = `sportsblock.app/@${username}/[post-slug]`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/[0.03] to-background">
      <TopNavigation />

      {/* Sub-header: community selector + actions */}
      <div className="relative border-b bg-card">
        <div className="flex items-center justify-between px-4 py-2 sm:px-6">
          <span className="text-sm text-foreground">
            Write a new post in{' '}
            <select
              value={form.selectedCommunity?.id || ''}
              onChange={(e) => {
                const communityId = e.target.value;
                if (!communityId) {
                  form.setSelectedCommunity(null);
                } else {
                  const community = [
                    ...(form.userCommunities || []),
                    ...(form.allCommunities?.communities || []),
                  ].find((c) => c.id === communityId);
                  form.setSelectedCommunity(community || null);
                }
              }}
              className="cursor-pointer border-none bg-transparent font-medium text-primary outline-none hover:underline"
            >
              <option value="">Sportsblock</option>
              {form.userCommunities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => form.setShowPreview(!form.showPreview)}
              className="h-8 w-8 p-0 md:hidden"
              title={form.showPreview ? 'Show editor' : 'Show preview'}
            >
              {form.showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            <div className="relative" ref={form.menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => form.setShowMenu(!form.showMenu)}
                className="h-8 w-8 p-0"
                title="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>

              {form.showMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-card py-1 shadow-lg">
                  <button
                    onClick={() => {
                      handleSaveDraft();
                      form.setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </button>
                  <button
                    onClick={() => {
                      handleScheduleClick();
                      form.setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule Post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-bright-cobalt to-accent" />
      </div>

      {/* Main Content - Split View */}
      <div className="flex h-[calc(100vh-8rem)] flex-col overflow-hidden sm:h-[calc(100vh-9.5rem)] md:flex-row lg:h-[calc(100vh-10.5rem)]">
        <PublishEditorPanel form={form} editor={editor} />

        {/* Right Side - Preview */}
        <div
          className={cn(
            'overflow-hidden bg-muted/20 md:flex md:w-2/5 md:flex-col',
            form.showPreview ? 'flex w-full flex-col' : 'hidden'
          )}
        >
          <MarkdownPreview
            title={form.title}
            content={form.content}
            excerpt={form.excerpt}
            tags={form.tags}
            coverImage={form.coverImage}
            previewLink={previewLink}
          />
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="border-t bg-card/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!form.title && !form.content}
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>

          <Button
            variant="outline"
            onClick={handleScheduleClick}
            disabled={!form.title || !form.content || !form.selectedSport}
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule
          </Button>

          <Button
            onClick={handlePublish}
            disabled={
              !form.title ||
              !form.content ||
              !form.selectedSport ||
              form.isPublishing ||
              (form.authType === 'hive' && form.rcStatus !== null && !form.rcStatus.canPost)
            }
            className="w-full sm:w-auto sm:min-w-[140px]"
          >
            <Send className="mr-2 h-4 w-4" />
            {form.isPublishing
              ? 'Publishing...'
              : form.authType === 'hive'
                ? 'Publish to Hive'
                : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Dialogs & Modals */}
      {form.showImageDialog && (
        <ImageDialog
          username={form.user?.username}
          onInsert={editor.handleImageDialogInsert}
          onClose={() => form.setShowImageDialog(false)}
          onAiImageGenerated={(url) => form.setAiGeneratedUrls((prev) => new Set(prev).add(url))}
        />
      )}

      {form.showLinkDialog && (
        <LinkDialog
          onInsert={editor.handleLinkDialogInsert}
          onClose={() => form.setShowLinkDialog(false)}
        />
      )}

      <ScheduleModal
        isOpen={form.showScheduleModal}
        onClose={() => form.setShowScheduleModal(false)}
        onSchedule={handleSchedule}
      />

      <PostingAuthorityPrompt
        isOpen={form.showAuthorityPrompt}
        onClose={() => form.setShowAuthorityPrompt(false)}
        onGranted={() => {
          form.setShowAuthorityPrompt(false);
          form.setShowScheduleModal(true);
        }}
      />

      {form.showPostPublishedPrompt && (
        <PostPublishedModal
          postLimitInfo={form.postLimitInfo}
          onViewFeed={() => {
            form.setShowPostPublishedPrompt(false);
            form.router.push('/feed');
          }}
          onConnectHive={() => {
            form.setShowPostPublishedPrompt(false);
            form.router.push('/settings?tab=wallet');
          }}
        />
      )}
    </div>
  );
}

export default function PublishPage() {
  return (
    <Suspense
      fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
    >
      <PublishPageContent />
    </Suspense>
  );
}
