#!/usr/bin/env tsx
/**
 * Update Analytics in Firestore
 * This script fetches posts from Hive, calculates analytics, and updates Firestore
 * 
 * Run this periodically (via cron, scheduled job, etc.) to keep analytics up to date
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local if it exists
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  // .env.local might not exist, that's okay
}

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { fetchSportsblockPosts } from '../src/lib/hive-workerbee/content';
import { getAnalyticsData } from '../src/lib/hive-workerbee/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function updateAnalytics() {
  console.log('🔄 Updating Analytics in Firestore...\n');

  // Check environment variables
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase environment variables not set!');
    process.exit(1);
  }

  // Initialize Firebase
  console.log('🔧 Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log(`  ✅ Connected to project: ${firebaseConfig.projectId}\n`);

  // Fetch posts from Hive
  console.log('📥 Fetching posts from Hive...');
  try {
    // Fetch a large batch of recent posts for accurate analytics
    const result = await fetchSportsblockPosts({ 
      limit: 500, 
      sort: 'created' 
    });
    console.log(`  ✅ Fetched ${result.posts.length} posts\n`);

    if (result.posts.length === 0) {
      console.log('⚠️  No posts found, skipping analytics update');
      return;
    }

    // Calculate analytics
    console.log('📊 Calculating analytics...');
    const analytics = await getAnalyticsData(result.posts, undefined);
    console.log(`  ✅ Calculated analytics:
    - Trending Sports: ${analytics.trendingSports.length}
    - Trending Topics: ${analytics.trendingTopics.length}
    - Top Authors: ${analytics.topAuthors.length}
    - Community Stats: ${analytics.communityStats.totalPosts} posts, ${analytics.communityStats.totalAuthors} authors\n`);

    // Update Firestore
    console.log('💾 Updating Firestore...');
    
    // Update Trending Sports
    try {
      await setDoc(doc(db, 'analytics', 'trendingSports'), {
        sports: analytics.trendingSports,
        lastUpdated: serverTimestamp(),
        version: 1,
      });
      console.log('  ✅ Updated trendingSports');
    } catch (error: any) {
      console.error('  ❌ Error updating trendingSports:', error.message);
    }

    // Update Trending Topics
    try {
      await setDoc(doc(db, 'analytics', 'trendingTopics'), {
        topics: analytics.trendingTopics,
        lastUpdated: serverTimestamp(),
        version: 1,
      });
      console.log('  ✅ Updated trendingTopics');
    } catch (error: any) {
      console.error('  ❌ Error updating trendingTopics:', error.message);
    }

    // Update Top Authors
    try {
      await setDoc(doc(db, 'analytics', 'topAuthors'), {
        authors: analytics.topAuthors,
        lastUpdated: serverTimestamp(),
        version: 1,
      });
      console.log('  ✅ Updated topAuthors');
    } catch (error: any) {
      console.error('  ❌ Error updating topAuthors:', error.message);
    }

    // Update Community Stats
    try {
      await setDoc(doc(db, 'analytics', 'communityStats'), {
        totalPosts: analytics.communityStats.totalPosts,
        totalAuthors: analytics.communityStats.totalAuthors,
        totalRewards: analytics.communityStats.totalRewards,
        activeToday: analytics.communityStats.activeToday,
        lastUpdated: serverTimestamp(),
        version: 1,
      });
      console.log('  ✅ Updated communityStats');
    } catch (error: any) {
      console.error('  ❌ Error updating communityStats:', error.message);
    }

    console.log('\n✅ Analytics update completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Error updating analytics:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

updateAnalytics().catch(error => {
  console.error('\n❌ Update failed:', error);
  process.exit(1);
});

