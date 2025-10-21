"use client";

import React from "react";
import { VoteButton, SimpleVoteButton } from "@/components/VoteButton";
import { CommentVoteButton } from "@/components/CommentVoteButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

// Demo post data - in a real app this would come from the blockchain
const demoPost = {
  author: "demo_user",
  permlink: "demo-post-about-sports",
  net_votes: 42,
  pending_payout_value: "1.234 HIVE",
  created: new Date().toISOString(),
  title: "Demo Post: The Future of Sports Analytics",
  body: "This is a demonstration post showing the voting functionality. Users can upvote or downvote this post using the Hive blockchain.",
  sportCategory: "general",
};

export const VotingDemo: React.FC = () => {
  const { authType, hiveUser } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Voting System Demo</h1>
        <p className="text-muted-foreground">
          Test the voting functionality on this demo post
        </p>
      </div>

      {/* Auth Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center space-x-2">
            <Badge variant={authType === "hive" ? "default" : "secondary"}>
              {authType === "hive" ? "Hive Authenticated" : "Guest Mode"}
            </Badge>
            {authType === "hive" && hiveUser && (
              <span className="text-sm text-muted-foreground">
                Logged in as @{hiveUser.username}
              </span>
            )}
          </div>
          {authType !== "hive" && (
            <p className="text-sm text-muted-foreground">
              Connect with Hive Keychain to enable voting functionality
            </p>
          )}
        </CardContent>
      </Card>

      {/* Demo Post with Full Voting Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Full Voting Interface</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upvote, downvote, or remove your vote with detailed voting power display
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{demoPost.title}</h3>
                <p className="text-muted-foreground text-sm">
                  by @{demoPost.author} • {new Date(demoPost.created).toLocaleDateString()}
                </p>
                <p className="text-sm">{demoPost.body}</p>
              </div>
              <Badge variant="outline">{demoPost.sportCategory}</Badge>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <VoteButton
                author={demoPost.author}
                permlink={demoPost.permlink}
                voteCount={demoPost.net_votes}
                onVoteSuccess={(result) => {
                  console.log("Star vote successful:", result);
                }}
                onVoteError={(error) => {
                  console.error("Star vote error:", error);
                }}
              />
              <div className="text-sm text-muted-foreground">
                Pending: {demoPost.pending_payout_value}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Post with Simple Voting Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Simple Voting Interface</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compact voting interface suitable for mobile or space-constrained layouts
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{demoPost.title}</h3>
                <p className="text-muted-foreground text-sm">
                  by @{demoPost.author} • {new Date(demoPost.created).toLocaleDateString()}
                </p>
                <p className="text-sm">{demoPost.body}</p>
              </div>
              <Badge variant="outline">{demoPost.sportCategory}</Badge>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <SimpleVoteButton
                author={demoPost.author}
                permlink={demoPost.permlink}
                voteCount={demoPost.net_votes}
                onVoteSuccess={(result) => {
                  console.log("Simple vote successful:", result);
                }}
                onVoteError={(error) => {
                  console.error("Simple vote error:", error);
                }}
              />
              <div className="text-sm text-muted-foreground">
                Pending: {demoPost.pending_payout_value}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Comment with Comment Voting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comment Voting Interface</CardTitle>
          <p className="text-sm text-muted-foreground">
            Simple 20% vote system for comments - click to vote, click again to remove
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-xs font-medium">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">@demo_user</span>
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                </div>
                <p className="text-sm text-foreground mb-3">
                  Great analysis! I completely agree with your points about the team&apos;s performance this season.
                </p>
                <div className="flex items-center space-x-4">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    Reply
                  </Button>
                  <CommentVoteButton
                    author="demo_user"
                    permlink="demo-comment-123"
                    voteCount={5}
                    onVoteSuccess={(result) => {
                      console.log("Demo comment vote successful:", result);
                    }}
                    onVoteError={(error) => {
                      console.error("Demo comment vote error:", error);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voting Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Core Functionality</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 5-star rating system for posts (1 star = 20% vote weight)</li>
                <li>• Simple 20% voting for comments</li>
                <li>• Hover preview and click to confirm for posts</li>
                <li>• Downvote posts (negative weight)</li>
                <li>• Remove existing votes</li>
                <li>• Real-time vote count updates</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Smart Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Voting power calculation</li>
                <li>• Optimal vote weight suggestions</li>
                <li>• Vote status tracking</li>
                <li>• Error handling with user feedback</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">User Experience</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Visual vote state indicators</li>
                <li>• Toast notifications for feedback</li>
                <li>• Loading states during voting</li>
                <li>• Disabled states for insufficient power</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Blockchain Integration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Direct Hive blockchain voting</li>
                <li>• Transaction ID tracking</li>
                <li>• Resource Credit validation</li>
                <li>• Posting key authentication</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
