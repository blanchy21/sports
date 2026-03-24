#!/usr/bin/env node

/**
 * SportsBlock Buffer Upload Script — CSV-driven
 *
 * Reads the marketing matrix CSV, filters Twitter/X rows with tweet text
 * and a buffer_priority, then uploads them to Buffer with images auto-attached.
 *
 * The CSV is the single source of truth:
 *   - Edit tweet text in the `tweet_text` column
 *   - Set `buffer_priority` (1 = highest) to control which posts get queued
 *   - Image filename is derived from template + theme + cta_id
 *
 * Workflow:
 *   1. Edit CSV → set tweet_text and buffer_priority for rows you want to post
 *   2. Export Figma PNGs to public/marketing/assets/
 *   3. Push to main (images go live on sportsblock.app)
 *   4. Run: node marketing/x-pipeline/buffer-upload.js
 *
 * Commands:
 *   node marketing/x-pipeline/buffer-upload.js              # Upload posts
 *   node marketing/x-pipeline/buffer-upload.js --dry-run    # Preview without posting
 *   node marketing/x-pipeline/buffer-upload.js --clear      # Delete all scheduled posts
 *   node marketing/x-pipeline/buffer-upload.js --list       # Show current queue
 *
 * Zero dependencies.
 */

const https = require('https'); // eslint-disable-line @typescript-eslint/no-require-imports
const fs = require('fs'); // eslint-disable-line @typescript-eslint/no-require-imports
const path = require('path'); // eslint-disable-line @typescript-eslint/no-require-imports

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BUFFER_TOKEN = process.env.BUFFER_TOKEN || 'XnKa8nMB0IQxakD55iNtjIfCn2uZII5oE10WI-nERKe';
const CHANNEL_ID = '69b82d2f7be9f8b17160a1e9'; // @sportsblockinfo Twitter/X
const ORG_ID = '698132498f84ce3a77e3dd9c';
const API_URL = 'https://api.buffer.com/graphql';
const CSV_PATH = path.resolve(__dirname, '../sportsblock-marketing-matrix.csv');
const IMAGE_BASE_URL = 'https://sportsblock.app/marketing/assets';
const LOCAL_ASSETS_DIR = path.resolve(__dirname, '../../public/marketing/assets');
const POST_HOURS = [9, 13, 18]; // UTC
const MAX_POSTS = 10; // Buffer free plan

// ---------------------------------------------------------------------------
// CSV parser (handles quoted fields with commas)
// ---------------------------------------------------------------------------

function* parseCSVFields(text) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      lines.push(current);
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (current.length > 0 || lines.length > 0) {
        lines.push(current);
        current = '';
      }
      if (lines.length > 0) {
        yield lines.splice(0);
      }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || lines.length > 0) {
    lines.push(current);
    yield lines.splice(0);
  }
}

function readCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const rows = [];
  let headers = null;

  for (const fields of parseCSVFields(text)) {
    if (!headers) {
      headers = fields.map((h) => h.trim());
      continue;
    }
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (fields[i] || '').trim();
    });
    rows.push(obj);
  }
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Image filename from CSV row
// ---------------------------------------------------------------------------

function imageFilename(row) {
  // Derives: contest-card-void-ipl-contest.png
  const template = (row.template || '').toLowerCase();
  const theme = (row.theme || '').toLowerCase();
  const ctaId = (row.cta_id || '').toLowerCase();
  return `${template}-${theme}-${ctaId}.png`;
}

function checkImageExists(filename) {
  return fs.existsSync(path.join(LOCAL_ASSETS_DIR, filename));
}

function imageUrl(filename) {
  return `${IMAGE_BASE_URL}/${encodeURIComponent(filename)}`;
}

// ---------------------------------------------------------------------------
// Schedule generation
// ---------------------------------------------------------------------------

function generateSchedule(count) {
  const dates = [];
  const now = new Date();
  const startDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );

  let dayOffset = 0;
  let hourIdx = 0;

  for (let i = 0; i < count; i++) {
    const d = new Date(startDay);
    d.setUTCDate(d.getUTCDate() + dayOffset);
    d.setUTCHours(POST_HOURS[hourIdx], 0, 0, 0);
    dates.push(d.toISOString());

    hourIdx++;
    if (hourIdx >= POST_HOURS.length) {
      hourIdx = 0;
      dayOffset++;
    }
  }
  return dates;
}

// ---------------------------------------------------------------------------
// GraphQL helper
// ---------------------------------------------------------------------------

