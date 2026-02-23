# Firestore Backup Strategy

This document outlines the backup and disaster recovery procedures for Sportsblock's Firestore database.

## Overview

Sportsblock uses Firebase Firestore for storing:
- User profiles
- Bookmarks
- Notifications
- Drafts
- User settings
- Analytics data

## Automated Backups

### Option 1: Firebase Console (Recommended for Production)

1. **Enable Automated Backups via Firebase Console**
   - Go to Firebase Console > Firestore Database
   - Click on "Backups" tab
   - Enable "Scheduled backups"
   - Set schedule: Daily at 2:00 AM UTC
   - Set retention: 30 days
   - Set destination: `gs://[project-id]-backups/firestore/`

2. **Configure Cloud Storage Bucket**
   ```bash
   # Create backup bucket (if not exists)
   gsutil mb -l us-central1 gs://[project-id]-backups

   # Set lifecycle policy for 30-day retention
   gsutil lifecycle set lifecycle.json gs://[project-id]-backups
   ```

   `lifecycle.json`:
   ```json
   {
     "rule": [{
       "action": {"type": "Delete"},
       "condition": {"age": 30}
     }]
   }
   ```

### Option 2: Manual Export via gcloud

```bash
# Export all collections
gcloud firestore export gs://[project-id]-backups/firestore/$(date +%Y-%m-%d)

# Export specific collections
gcloud firestore export gs://[project-id]-backups/firestore/$(date +%Y-%m-%d) \
  --collection-ids=profiles,bookmarks,notifications,drafts
```

### Option 3: Vercel Cron Job (Serverless)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/backup-firestore",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Create `/api/cron/backup-firestore/route.ts`:
```typescript
// Note: This triggers the backup via Firebase Admin SDK
// The actual export happens in Google Cloud
```

## Restore Procedures

### Full Database Restore

```bash
# List available backups
gsutil ls gs://[project-id]-backups/firestore/

# Restore from backup
gcloud firestore import gs://[project-id]-backups/firestore/[backup-date]
```

### Partial Collection Restore

```bash
# Restore specific collections
gcloud firestore import gs://[project-id]-backups/firestore/[backup-date] \
  --collection-ids=profiles
```

### Point-in-Time Recovery (PITR)

If enabled, Firestore supports point-in-time recovery:

1. Go to Firebase Console > Firestore > Backups
2. Click "Restore"
3. Select date/time to restore to
4. Choose collections to restore
5. Specify new database name (recommended for testing)

## Verification

### Weekly Backup Verification

1. **Check backup exists**
   ```bash
   gsutil ls -l gs://[project-id]-backups/firestore/$(date +%Y-%m-%d)
   ```

2. **Verify backup size** (should be non-zero)
   ```bash
   gsutil du -s gs://[project-id]-backups/firestore/$(date +%Y-%m-%d)
   ```

3. **Test restore to dev environment** (monthly)
   - Restore to a test database
   - Verify data integrity
   - Document any issues

## Collections Reference

| Collection | Description | Backup Priority |
|------------|-------------|-----------------|
| `profiles` | User profile data | High |
| `bookmarks` | User bookmarks | Medium |
| `notifications` | User notifications | Low |
| `drafts` | Unpublished post drafts | High |
| `softPosts` | Firebase-only posts | Medium |
| `userSettings` | User preferences | Medium |
| `analytics` | Site analytics | Low (regeneratable) |

## Disaster Recovery Runbook

### Scenario: Data Corruption

1. Identify affected collections
2. Stop write operations (enable maintenance mode)
3. Restore affected collections from most recent clean backup
4. Verify data integrity
5. Re-enable write operations
6. Notify affected users if necessary

### Scenario: Accidental Deletion

1. Identify deleted documents/collections
2. Locate most recent backup containing the data
3. Restore specific collection or documents
4. Verify restoration
5. Document incident

### Scenario: Full Database Loss

1. Create new Firestore database (if necessary)
2. Restore from most recent backup:
   ```bash
   gcloud firestore import gs://[project-id]-backups/firestore/[latest-date]
   ```
3. Verify all collections restored
4. Update any necessary configurations
5. Test application functionality
6. Resume normal operations

## Monitoring

### Backup Alerts

Set up Cloud Monitoring alerts for:
- Backup job failures
- Backup size anomalies (sudden drops)
- Missing daily backups

### Metrics to Track

- Backup completion time
- Backup size trends
- Restore test success rate
- Time since last verified backup

## Security

- Backup bucket should have:
  - Restricted IAM access (backup service account only)
  - Object versioning enabled
  - Cross-region replication (optional, for critical data)
  - Encryption at rest (default in GCS)

## Cost Considerations

- Firestore export: No cost for the export operation
- Cloud Storage: ~$0.020/GB/month for storage
- Cross-region replication: Additional cost if enabled

Estimated monthly cost for 1GB database with 30-day retention: ~$0.60
