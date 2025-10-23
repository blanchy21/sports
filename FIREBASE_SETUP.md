# Firebase Setup Guide

This guide will help you set up Firebase for the Sportsblock authentication system.

## 1. Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in
2. Click "Create a project"
3. Enter project name: `sportsblock-auth`
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Enable Authentication

1. In the Firebase console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication
5. Optionally enable other providers (Google, GitHub, etc.)

## 3. Create Firestore Database

1. Go to "Firestore Database" in the left sidebar
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location for your database
5. Click "Done"

## 4. Set Up Security Rules

In the Firestore Database section, go to "Rules" and replace the default rules with:

**For Development (Test Mode) - Use this first:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**If the above doesn't work, try the older format:**
```
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**For Production (Secure Rules):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /soft_posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.authorId;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.authorId;
    }
  }
}
```

## 5. Get Project Configuration

1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon (</>) to add a web app
4. Register your app with a nickname (e.g., "Sportsblock Web")
5. Copy the Firebase configuration object

## 6. Update Environment Variables

Update your `.env.local` file with the actual Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_actual_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_actual_app_id
```

## 7. Test the Setup

1. Start your development server: `npm run dev`
2. Navigate to `/auth`
3. Try creating a new account with email/password
4. Check the Firebase console to see if the user and profile were created

## 8. Database Structure

The following collections will be automatically created:

### `profiles` Collection
```javascript
{
  id: "user_uid",
  username: "string",
  displayName: "string",
  bio: "string (optional)",
  avatarUrl: "string (optional)",
  isHiveUser: boolean,
  hiveUsername: "string (optional)",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `soft_posts` Collection
```javascript
{
  id: "auto_generated",
  authorId: "user_uid",
  title: "string",
  content: "string",
  permlink: "string (unique)",
  tags: ["array", "of", "strings"],
  createdAt: timestamp,
  updatedAt: timestamp,
  isPublishedToHive: boolean,
  hivePermlink: "string (optional)"
}
```

## 9. Firebase Functions (Optional)

You can add Firebase Functions for server-side operations:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createUserProfile = functions.auth.user().onCreate(async (user) => {
  const { uid, email, displayName } = user;
  
  return admin.firestore().collection('profiles').doc(uid).set({
    username: email.split('@')[0],
    displayName: displayName || email.split('@')[0],
    isHiveUser: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});
```

## 10. Monitoring and Analytics

1. **Authentication**: Monitor user signups and sessions in the Authentication section
2. **Firestore**: Check database usage and performance in the Firestore section
3. **Functions**: Monitor function executions and errors in the Functions section
4. **Analytics**: View user behavior and app performance in the Analytics section

## 11. Production Considerations

### Security Rules for Production
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /soft_posts/{postId} {
      allow read: if true;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.authorId;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.authorId;
    }
  }
}
```

### Environment Variables for Production
```env
# Production Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_production_app_id
```

## 12. Troubleshooting

### Common Issues

1. **Authentication Errors**: Check that email/password is enabled in Firebase console
2. **Firestore Permission Denied**: Verify security rules are correctly configured
3. **Environment Variables**: Ensure all Firebase config variables are set correctly
4. **CORS Issues**: Firebase handles CORS automatically, but check for any custom configurations

### Debug Mode

Enable debug mode in your `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_DEBUG=true
```

This will provide more detailed error messages in the console.

## 13. Migration from Supabase

If you're migrating from Supabase:

1. Export your existing data from Supabase
2. Use Firebase Admin SDK to import data into Firestore
3. Update all authentication calls to use Firebase
4. Test thoroughly before switching production traffic

## 14. Next Steps

Once Firebase is set up:

1. Test all authentication flows (email signup, login, logout)
2. Test post creation and management
3. Test the upgrade flow from soft to Hive accounts
4. Set up monitoring and alerts
5. Configure backup strategies
6. Set up Firebase Hosting for production deployment (optional)
