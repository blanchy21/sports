"use client";

import React, { useState, useEffect } from 'react';
import { useRealtime, useNewPosts, useNewVotes, useNewComments } from '@/hooks/useRealtime';
import { RealtimeEvent } from '@/lib/hive-workerbee/realtime';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, MessageCircle, Heart, Zap } from 'lucide-react';

interface RealtimeFeedProps {
  className?: string;
}

export const RealtimeFeed: React.FC<RealtimeFeedProps> = ({ className }) => {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { startMonitoring, stopMonitoring, getStatus } = useRealtime();

  // Monitor new posts
  useNewPosts((event) => {
    console.log('[RealtimeFeed] New post:', event);
    setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50 events
  }, isMonitoring);

  // Monitor new votes
  useNewVotes((event) => {
    console.log('[RealtimeFeed] New vote:', event);
    setEvents(prev => [event, ...prev.slice(0, 49)]);
  }, isMonitoring);

  // Monitor new comments
  useNewComments((event) => {
    console.log('[RealtimeFeed] New comment:', event);
    setEvents(prev => [event, ...prev.slice(0, 49)]);
  }, isMonitoring);

  // Check monitoring status on mount
  useEffect(() => {
    const status = getStatus();
    setIsMonitoring(status.isRunning);
  }, [getStatus]);

  const handleStartMonitoring = async () => {
    try {
      await startMonitoring();
      setIsMonitoring(true);
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await stopMonitoring();
      setIsMonitoring(false);
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventIcon = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'new_post':
        return <Activity className="h-4 w-4 text-accent" />;
      case 'new_vote':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'new_comment':
        return <MessageCircle className="h-4 w-4 text-accent" />;
      default:
        return <Zap className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getEventColor = (event: RealtimeEvent) => {
    switch (event.type) {
      case 'new_post':
        return 'bg-aegean-sky/10 border-aegean-sky/20';
      case 'new_vote':
        return 'bg-bright-cobalt/10 border-bright-cobalt/20';
      case 'new_comment':
        return 'bg-accent/10 border-accent/20';
      default:
        return 'bg-muted/10 border-muted/20';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="p-4" data-testid="realtime-feed">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Real-time Activity
          </h3>
          <div className="flex items-center gap-2">
            <Badge variant={isMonitoring ? 'default' : 'secondary'}>
              {isMonitoring ? 'Live' : 'Stopped'}
            </Badge>
            {isMonitoring ? (
              <Button
                onClick={handleStopMonitoring}
                variant="outline"
                size="sm"
                data-testid="realtime-stop"
              >
                Stop
              </Button>
            ) : (
              <Button onClick={handleStartMonitoring} size="sm" data-testid="realtime-start">
                Start
              </Button>
            )}
            {events.length > 0 && (
              <Button onClick={clearEvents} variant="outline" size="sm" data-testid="realtime-clear">
                Clear
              </Button>
            )}
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isMonitoring ? 'Waiting for activity...' : 'Start monitoring to see real-time activity'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="realtime-events">
            {events.map((event, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getEventColor(event)}`}
                data-testid="realtime-event"
              >
                <div className="flex items-start gap-3">
                  {getEventIcon(event)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {event.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime('created' in event.data ? event.data.created : event.data.timestamp || new Date().toISOString())}
                      </span>
                    </div>
                    
                    {event.type === 'new_post' && (
                      <div>
                        <p className="font-medium text-sm">
                          New post by @{event.data.author}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {event.data.title}
                        </p>
                        {event.data.sportCategory && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {event.data.sportCategory}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {event.type === 'new_vote' && (
                      <div>
                        <p className="font-medium text-sm">
                          @{event.data.voter} voted on @{event.data.author}&apos;s post
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Weight: {event.data.weight}%
                        </p>
                      </div>
                    )}
                    
                    {event.type === 'new_comment' && (
                      <div>
                        <p className="font-medium text-sm">
                          New comment by @{event.data.author}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {event.data.body}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
