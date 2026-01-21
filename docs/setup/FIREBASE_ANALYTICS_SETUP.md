# Firebase Analytics Setup Guide

This guide explains how to set up Firebase Firestore for storing Sportsblock analytics data (trending sports, top authors, etc.) that are not available from the Hive blockchain.

## Overview

The analytics data (trending sports, trending topics, top authors, community stats) are stored in Firebase Firestore as layer 2 data. This data is custom to Sportsblock and needs to be calculated and updated separately from the Hive blockchain.

## Firestore Structure

The analytics are stored in the `analytics` collection with the following documents:

### 1. `analytics/trendingSports`
Contains trending sports data:
```typescript
{
  sports: TrendingSport[],
  lastUpdated: Timestamp,
  version: number
}
```

Where `TrendingSport` is:
```typescript
{
  sport: {
    id: string,
    name: string,
    icon: string
  },
  posts: number,
  trending: boolean
}
```

### 2. `analytics/trendingTopics`
Contains trending topics/hashtags:
```typescript
{
  topics: TrendingTopic[],
  lastUpdated: Timestamp,
  version: number
}
```

Where `TrendingTopic` is:
```typescript
{
  id: string,
  name: string,
  posts: number
}
```

### 3. `analytics/topAuthors`
Contains top authors by engagement:
```typescript
{
  authors: TopAuthor[],
  lastUpdated: Timestamp,
  version: number
}
```

Where `TopAuthor` is:
```typescript
{
  id: string,
  username: string,
  displayName: string,
  posts: number,
  engagement: number,
  followers?: string
}
```

### 4. `analytics/communityStats`
Contains overall community statistics:
```typescript
{
  totalPosts: number,
  totalAuthors: number,
  totalRewards: number,
  activeToday: number,
  lastUpdated: Timestamp,
  version: number
}
```

## Setup Steps

### Step 1: Deploy Firestore Security Rules

You have two options to deploy the security rules:

#### Option A: Using Firebase Console (Recommended for Quick Setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `sportsblock-auth`
3. Navigate to **Firestore Database** → **Rules** tab
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click **"Publish"** button

#### Option B: Using Firebase CLI

1. Install Firebase CLI (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your project: `sportsblock-auth`
   - Use existing `firestore.rules` file

4. Deploy the rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

The `firebase.json` file is already configured to use `firestore.rules`.

### Step 2: Initialize Analytics Documents

Run the initialization script to create the analytics documents:

```bash
npx tsx scripts/init-analytics.ts
```

This will create the initial structure with empty/default values.

### Step 3: Update Analytics

A ready-to-use update script is available at `scripts/update-analytics.ts`. This script:

1. **Fetches posts from Hive** (using WorkerBee)
2. **Calculates analytics** (trending sports, topics, authors, stats)
3. **Updates Firestore** with the calculated data

To run it manually:
```bash
npx tsx scripts/update-analytics.ts
```

This will fetch the latest posts and update all analytics documents in Firestore.

### Step 4: Schedule Updates

You can schedule the analytics updates using several methods:

#### Option 1: Create API Route for Cron (Vercel)

Create `src/app/api/cron/update-analytics/route.ts` (see detailed example in the script comments) and add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/update-analytics",
    "schedule": "0 */6 * * *"
  }]
}
```

#### Option 2: Use the Update Script Directly

Run the update script via cron or scheduled tasks:
```bash
# Add to crontab (runs every 6 hours)
0 */6 * * * cd /path/to/sports && npx tsx scripts/update-analytics.ts
```

#### Option 3: Firebase Cloud Functions

Create a scheduled Cloud Function that calls the update script.

#### Option 4: GitHub Actions

Set up a GitHub Actions workflow to run the update script periodically.

## API Endpoint

The analytics are served via `/api/analytics` endpoint, which:
- Fetches data from Firestore
- Returns empty arrays if documents don't exist
- Handles errors gracefully

## Testing

Test Firebase connection:
```bash
npx tsx scripts/test-firebase.ts
```

This will verify:
- Environment variables are set
- Firebase connection works
- Firestore access permissions

## Security Rules

The `firestore.rules` file includes:
- **Read access**: Public (anyone can read analytics)
- **Write access**: Allowed for server-side updates (API routes run without authentication)
- **Note**: For production, consider adding API key validation for additional security

You can modify these rules based on your security requirements.

## Troubleshooting

### Permission Denied Errors

If you see "permission denied" errors:
1. Check Firestore security rules are deployed
2. Ensure rules allow read access to `analytics` collection
3. For writes, ensure you're authenticated or rules allow unauthenticated writes

### Missing Documents

If documents don't exist:
1. Run `npx tsx scripts/init-analytics.ts` to create them
2. Check Firebase Console to verify documents were created
3. Ensure your update service has write permissions

### Empty Data

If analytics return empty arrays:
1. Check if documents exist in Firestore
2. Verify your update service is running and updating documents
3. Check Firestore console for document structure

## Next Steps

1. ✅ Deploy Firestore security rules
2. ✅ Initialize analytics documents
3. ⏳ Create analytics update service
4. ⏳ Schedule periodic updates
5. ⏳ Monitor and verify data is updating correctly

