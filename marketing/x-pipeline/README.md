# SportsBlock X/Twitter Pipeline (Buffer-based)

A simple, zero-dependency pipeline for generating and scheduling SportsBlock tweets via Buffer.

## Overview

```
marketing/sportsblock-marketing-matrix.csv   <-- Source data (64 rows)
marketing/x-pipeline/generate-posts.js       <-- Generator script
marketing/x-pipeline/output/buffer-schedule.csv  <-- Buffer import file
marketing/x-pipeline/output/tweet-copy.md    <-- All tweet copy for browsing
marketing/x-pipeline/track-metrics.md        <-- Manual metrics tracker
marketing/assets/                            <-- Exported PNGs from Figma
```

## Step 1: Export Figma Designs as PNGs

1. Open the SportsBlock marketing Figma file
2. Select each frame you want to export
3. In the right panel, under "Export", choose **PNG** at **2x** resolution
4. Export all frames to `marketing/assets/`

**Naming convention** (the script expects this pattern):

```
{template}-{theme}-{cta_id}.png
```

Examples:
```
social-post-navy-earn.png
social-post-dark-earn.png
prediction-card-orange-predictions.png
```

Templates: `social-post`, `prediction-card`
Themes: `navy`, `dark`, `light`, `orange`
CTA IDs: `earn`, `community`, `ownership`, `predictions`

That gives you 32 PNGs total (2 templates x 4 themes x 4 CTAs).

## Step 2: Generate the Buffer CSV

```bash
node marketing/x-pipeline/generate-posts.js
```

This reads the marketing matrix CSV and outputs:
- `output/buffer-schedule.csv` — Ready for Buffer bulk upload
- `output/tweet-copy.md` — All tweet copy organised by CTA angle

The schedule spreads posts across the next 30 days at 3 optimal times per day (9am, 1pm, 6pm UTC).

## Step 3: Import into Buffer

1. Go to [buffer.com](https://buffer.com) and log in
2. Connect your X/Twitter account if you haven't already
3. Click **Publishing** in the left sidebar
4. Click **Queue** tab
5. Click the **...** menu (top right of the queue) and select **Import CSV** or **Bulk Upload**
6. Upload `marketing/x-pipeline/output/buffer-schedule.csv`
7. Map the columns:
   - **Text** → Post content
   - **Scheduled Date** → Schedule time
   - **Image Path** → You'll need to upload images separately (see note below)
8. Review the imported posts and adjust any scheduling as needed

**Note on images:** Buffer's CSV import handles text and scheduling well. For images, you have two options:
- **Option A (recommended):** After importing the CSV, go through each post in the queue and manually attach the corresponding image from `marketing/assets/`. The Image Path column tells you which file to use.
- **Option B:** Use Buffer's composer to create posts one at a time, pasting copy from `output/tweet-copy.md` and dragging in the image.

## Step 4: Track Performance

1. After posts go live, wait 48-72 hours for metrics to settle
2. Open `track-metrics.md`
3. For each post, grab numbers from X Analytics (analytics.twitter.com) or the post's built-in analytics view
4. Fill in: Impressions, Likes, Retweets, Replies, Link Clicks
5. At the end of each week, fill in the Weekly Summary table
6. Use the "Key Learnings" section to decide what to double down on

## Tips

- **Browse before scheduling:** Open `output/tweet-copy.md` and pick your favourite tweets. You don't have to use all of them.
- **Mix it up:** Don't post the same CTA angle three times in a row. The generated schedule already rotates through angles.
- **Personalise:** The generated copy is a starting point. Add timely references (match results, transfer news) to make tweets feel current.
- **Re-run anytime:** Edit the tweet banks in `generate-posts.js` and re-run to generate fresh copy.
- **Thread tip:** For long-form tweets, consider posting the "Long" variant as the first tweet in a thread, with the "Short" variant as a standalone.

## Requirements

- Node.js 14+ (no npm install needed, zero dependencies)
- Buffer free plan (or any tier) for scheduling
- X/Twitter account connected to Buffer
