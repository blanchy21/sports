'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { SPORT_CATEGORIES } from '@/types';
import { cn } from '@/lib/utils/client';
import { EditorStatusBar } from '@/components/publish/EditorStatusBar';
import { CoverImageUpload } from '@/components/publish/CoverImageUpload';
import { TagInput } from '@/components/publish/TagInput';
import { AdvancedOptions } from '@/components/publish/AdvancedOptions';
import { UpgradeIncentiveBanner } from '@/components/upgrade/UpgradeIncentive';
import type { usePublishForm } from '@/hooks/usePublishForm';

export type ViewMode = 'editor' | 'split' | 'preview';

type FormState = ReturnType<typeof usePublishForm>;

interface PublishEditorPanelProps {
  form: FormState;
  viewMode: ViewMode;
}

export function PublishEditorPanel({ form, viewMode }: PublishEditorPanelProps) {
  return (
    <div
      className={cn(
        'relative z-10 flex flex-col overflow-hidden border-b bg-sb-stadium/50 md:border-b-0 md:border-r',
        viewMode === 'preview' ? 'hidden' : 'flex',
        viewMode === 'editor' ? 'w-full' : 'w-full md:w-1/2'
      )}
    >
      {/* Cover Image Upload */}
      <CoverImageUpload
        coverImage={form.coverImage}
        onCoverImageChange={form.setCoverImage}
        username={form.hiveUser?.username || form.user?.username}
      />

      {/* Title Input */}
      <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
        <input
          type="text"
          value={form.title}
          onChange={(e) => form.setTitle(e.target.value)}
          placeholder="Post Title"
          className="w-full border-none bg-transparent text-xl font-bold outline-none placeholder:text-muted-foreground sm:text-2xl"
        />
      </div>

      {/* Scrollable editor + fields */}
      <div className="flex-1 overflow-auto">
        {/* Editor Textarea - auto-grows with content */}
        <div className="px-4 py-3 sm:px-6 sm:py-4">
          <textarea
            ref={form.textareaRef}
            value={form.content}
            onChange={(e) => form.setContent(e.target.value)}
            placeholder="Write your post using Markdown..."
            className="min-h-[60vh] w-full resize-none border-none bg-transparent text-base leading-relaxed outline-none"
            style={{ overflow: 'hidden' }}
          />
        </div>

        {/* Bottom Fields */}
        <div className="space-y-4 border-t px-4 py-3 sm:px-6 sm:py-4">
          {/* Short Description / Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-sb-text-primary">Short Description</label>
              <span className="text-xs text-muted-foreground">{form.excerpt.length}/120</span>
            </div>
            <input
              type="text"
              value={form.excerpt}
              onChange={(e) => form.setExcerpt(e.target.value.slice(0, 120))}
              placeholder="Brief description of your post (optional)"
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2',
                'text-sm focus:outline-none focus:ring-2 focus:ring-sb-teal'
              )}
              maxLength={120}
            />
          </div>

          {/* Sport Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-sb-text-primary">
              Choose a Sport <span className="text-destructive">*</span>
            </label>
            <select
              value={form.selectedSport}
              onChange={(e) => form.setSelectedSport(e.target.value)}
              className={cn(
                'w-full rounded-lg border bg-background px-3 py-2.5',
                'text-sm focus:outline-none focus:ring-2 focus:ring-sb-teal',
                !form.selectedSport && 'text-muted-foreground'
              )}
            >
              <option value="">Select a sport category</option>
              {SPORT_CATEGORIES.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
            {!form.selectedSport && (
              <p className="text-xs text-warning">
                Sport category is required to publish your post
              </p>
            )}
          </div>

          {/* Tags */}
          <TagInput
            value={form.tags}
            onChange={form.setTags}
            maxTags={5}
            recentTags={form.recentTags}
            selectedSport={form.selectedSport}
            placeholder="Add tags..."
          />

          {/* Advanced Options */}
          <AdvancedOptions
            selectedCommunity={form.selectedCommunity}
            onCommunityChange={form.setSelectedCommunity}
            userCommunities={form.userCommunities}
            allCommunities={form.allCommunities?.communities}
            rewardsOption={form.rewardsOption}
            onRewardsChange={form.setRewardsOption}
            beneficiaries={form.beneficiaries}
            onBeneficiariesChange={form.setBeneficiaries}
            coverImage={form.coverImage}
            onCoverImageChange={form.setCoverImage}
            detectedImages={form.detectedImages}
            isHiveUser={form.authType === 'hive'}
          />

          {/* Error Display */}
          {form.publishError && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{form.publishError}</p>
              </div>
            </div>
          )}

          {/* RC Status (Hive users) */}
          {form.authType === 'hive' && form.rcStatus && (
            <div
              className={cn(
                'rounded-lg p-3',
                form.rcStatus.canPost
                  ? 'border border-success/20 bg-success/10'
                  : 'border border-destructive/20 bg-destructive/10'
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    form.rcStatus.canPost ? 'bg-success' : 'bg-destructive'
                  )}
                />
                <span className="text-sm">
                  Resource Credits: {form.rcStatus.rcPercentage.toFixed(1)}%
                </span>
              </div>
              {form.rcStatus.message && (
                <p className="mt-1 text-xs text-muted-foreground">{form.rcStatus.message}</p>
              )}
            </div>
          )}

          {/* Soft User Notice */}
          {form.authType !== 'hive' && (
            <div className="space-y-3">
              {form.postLimitInfo && form.postLimitInfo.isNearLimit && (
                <UpgradeIncentiveBanner
                  type={form.postLimitInfo.remaining <= 5 ? 'storage-critical' : 'storage-warning'}
                  postsRemaining={form.postLimitInfo.remaining}
                  totalPosts={form.postLimitInfo.limit}
                />
              )}

              <div className="rounded-lg border border-info/20 bg-info/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-info">
                    Your post will be visible to everyone. Connect with Hive to earn rewards!
                  </p>
                  {form.postLimitInfo && !form.postLimitInfo.isNearLimit && (
                    <span className="ml-2 whitespace-nowrap text-xs text-muted-foreground">
                      {form.postLimitInfo.remaining}/{form.postLimitInfo.limit} posts left
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <EditorStatusBar content={form.content} isDraftSaved={form.isDraftSaved} />
    </div>
  );
}
