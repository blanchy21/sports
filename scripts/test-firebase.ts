#!/usr/bin/env tsx
/**
 * Test Firebase connection and database access
 * This script checks if Firebase is properly configured and accessible
 * 
 * Usage: NEXT_PUBLIC_FIREBASE_API_KEY=... NEXT_PUBLIC_FIREBASE_PROJECT_ID=... npx tsx scripts/test-firebase.ts
 * Or ensure .env.local is loaded (Next.js does this automatically in dev mode)
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
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function testFirebase() {
  console.log('🔥 Testing Firebase Connection...\n');

  // Check environment variables
  console.log('📋 Checking environment variables:');
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

  const missingVars: string[] = [];
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.log(`  ❌ ${varName}: NOT SET`);
    } else {
      // Mask sensitive values
      const masked = varName.includes('KEY') || varName.includes('ID') 
        ? `${value.substring(0, 8)}...` 
        : value;
      console.log(`  ✅ ${varName}: ${masked}`);
    }
  });

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing ${missingVars.length} required environment variable(s)`);
    console.log('Please set these in your .env.local file');
    process.exit(1);
  }

  // Initialize Firebase
  console.log('\n🔧 Initializing Firebase...');
  try {
    const app = initializeApp(firebaseConfig);
    console.log('  ✅ Firebase app initialized');
    console.log(`  📦 Project ID: ${firebaseConfig.projectId}`);
  } catch (error) {
    console.error('  ❌ Failed to initialize Firebase:', error);
    process.exit(1);
  }

  // Test Firestore connection
  console.log('\n🗄️  Testing Firestore connection...');
  try {
    const db = getFirestore();
    console.log('  ✅ Firestore instance created');

    // Try to list collections (this will fail if permissions are wrong, but connection works)
    console.log('  🔍 Testing database access...');
    
    // Test reading from a known collection (profiles)
    try {
      const profilesRef = collection(db, 'profiles');
      const profilesSnapshot = await getDocs(profilesRef);
      console.log(`  ✅ Successfully accessed 'profiles' collection`);
      console.log(`  📊 Found ${profilesSnapshot.size} profile document(s)`);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.log('  ⚠️  Permission denied - Firebase is connected but rules may be restrictive');
        console.log('  ℹ️  This is normal if Firestore security rules are enabled');
      } else {
        throw error;
      }
    }

    // Test reading from soft_posts collection
    try {
      const postsRef = collection(db, 'soft_posts');
      const postsSnapshot = await getDocs(postsRef);
      console.log(`  ✅ Successfully accessed 'soft_posts' collection`);
      console.log(`  📊 Found ${postsSnapshot.size} post document(s)`);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.log('  ⚠️  Permission denied for soft_posts - check Firestore rules');
      } else {
        console.log(`  ⚠️  Error accessing soft_posts: ${error.message}`);
      }
    }

    // Test reading from analytics collection (for layer 2 analytics)
    try {
      const analyticsRef = collection(db, 'analytics');
      const analyticsSnapshot = await getDocs(analyticsRef);
      console.log(`  ✅ Successfully accessed 'analytics' collection`);
      console.log(`  📊 Found ${analyticsSnapshot.size} analytics document(s)`);
      
      // Try to get specific analytics documents
      const trendingSportsDoc = doc(db, 'analytics', 'trendingSports');
      const trendingSportsSnap = await getDoc(trendingSportsDoc);
      if (trendingSportsSnap.exists()) {
        console.log('  ✅ Found trendingSports analytics document');
        const data = trendingSportsSnap.data();
        console.log(`  📈 Trending sports data: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
      } else {
        console.log('  ℹ️  trendingSports document does not exist yet');
      }
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.log('  ⚠️  Permission denied for analytics - check Firestore rules');
      } else {
        console.log(`  ℹ️  Analytics collection may not exist yet: ${error.message}`);
      }
    }

  } catch (error: any) {
    console.error('  ❌ Firestore connection failed:', error.message);
    console.error('  Full error:', error);
    process.exit(1);
  }

  console.log('\n✅ Firebase connection test completed successfully!');
  console.log('\n💡 Next steps:');
  console.log('   1. Ensure Firestore security rules allow read access');
  console.log('   2. Create analytics collection with trendingSports, trendingTopics, topAuthors documents');
  console.log('   3. Update /api/analytics/route.ts to fetch from Firestore');
}

testFirebase().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

