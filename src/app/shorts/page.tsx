"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Zap, Play } from "lucide-react";

export default function ShortsPage() {
  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Zap className="h-8 w-8 text-primary" />
              <span>Shorts</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Quick sports highlights, analysis, and moments
            </p>
          </div>
        </div>

        {/* Coming Soon Message */}
        <div className="bg-card border rounded-lg p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Play className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Short-Form Content Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Get ready for bite-sized sports content! Shorts will feature quick highlights, 
            instant reactions, and rapid-fire sports analysis.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Quick Takes</h3>
            <p className="text-sm text-muted-foreground">
              Share instant reactions and hot takes on the latest sports moments
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="text-3xl mb-3">🎥</div>
            <h3 className="font-semibold mb-2">Video Highlights</h3>
            <p className="text-sm text-muted-foreground">
              Upload and share short video clips of incredible plays and moments
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="font-semibold mb-2">Quick Stats</h3>
            <p className="text-sm text-muted-foreground">
              Bite-sized statistical breakdowns and performance insights
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