function graphql(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const url = new URL(API_URL);

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${BUFFER_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve({ raw: body });
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function escapeGql(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function listQueue() {
  const result = await graphql(`{
    posts(input: { channelId: "${CHANNEL_ID}", filter: { status: scheduled } }) {
      posts { id text dueAt status }
      total
    }
  }`);

  const posts = result?.data?.posts?.posts || [];
  console.log(`Queue: ${posts.length} scheduled posts\n`);
  posts.forEach((p, i) => {
    const date = new Date(p.dueAt).toLocaleString('en-GB', { timeZone: 'UTC' });
    console.log(`  ${i + 1}. [${date} UTC]`);
    console.log(`     ${p.text.substring(0, 80)}...`);
    console.log(`     ID: ${p.id}\n`);
  });
}

async function clearQueue() {
  const result = await graphql(`{
    posts(input: { channelId: "${CHANNEL_ID}", filter: { status: scheduled } }) {
      posts { id text }
      total
    }
  }`);

  const posts = result?.data?.posts?.posts || [];
  if (posts.length === 0) {
    console.log('Queue is empty.');
    return;
  }

  console.log(`Deleting ${posts.length} scheduled posts...\n`);
  for (const post of posts) {
    await graphql(
      `mutation { deletePost(input: { postId: "${post.id}" }) { ... on PostActionSuccess { post { id } } ... on UnexpectedError { message } } }`
    );
    console.log(`  🗑️  ${post.text.substring(0, 60)}...`);
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`\n✅ Cleared ${posts.length} posts.`);
}

// ---------------------------------------------------------------------------
// Main upload
// ---------------------------------------------------------------------------

async function upload(dryRun) {
  // 1. Read CSV
  console.log(`Reading CSV: ${CSV_PATH}`);
  const { rows } = readCSV(CSV_PATH);
  console.log(`  Total rows: ${rows.length}`);

  // 2. Filter: Twitter/X rows with tweet_text and buffer_priority
  const twitterPosts = rows.filter((r) => {
    const target = (r.platform_target || '').toLowerCase();
    const hasTweet = (r.tweet_text || '').trim().length > 0;
    const hasPriority = parseInt(r.buffer_priority) > 0;
    return target.includes('twitter') && hasTweet && hasPriority;
  });

  if (twitterPosts.length === 0) {
    console.log('\n⚠️  No rows found with tweet_text + buffer_priority set.');
    console.log('   Add these columns to the CSV:');
    console.log('   - tweet_text: The tweet copy for this post');
    console.log('   - buffer_priority: Number (1 = post first, higher = later)');
    console.log('\n   Example: Add to row for "Contest Card — Void — IPL Contest":');
    console.log('   tweet_text: "🏏 IPL Prediction Contest is LIVE..."');
    console.log('   buffer_priority: 1');
    return;
  }

  // 3. Sort by priority (lowest number first)
  twitterPosts.sort((a, b) => parseInt(a.buffer_priority) - parseInt(b.buffer_priority));

  console.log(`  Posts with tweet_text + priority: ${twitterPosts.length}`);

  // 4. Check current queue
  const queueCheck = await graphql(`{
    posts(input: { channelId: "${CHANNEL_ID}", filter: { status: scheduled } }) {
      total
    }
  }`);
  const existingCount = queueCheck?.data?.posts?.total || 0;
  const slotsAvailable = MAX_POSTS - existingCount;

  console.log(`  Current queue: ${existingCount}/${MAX_POSTS}`);
  console.log(`  Slots available: ${slotsAvailable}`);

  if (slotsAvailable <= 0) {
    console.log('\n⚠️  Queue is full. Run --clear first or wait for posts to publish.');
    return;
  }

  const toSchedule = twitterPosts.slice(0, slotsAvailable);
  const dates = generateSchedule(toSchedule.length);

  console.log(`  Scheduling: ${toSchedule.length} posts`);
  if (dryRun) console.log('  🏃 DRY RUN mode\n');
  else console.log('');

  // 5. Upload each post
  let success = 0;
  let failed = 0;

  for (let i = 0; i < toSchedule.length; i++) {
    const row = toSchedule[i];
    const text = row.tweet_text.trim();
    const dueAt = dates[i];
    const imgFile = imageFilename(row);
    const hasImage = checkImageExists(imgFile);
    const campaign = row.cta_angle || row.cta_id;

    if (dryRun) {
      console.log(`📋 ${i + 1}. [Priority ${row.buffer_priority}] ${campaign}`);
      console.log(`   Schedule: ${dueAt}`);
      console.log(`   Image: ${hasImage ? '✅ ' + imgFile : '⚠️  ' + imgFile + ' (missing)'}`);
      console.log(`   Card: ${row.figma_frame_name || row.template}`);
      console.log(`   Tweet: ${text.substring(0, 70)}...\n`);
      success++;
      continue;
    }

    const escapedText = escapeGql(text);
    const imgUrl = imageUrl(imgFile);
    const assetsBlock = hasImage ? `, assets: { images: [{ url: "${escapeGql(imgUrl)}" }] }` : '';

    const mutation = `mutation {
      createPost(input: {
        channelId: "${CHANNEL_ID}",
        text: "${escapedText}",
        schedulingType: automatic,
        mode: customScheduled,
        dueAt: "${dueAt}",
        source: "api"
        ${assetsBlock}
      }) {
        ... on PostActionSuccess { post { id text dueAt status } }
        ... on LimitReachedError { message }
        ... on InvalidInputError { message }
        ... on UnexpectedError { message }
      }
    }`;

    const result = await graphql(mutation);

    if (result?.data?.createPost?.post) {
      const p = result.data.createPost.post;
      success++;
      console.log(`✅ ${i + 1}. [Priority ${row.buffer_priority}] ${campaign}`);
      console.log(`   Scheduled: ${p.dueAt}`);
      console.log(`   Image: ${hasImage ? '🖼️  ' + imgFile : '⚠️  no image'}`);
      console.log(`   ID: ${p.id}\n`);
    } else {
      failed++;
      const err = result?.data?.createPost?.message || result?.errors?.[0]?.message || 'Unknown';
      console.log(`❌ ${i + 1}. [${campaign}] ${err}\n`);
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log('==========================');
  console.log(`Done! ✅ ${success} scheduled, ❌ ${failed} failed`);
  console.log(`View: https://publish.buffer.com/profile/${CHANNEL_ID}/queue`);
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  console.log('SportsBlock Buffer Uploader (CSV-driven)');
  console.log('========================================\n');

  if (args.includes('--list')) {
    await listQueue();
  } else if (args.includes('--clear')) {
    await clearQueue();
  } else {
    await upload(args.includes('--dry-run'));
  }
}

main().catch(console.error);
