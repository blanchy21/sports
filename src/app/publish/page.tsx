'use client';

import React, { Suspense, useState } from 'react';
import { Button } from '@/components/core/Button';
import { Save, Send, AlertCircle, MoreVertical, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/client';
import { usePublishForm } from '@/hooks/usePublishForm';
import { useEditorActions } from '@/hooks/useEditorActions';
import { usePublishActions } from '@/hooks/usePublishActions';
import { useScheduledPosts } from '@/lib/react-query/queries/useScheduledPosts';
import { ImageDialog } from '@/components/publish/ImageDialog';
import { LinkDialog } from '@/components/publish/LinkDialog';
import { PostPublishedModal } from '@/components/publish/PostPublishedModal';
import { MarkdownPreview } from '@/components/publish/MarkdownPreview';
import { ScheduleModal } from '@/components/publish/ScheduleModal';
import { PostingAuthorityPrompt } from '@/components/publish/PostingAuthorityPrompt';
import { PublishEditorPanel } from '@/components/publish/PublishEditorPanel';
import { EditorToolbar } from '@/components/publish/EditorToolbar';
import { DraftsDrawer } from '@/components/publish/DraftsDrawer';
import { TopNavigation } from '@/components/layout/TopNavigation';

import type { ViewMode } from '@/components/publish/PublishEditorPanel';

function PublishPageContent() {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showDrafts, setShowDrafts] = useState(false);
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
  const { data: scheduledPosts } = useScheduledPosts();
  const pendingCount = scheduledPosts?.filter((p) => p.status === 'pending').length ?? 0;

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
    <div className="flex min-h-screen flex-col bg-background">
      <TopNavigation />

      {/* Sub-header: community selector + actions */}
      <div className="relative border-b bg-sb-stadium">
        <div className="flex items-center justify-between px-4 py-2 sm:px-6">
          <span className="text-sm text-sb-text-primary">
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
            <button
              onClick={() => setShowDrafts(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sb-turf hover:text-sb-text-primary"
            >
              <FileText className="h-3.5 w-3.5" />
              Drafts
            </button>

            <Link
              href="/drafts?tab=scheduled"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-sb-turf hover:text-sb-text-primary"
            >
              <Calendar className="h-3.5 w-3.5" />
              Scheduled
              {pendingCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-[#051A14]">
                  {pendingCount}
                </span>
              )}
            </Link>

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
                <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-sb-stadium py-1 shadow-lg">
                  <button
                    onClick={() => {
                      handleSaveDraft();
                      form.setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-sb-turf"
                  >
                    <Save className="h-4 w-4" />
                    Save Draft
                  </button>
                  <button
                    onClick={() => {
                      handleScheduleClick();
                      form.setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-sb-turf"
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

      {/* Full-width Toolbar */}
      <EditorToolbar
        onFormat={editor.handleFormat}
        onInsertImage={editor.handleInsertImage}
        onInsertLink={editor.handleInsertLink}
        onEmoji={editor.handleEmoji}
        onInsertGif={editor.handleInsertGif}
        onUndo={editor.handleUndo}
        onRedo={editor.handleRedo}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content - Split View */}
      <div className="relative flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Ambient warm glow — dark mode only */}
        {/* Ambient warm glow — dark mode */}
        <div
          className="pointer-events-none absolute inset-0 z-0 hidden dark:block"
          aria-hidden="true"
        >
          <div className="absolute -top-20 left-1/4 h-[600px] w-[700px] rounded-full bg-red-500/[0.12] blur-[120px]" />
          <div className="absolute -top-10 right-1/4 h-[500px] w-[600px] rounded-full bg-amber-500/[0.15] blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-orange-500/[0.08] blur-[140px]" />
        </div>
        {/* Ambient warm glow — light mode */}
        <div
          className="pointer-events-none absolute inset-0 z-0 block dark:hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-20 left-0 h-[600px] w-[60%] rounded-full bg-orange-300/[0.15] blur-[100px]" />
          <div className="absolute left-1/3 top-0 h-[500px] w-[50%] rounded-full bg-amber-200/[0.2] blur-[80px]" />
          <div className="absolute right-0 top-10 h-[600px] w-[50%] rounded-full bg-emerald-200/[0.1] blur-[100px]" />
          <div className="absolute bottom-0 left-1/4 h-[300px] w-[600px] rounded-full bg-rose-200/[0.12] blur-[120px]" />
        </div>
        <PublishEditorPanel form={form} viewMode={viewMode} />

        {/* Right Side - Preview */}
        <div
          className={cn(
            'relative z-10 overflow-hidden bg-sb-stadium/50',
            viewMode === 'editor' && 'hidden',
            viewMode === 'preview' && 'flex w-full flex-col',
            viewMode === 'split' && 'hidden md:flex md:w-1/2 md:flex-col'
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
      <div className="border-t bg-sb-stadium/80 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
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

      <DraftsDrawer
        isOpen={showDrafts}
        onClose={() => setShowDrafts(false)}
        onRestore={(draft) => {
          form.setTitle(draft.title || '');
          form.setContent(draft.content || '');
          form.setExcerpt(draft.excerpt || '');
          form.setSelectedSport(draft.sport || '');
          form.setTags(Array.isArray(draft.tags) ? draft.tags : []);
          form.setCoverImage(draft.imageUrl || '');
          form.setIsDraftSaved(true);
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
