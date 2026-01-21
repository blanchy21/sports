/**
 * Firebase Admin Communities Module
 *
 * Server-side only module that uses Firebase Admin SDK to bypass
 * Firestore security rules. Used by API routes.
 */

import { getAdminDb, isAdminConfigured } from './admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  Community,
  CommunityMember,
  CommunityInvite,
  CreateCommunityInput,
  UpdateCommunityInput,
  CommunityFilters,
  CommunityListResult,
  CommunityMemberRole,
  CommunityMemberStatus,
} from '@/types';

// Collection names
const COMMUNITIES_COLLECTION = 'communities';
const COMMUNITY_MEMBERS_COLLECTION = 'community_members';
const COMMUNITY_INVITES_COLLECTION = 'community_invites';

// Helper to generate URL-friendly slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

// Helper to convert Admin Firestore document to Community
function docToCommunity(docSnap: FirebaseFirestore.DocumentSnapshot): Community {
  const data = docSnap.data();
  if (!data) {
    throw new Error('Document data is undefined');
  }

  const createdAt = data.createdAt?.toDate?.() || new Date();
  const updatedAt = data.updatedAt?.toDate?.() || new Date();

  return {
    id: docSnap.id,
    slug: data.slug || '',
    name: data.name || '',
    title: data.name || '',
    about: data.about || '',
    description: data.description || '',
    sportCategory: data.sportCategory || 'general',
    type: data.type || 'public',
    avatar: data.avatar,
    coverImage: data.coverImage,
    createdBy: data.createdBy || '',
    createdByHive: data.createdByHive,
    createdAt,
    updatedAt,
    memberCount: data.memberCount || 0,
    postCount: data.postCount || 0,
    isVerified: data.isVerified || false,
    subscribers: data.memberCount || 0,
    posts: data.postCount || 0,
    created: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
    team: [],
  };
}

// Helper to convert Admin Firestore document to CommunityMember
function docToCommunityMember(docSnap: FirebaseFirestore.DocumentSnapshot): CommunityMember {
  const data = docSnap.data();
  if (!data) {
    throw new Error('Document data is undefined');
  }

  return {
    id: docSnap.id,
    communityId: data.communityId || '',
    userId: data.userId || '',
    username: data.username || '',
    hiveUsername: data.hiveUsername,
    role: data.role || 'member',
    status: data.status || 'active',
    joinedAt: data.joinedAt?.toDate?.() || new Date(),
    invitedBy: data.invitedBy,
  };
}

// Helper to convert Admin Firestore document to CommunityInvite
function docToCommunityInvite(docSnap: FirebaseFirestore.DocumentSnapshot): CommunityInvite {
  const data = docSnap.data();
  if (!data) {
    throw new Error('Document data is undefined');
  }

  return {
    id: docSnap.id,
    communityId: data.communityId || '',
    invitedEmail: data.invitedEmail,
    invitedHiveUser: data.invitedHiveUser,
    invitedBy: data.invitedBy || '',
    status: data.status || 'pending',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    expiresAt: data.expiresAt?.toDate?.() || new Date(),
  };
}

export class FirebaseCommunitiesAdmin {
  // ============================================
  // COMMUNITY CRUD OPERATIONS
  // ============================================

  /**
   * Create a new community
   */
  static async createCommunity(
    input: CreateCommunityInput,
    creatorId: string,
    creatorUsername: string,
    hiveUsername?: string
  ): Promise<Community> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const slug = input.slug || generateSlug(input.name);

