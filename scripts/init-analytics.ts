#!/usr/bin/env tsx
/**
 * Initialize Analytics Documents in Firestore
 * This script creates the analytics collection structure in Firebase
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
} catch {
  // .env.local might not exist, that's okay
}

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SPORT_CATEGORIES } from '../src/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface TrendingSport {
  sport: {
    id: string;
    name: string;
    icon: string;
  };
  posts: number;
  trending: boolean;
}

interface TrendingTopic {
  id: string;
  name: string;
  posts: number;
}

interface TopAuthor {
  id: string;
  username: string;
  displayName: string;
  posts: number;
  engagement: number;
  followers?: string;
}

interface CommunityStats {
  totalPosts: number;
  totalAuthors: number;
  totalRewards: number;
  activeToday: number;
}

async function initAnalytics() {
  console.log('🔥 Initializing Analytics Documents in Firestore...\n');

  // Check environment variables
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Firebase environment variables not set!');
    console.error('Please ensure .env.local contains all NEXT_PUBLIC_FIREBASE_* variables');
    process.exit(1);
  }

  // Initialize Firebase
  console.log('🔧 Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log(`  ✅ Connected to project: ${firebaseConfig.projectId}\n`);

  // Initialize Trending Sports
  console.log('📊 Creating trendingSports document...');
  try {
    const trendingSports: TrendingSport[] = SPORT_CATEGORIES.slice(0, 5).map((sport, index) => ({
      sport: {
        id: sport.id,
        name: sport.name,
        icon: sport.icon,
      },
      posts: 0,
      trending: index < 3, // Top 3 are trending
    }));

    await setDoc(doc(db, 'analytics', 'trendingSports'), {
      sports: trendingSports,
      lastUpdated: serverTimestamp(),
      version: 1,
    });
    console.log(`  ✅ Created trendingSports with ${trendingSports.length} sports\n`);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'permission-denied') {
      console.error('  ❌ Permission denied - check Firestore security rules');
      console.error('  💡 Make sure firestore.rules allows write access to analytics collection');
    } else {
      console.error('  ❌ Error:', err.message);
    }
  }

  // Initialize Trending Topics
  console.log('📊 Creating trendingTopics document...');
  try {
    const trendingTopics: TrendingTopic[] = [
      { id: 'football', name: 'Football', posts: 0 },
      { id: 'basketball', name: 'Basketball', posts: 0 },
      { id: 'soccer', name: 'Soccer', posts: 0 },
      { id: 'baseball', name: 'Baseball', posts: 0 },
      { id: 'tennis', name: 'Tennis', posts: 0 },
    ];

    await setDoc(doc(db, 'analytics', 'trendingTopics'), {
      topics: trendingTopics,
      lastUpdated: serverTimestamp(),
      version: 1,
    });
    console.log(`  ✅ Created trendingTopics with ${trendingTopics.length} topics\n`);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'permission-denied') {
      console.error('  ❌ Permission denied - check Firestore security rules');
    } else {
      console.error('  ❌ Error:', err.message);
    }
  }

  // Initialize Top Authors
  console.log('📊 Creating topAuthors document...');
  try {
    const topAuthors: TopAuthor[] = [];

    await setDoc(doc(db, 'analytics', 'topAuthors'), {
      authors: topAuthors,
      lastUpdated: serverTimestamp(),
      version: 1,
    });
    console.log(`  ✅ Created topAuthors (empty, will be populated by your analytics service)\n`);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'permission-denied') {
      console.error('  ❌ Permission denied - check Firestore security rules');
    } else {
      console.error('  ❌ Error:', err.message);
    }
  }

  // Initialize Community Stats
  console.log('📊 Creating communityStats document...');
  try {
    const communityStats: CommunityStats = {
      totalPosts: 0,
      totalAuthors: 0,
      totalRewards: 0,
      activeToday: 0,
    };

    await setDoc(doc(db, 'analytics', 'communityStats'), {
      ...communityStats,
      lastUpdated: serverTimestamp(),
      version: 1,
    });
    console.log(`  ✅ Created communityStats with initial values\n`);
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'permission-denied') {
      console.error('  ❌ Permission denied - check Firestore security rules');
    } else {
      console.error('  ❌ Error:', err.message);
    }
  }

  console.log('✅ Analytics initialization completed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Deploy Firestore security rules: firebase deploy --only firestore:rules');
  console.log('   2. Set up a background job/service to update these analytics documents');
  console.log('   3. The analytics will be fetched by /api/analytics endpoint');
}

initAnalytics().catch(error => {
  console.error('\n❌ Initialization failed:', error);
  process.exit(1);
});