    // Check if slug already exists
    const existingQuery = await db
      .collection(COMMUNITIES_COLLECTION)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      throw new Error(`A community with the slug "${slug}" already exists`);
    }

    const batch = db.batch();

    // Create community document
    const communityRef = db.collection(COMMUNITIES_COLLECTION).doc();
    const communityData = {
      slug,
      name: input.name,
      about: input.about,
      description: input.description || '',
      sportCategory: input.sportCategory,
      type: input.type,
      avatar: input.avatar || null,
      coverImage: input.coverImage || null,
      createdBy: creatorId,
      createdByHive: hiveUsername || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      memberCount: 1,
      postCount: 0,
      isVerified: false,
    };
    batch.set(communityRef, communityData);

    // Create creator as admin member
    const memberRef = db.collection(COMMUNITY_MEMBERS_COLLECTION).doc();
    const memberData = {
      communityId: communityRef.id,
      userId: creatorId,
      username: creatorUsername,
      hiveUsername: hiveUsername || null,
      role: 'admin' as CommunityMemberRole,
      status: 'active' as CommunityMemberStatus,
      joinedAt: FieldValue.serverTimestamp(),
    };
    batch.set(memberRef, memberData);

    await batch.commit();

    const createdDoc = await communityRef.get();
    return docToCommunity(createdDoc);
  }

  /**
   * Get a community by ID
   */
  static async getCommunityById(id: string): Promise<Community | null> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const docSnap = await db.collection(COMMUNITIES_COLLECTION).doc(id).get();
    if (!docSnap.exists) {
      return null;
    }
    return docToCommunity(docSnap);
  }

  /**
   * Get a community by slug
   */
  static async getCommunityBySlug(slug: string): Promise<Community | null> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const querySnapshot = await db
      .collection(COMMUNITIES_COLLECTION)
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }
    return docToCommunity(querySnapshot.docs[0]);
  }

  /**
   * List communities with filters
   */
  static async listCommunities(
    filters: CommunityFilters = {}
  ): Promise<CommunityListResult> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    let queryRef: FirebaseFirestore.Query = db.collection(COMMUNITIES_COLLECTION);

    // Sport category filter
    if (filters.sportCategory) {
      queryRef = queryRef.where('sportCategory', '==', filters.sportCategory);
    }

    // Type filter
    if (filters.type) {
      queryRef = queryRef.where('type', '==', filters.type);
    }

    // Sort
    const sortField = filters.sort || 'memberCount';
    const sortFieldMap: Record<string, string> = {
      memberCount: 'memberCount',
      postCount: 'postCount',
      createdAt: 'createdAt',
      name: 'name',
    };
    queryRef = queryRef.orderBy(sortFieldMap[sortField] || 'memberCount', 'desc');

    // Pagination
    const pageLimit = Math.min(filters.limit || 20, 100);
    queryRef = queryRef.limit(pageLimit + 1);

    const querySnapshot = await queryRef.get();
    let communities = querySnapshot.docs.map(docToCommunity);

    // Handle search filter (client-side)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      communities = communities.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.about.toLowerCase().includes(searchLower) ||
          c.slug.toLowerCase().includes(searchLower)
      );
    }

    const hasMore = communities.length > pageLimit;
    if (hasMore) {
      communities = communities.slice(0, pageLimit);
    }

    return {
      communities,
      total: communities.length,
      hasMore,
    };
  }

  /**
   * Update a community
   */
  static async updateCommunity(
    id: string,
    updates: UpdateCommunityInput
  ): Promise<Community> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const docRef = db.collection(COMMUNITIES_COLLECTION).doc(id);
    await docRef.update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updatedDoc = await docRef.get();
    if (!updatedDoc.exists) {
      throw new Error('Community not found after update');
    }
    return docToCommunity(updatedDoc);
  }

  /**
   * Delete a community
   */
  static async deleteCommunity(id: string): Promise<void> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const batch = db.batch();

    // Delete community
    const communityRef = db.collection(COMMUNITIES_COLLECTION).doc(id);
    batch.delete(communityRef);

    // Delete all members
    const membersSnapshot = await db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', id)
      .get();
    membersSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // Delete all invites
    const invitesSnapshot = await db
      .collection(COMMUNITY_INVITES_COLLECTION)
      .where('communityId', '==', id)
      .get();
    invitesSnapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();
  }

  /**
   * Increment post count for a community
   */
  static async incrementPostCount(communityId: string): Promise<void> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const docRef = db.collection(COMMUNITIES_COLLECTION).doc(communityId);
    await docRef.update({
      postCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // ============================================
  // MEMBERSHIP OPERATIONS
  // ============================================

  /**
   * Get a membership record
   */
  static async getMembership(
    communityId: string,
    userId: string
  ): Promise<CommunityMember | null> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const querySnapshot = await db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', communityId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (querySnapshot.empty) {
      return null;
    }
    return docToCommunityMember(querySnapshot.docs[0]);
  }

  /**
   * Join a community
   */
  static async joinCommunity(
    communityId: string,
    userId: string,
    username: string,
    hiveUsername?: string
  ): Promise<CommunityMember> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    // Get community to check type
    const community = await this.getCommunityById(communityId);
    if (!community) {
      throw new Error('Community not found');
    }

    // Check if already a member
    const existingMember = await this.getMembership(communityId, userId);
    if (existingMember) {
      if (existingMember.status === 'banned') {
        throw new Error('You are banned from this community');
      }
      if (existingMember.status === 'active') {
        throw new Error('You are already a member of this community');
      }
      return existingMember;
    }

    const batch = db.batch();

    // Determine initial status based on community type
    const status: CommunityMemberStatus =
      community.type === 'public' ? 'active' : 'pending';

    // Create member record
    const memberRef = db.collection(COMMUNITY_MEMBERS_COLLECTION).doc();
    const memberData = {
      communityId,
      userId,
      username,
      hiveUsername: hiveUsername || null,
      role: 'member' as CommunityMemberRole,
      status,
      joinedAt: FieldValue.serverTimestamp(),
    };
    batch.set(memberRef, memberData);

    // Increment member count only for public communities (instant join)
    if (status === 'active') {
      const communityRef = db.collection(COMMUNITIES_COLLECTION).doc(communityId);
      batch.update(communityRef, {
        memberCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    const createdDoc = await memberRef.get();
    return docToCommunityMember(createdDoc);
  }

  /**
   * Leave a community
   */
  static async leaveCommunity(communityId: string, userId: string): Promise<void> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const member = await this.getMembership(communityId, userId);
    if (!member) {
      throw new Error('You are not a member of this community');
    }

    if (member.role === 'admin') {
      // Check if there are other admins
      const adminsSnapshot = await db
        .collection(COMMUNITY_MEMBERS_COLLECTION)
        .where('communityId', '==', communityId)
        .where('role', '==', 'admin')
        .where('status', '==', 'active')
        .get();

      if (adminsSnapshot.size <= 1) {
        throw new Error(
          'You cannot leave as the only admin. Transfer ownership first.'
        );
      }
    }

    const batch = db.batch();

    // Find and delete the member document
    const memberSnapshot = await db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', communityId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!memberSnapshot.empty) {
      batch.delete(memberSnapshot.docs[0].ref);
    }

    // Decrement member count only if was active
    if (member.status === 'active') {
      const communityRef = db.collection(COMMUNITIES_COLLECTION).doc(communityId);
      batch.update(communityRef, {
        memberCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  /**
   * Get members of a community
   */
  static async getCommunityMembers(
    communityId: string,
    options: {
      status?: CommunityMemberStatus;
      role?: CommunityMemberRole;
      limit?: number;
    } = {}
  ): Promise<CommunityMember[]> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    let queryRef: FirebaseFirestore.Query = db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', communityId);

    if (options.status) {
      queryRef = queryRef.where('status', '==', options.status);
    }

    if (options.role) {
      queryRef = queryRef.where('role', '==', options.role);
    }

    queryRef = queryRef.orderBy('joinedAt', 'desc');

    if (options.limit) {
      queryRef = queryRef.limit(options.limit);
    }

    const querySnapshot = await queryRef.get();
    return querySnapshot.docs.map(docToCommunityMember);
  }

  /**
   * Approve a pending member
   */
  static async approveMember(
    communityId: string,
    memberId: string
  ): Promise<CommunityMember> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const batch = db.batch();

    const memberSnapshot = await db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', communityId)
      .where('userId', '==', memberId)
      .limit(1)
      .get();

    if (memberSnapshot.empty) {
      throw new Error('Member not found');
    }

    const memberRef = memberSnapshot.docs[0].ref;
    batch.update(memberRef, { status: 'active' });

    // Increment member count
    const communityRef = db.collection(COMMUNITIES_COLLECTION).doc(communityId);
    batch.update(communityRef, {
      memberCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    const updatedDoc = await memberRef.get();
    return docToCommunityMember(updatedDoc);
  }

  /**
   * Update a member's role
   */
  static async updateMemberRole(
    communityId: string,
    memberId: string,
    role: CommunityMemberRole
  ): Promise<CommunityMember> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const memberSnapshot = await db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', communityId)
      .where('userId', '==', memberId)
      .limit(1)
      .get();

    if (memberSnapshot.empty) {
      throw new Error('Member not found');
    }

    const memberRef = memberSnapshot.docs[0].ref;
    await memberRef.update({ role });

    const updatedDoc = await memberRef.get();
    return docToCommunityMember(updatedDoc);
  }

  /**
   * Ban a member
   */
  static async banMember(communityId: string, memberId: string): Promise<void> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const memberSnapshot = await db
      .collection(COMMUNITY_MEMBERS_COLLECTION)
      .where('communityId', '==', communityId)
      .where('userId', '==', memberId)
      .limit(1)
      .get();

    if (memberSnapshot.empty) {
      throw new Error('Member not found');
    }

    const memberDoc = memberSnapshot.docs[0];
    const wasActive = memberDoc.data().status === 'active';

    const batch = db.batch();

    batch.update(memberDoc.ref, { status: 'banned' });

    // Decrement member count if was active
    if (wasActive) {
      const communityRef = db.collection(COMMUNITIES_COLLECTION).doc(communityId);
      batch.update(communityRef, {
        memberCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
  }

  // ============================================
  // INVITE OPERATIONS
  // ============================================

  /**
   * Create an invite
   */
  static async createInvite(
    communityId: string,
    invitedBy: string,
    invitedEmail?: string,
    invitedHiveUser?: string
  ): Promise<CommunityInvite> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    if (!invitedEmail && !invitedHiveUser) {
      throw new Error('Either email or Hive username must be provided');
    }

    // Check if invite already exists
    let existingQuery: FirebaseFirestore.Query = db
      .collection(COMMUNITY_INVITES_COLLECTION)
      .where('communityId', '==', communityId)
      .where('status', '==', 'pending');

    if (invitedEmail) {
      existingQuery = existingQuery.where('invitedEmail', '==', invitedEmail);
    } else {
      existingQuery = existingQuery.where('invitedHiveUser', '==', invitedHiveUser);
    }

    const existingSnapshot = await existingQuery.limit(1).get();
    if (!existingSnapshot.empty) {
      throw new Error('An invite for this user already exists');
    }

    // Create invite (expires in 7 days)
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    const inviteRef = await db.collection(COMMUNITY_INVITES_COLLECTION).add({
      communityId,
      invitedEmail: invitedEmail || null,
      invitedHiveUser: invitedHiveUser || null,
      invitedBy,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    });

    const createdDoc = await inviteRef.get();
    return docToCommunityInvite(createdDoc);
  }

  /**
   * Accept an invite
   */
  static async acceptInvite(
    inviteId: string,
    userId: string,
    username: string,
    hiveUsername?: string
  ): Promise<CommunityMember> {
    const db = getAdminDb();
    if (!db) {
      throw new Error('Firebase Admin is not configured');
    }

    const inviteRef = db.collection(COMMUNITY_INVITES_COLLECTION).doc(inviteId);
    const inviteDoc = await inviteRef.get();

    if (!inviteDoc.exists) {
      throw new Error('Invite not found');
    }

    const invite = docToCommunityInvite(inviteDoc);

    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer valid');
    }

    const expiresAt = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
    if (expiresAt < new Date()) {
      throw new Error('Invite has expired');
    }

    const batch = db.batch();

    // Update invite status
    batch.update(inviteRef, { status: 'accepted' });

    // Create member record
    const memberRef = db.collection(COMMUNITY_MEMBERS_COLLECTION).doc();
    batch.set(memberRef, {
      communityId: invite.communityId,
      userId,
      username,
      hiveUsername: hiveUsername || null,
      role: 'member',
      status: 'active',
      joinedAt: FieldValue.serverTimestamp(),
      invitedBy: invite.invitedBy,
    });

    // Increment member count
    const communityRef = db.collection(COMMUNITIES_COLLECTION).doc(invite.communityId);
    batch.update(communityRef, {
      memberCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    const createdMemberDoc = await memberRef.get();
    return docToCommunityMember(createdMemberDoc);
  }
}
