import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  DocumentSnapshot,
  increment,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
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

const FIREBASE_NOT_CONFIGURED_ERROR = new Error(
  'Firebase is not configured. Community features are unavailable. ' +
    'Set NEXT_PUBLIC_FIREBASE_* environment variables to enable.'
);

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

// Helper to convert Firestore document to Community
function docToCommunity(docSnap: DocumentSnapshot): Community {
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
    title: data.name || '', // Alias for backward compatibility
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
    // Legacy aliases
    subscribers: data.memberCount || 0,
    posts: data.postCount || 0,
    created: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt),
    team: [], // Will be populated separately if needed
  };
}

// Helper to convert Firestore document to CommunityMember
function docToCommunityMember(docSnap: DocumentSnapshot): CommunityMember {
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

// Helper to convert Firestore document to CommunityInvite
function docToCommunityInvite(docSnap: DocumentSnapshot): CommunityInvite {
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

export class FirebaseCommunities {
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
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const slug = input.slug || generateSlug(input.name);

      // Check if slug already exists
      const existingQuery = query(
        collection(db, COMMUNITIES_COLLECTION),
        where('slug', '==', slug),
        limit(1)
      );
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        throw new Error(`A community with the slug "${slug}" already exists`);
      }

      const batch = writeBatch(db);

      // Create community document
      const communityRef = doc(collection(db, COMMUNITIES_COLLECTION));
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        memberCount: 1, // Creator is the first member
        postCount: 0,
        isVerified: false,
      };
      batch.set(communityRef, communityData);

      // Create creator as admin member
      const memberRef = doc(collection(db, COMMUNITY_MEMBERS_COLLECTION));
      const memberData = {
        communityId: communityRef.id,
        userId: creatorId,
        username: creatorUsername,
        hiveUsername: hiveUsername || null,
        role: 'admin' as CommunityMemberRole,
        status: 'active' as CommunityMemberStatus,
        joinedAt: serverTimestamp(),
      };
      batch.set(memberRef, memberData);

      await batch.commit();

      // Return the created community
      const createdDoc = await getDoc(communityRef);
      return docToCommunity(createdDoc);
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  }

  /**
   * Get a community by ID
   */
  static async getCommunityById(id: string): Promise<Community | null> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, COMMUNITIES_COLLECTION, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return docToCommunity(docSnap);
    } catch (error) {
      console.error('Error getting community by ID:', error);
      return null;
    }
  }

  /**
   * Get a community by slug
   */
  static async getCommunityBySlug(slug: string): Promise<Community | null> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, COMMUNITIES_COLLECTION),
        where('slug', '==', slug),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return docToCommunity(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error getting community by slug:', error);
      return null;
    }
  }

  /**
   * List communities with filters
   */
  static async listCommunities(
    filters: CommunityFilters = {},
    lastDoc?: DocumentSnapshot
  ): Promise<CommunityListResult> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const constraints: Parameters<typeof query>[1][] = [];

      // Sport category filter
      if (filters.sportCategory) {
        constraints.push(where('sportCategory', '==', filters.sportCategory));
      }

      // Type filter
      if (filters.type) {
        constraints.push(where('type', '==', filters.type));
      }

      // Sort
      const sortField = filters.sort || 'memberCount';
      const sortFieldMap: Record<string, string> = {
        memberCount: 'memberCount',
        postCount: 'postCount',
        createdAt: 'createdAt',
        name: 'name',
      };
      constraints.push(orderBy(sortFieldMap[sortField] || 'memberCount', 'desc'));

      // Pagination
      const pageLimit = Math.min(filters.limit || 20, 100);
      constraints.push(limit(pageLimit + 1)); // +1 to check if there are more

      if (lastDoc) {
        constraints.push(startAfter(lastDoc));
      }

      const q = query(collection(db, COMMUNITIES_COLLECTION), ...constraints);
      const querySnapshot = await getDocs(q);

      let communities = querySnapshot.docs.map(docToCommunity);

      // Handle search filter (client-side for now, could use Algolia for production)
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
    } catch (error) {
      console.error('Error listing communities:', error);
      throw error;
    }
  }

  /**
   * Update a community
   */
  static async updateCommunity(
    id: string,
    updates: UpdateCommunityInput
  ): Promise<Community> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, COMMUNITIES_COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Community not found after update');
      }

      return docToCommunity(updatedDoc);
    } catch (error) {
      console.error('Error updating community:', error);
      throw error;
    }
  }

  /**
   * Delete a community
   */
  static async deleteCommunity(id: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const batch = writeBatch(db);

      // Delete community
      const communityRef = doc(db, COMMUNITIES_COLLECTION, id);
      batch.delete(communityRef);

      // Delete all members
      const membersQuery = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('communityId', '==', id)
      );
      const membersSnapshot = await getDocs(membersQuery);
      membersSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // Delete all invites
      const invitesQuery = query(
        collection(db, COMMUNITY_INVITES_COLLECTION),
        where('communityId', '==', id)
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      invitesSnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error('Error deleting community:', error);
      throw error;
    }
  }

  /**
   * Increment post count for a community
   */
  static async incrementPostCount(communityId: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const docRef = doc(db, COMMUNITIES_COLLECTION, communityId);
      await updateDoc(docRef, {
        postCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error incrementing post count:', error);
      throw error;
    }
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
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const q = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('communityId', '==', communityId),
        where('userId', '==', userId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      return docToCommunityMember(querySnapshot.docs[0]);
    } catch (error) {
      console.error('Error getting membership:', error);
      return null;
    }
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
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
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
        // If pending, return the existing record
        return existingMember;
      }

      const batch = writeBatch(db);

      // Determine initial status based on community type
      const status: CommunityMemberStatus =
        community.type === 'public' ? 'active' : 'pending';

      // Create member record
      const memberRef = doc(collection(db, COMMUNITY_MEMBERS_COLLECTION));
      const memberData = {
        communityId,
        userId,
        username,
        hiveUsername: hiveUsername || null,
        role: 'member' as CommunityMemberRole,
        status,
        joinedAt: serverTimestamp(),
      };
      batch.set(memberRef, memberData);

      // Increment member count only for public communities (instant join)
      if (status === 'active') {
        const communityRef = doc(db, COMMUNITIES_COLLECTION, communityId);
        batch.update(communityRef, {
          memberCount: increment(1),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      const createdDoc = await getDoc(memberRef);
      return docToCommunityMember(createdDoc);
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  }

  /**
   * Leave a community
   */
  static async leaveCommunity(communityId: string, userId: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const member = await this.getMembership(communityId, userId);
      if (!member) {
        throw new Error('You are not a member of this community');
      }

      if (member.role === 'admin') {
        // Check if there are other admins
        const adminsQuery = query(
          collection(db, COMMUNITY_MEMBERS_COLLECTION),
          where('communityId', '==', communityId),
          where('role', '==', 'admin'),
          where('status', '==', 'active')
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        if (adminsSnapshot.size <= 1) {
          throw new Error(
            'You cannot leave as the only admin. Transfer ownership first.'
          );
        }
      }

      const batch = writeBatch(db);

      // Find and delete the member document
      const memberQuery = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('communityId', '==', communityId),
        where('userId', '==', userId),
        limit(1)
      );
      const memberSnapshot = await getDocs(memberQuery);
      if (!memberSnapshot.empty) {
        batch.delete(memberSnapshot.docs[0].ref);
      }

      // Decrement member count only if was active
      if (member.status === 'active') {
        const communityRef = doc(db, COMMUNITIES_COLLECTION, communityId);
        batch.update(communityRef, {
          memberCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
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
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const constraints: Parameters<typeof query>[1][] = [
        where('communityId', '==', communityId),
      ];

      if (options.status) {
        constraints.push(where('status', '==', options.status));
      }

      if (options.role) {
        constraints.push(where('role', '==', options.role));
      }

      constraints.push(orderBy('joinedAt', 'desc'));

      if (options.limit) {
        constraints.push(limit(options.limit));
      }

      const q = query(collection(db, COMMUNITY_MEMBERS_COLLECTION), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docToCommunityMember);
    } catch (error) {
      console.error('Error getting community members:', error);
      return [];
    }
  }

  /**
   * Get communities a user has joined
   */
  static async getUserCommunities(userId: string): Promise<Community[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const memberQuery = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );
      const memberSnapshot = await getDocs(memberQuery);

      const communityIds = memberSnapshot.docs.map(
        (docSnap) => docSnap.data().communityId
      );

      if (communityIds.length === 0) {
        return [];
      }

      // Fetch communities (batch in groups of 10 for Firestore 'in' limit)
      const communities: Community[] = [];
      for (let i = 0; i < communityIds.length; i += 10) {
        const batch = communityIds.slice(i, i + 10);
        const communitiesQuery = query(
          collection(db, COMMUNITIES_COLLECTION),
          where('__name__', 'in', batch)
        );
        const communitiesSnapshot = await getDocs(communitiesQuery);
        communities.push(...communitiesSnapshot.docs.map(docToCommunity));
      }

      return communities;
    } catch (error) {
      console.error('Error getting user communities:', error);
      return [];
    }
  }

  /**
   * Approve a pending member
   */
  static async approveMember(
    communityId: string,
    memberId: string
  ): Promise<CommunityMember> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const batch = writeBatch(db);

      // Find member by ID
      const memberQuery = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('communityId', '==', communityId),
        where('userId', '==', memberId),
        limit(1)
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (memberSnapshot.empty) {
        throw new Error('Member not found');
      }

      const memberRef = memberSnapshot.docs[0].ref;
      batch.update(memberRef, {
        status: 'active',
      });

      // Increment member count
      const communityRef = doc(db, COMMUNITIES_COLLECTION, communityId);
      batch.update(communityRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const updatedDoc = await getDoc(memberRef);
      return docToCommunityMember(updatedDoc);
    } catch (error) {
      console.error('Error approving member:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    communityId: string,
    memberId: string,
    role: CommunityMemberRole
  ): Promise<CommunityMember> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const memberQuery = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('communityId', '==', communityId),
        where('userId', '==', memberId),
        limit(1)
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (memberSnapshot.empty) {
        throw new Error('Member not found');
      }

      const memberRef = memberSnapshot.docs[0].ref;
      await updateDoc(memberRef, { role });

      const updatedDoc = await getDoc(memberRef);
      return docToCommunityMember(updatedDoc);
    } catch (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  }

  /**
   * Ban a member
   */
  static async banMember(communityId: string, memberId: string): Promise<void> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const memberQuery = query(
        collection(db, COMMUNITY_MEMBERS_COLLECTION),
        where('communityId', '==', communityId),
        where('userId', '==', memberId),
        limit(1)
      );
      const memberSnapshot = await getDocs(memberQuery);

      if (memberSnapshot.empty) {
        throw new Error('Member not found');
      }

      const memberDoc = memberSnapshot.docs[0];
      const wasActive = memberDoc.data().status === 'active';

      const batch = writeBatch(db);

      batch.update(memberDoc.ref, { status: 'banned' });

      // Decrement member count if was active
      if (wasActive) {
        const communityRef = doc(db, COMMUNITIES_COLLECTION, communityId);
        batch.update(communityRef, {
          memberCount: increment(-1),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error banning member:', error);
      throw error;
    }
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
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    if (!invitedEmail && !invitedHiveUser) {
      throw new Error('Either email or Hive username must be provided');
    }

    try {
      // Check if invite already exists
      const existingQuery = query(
        collection(db, COMMUNITY_INVITES_COLLECTION),
        where('communityId', '==', communityId),
        ...(invitedEmail
          ? [where('invitedEmail', '==', invitedEmail)]
          : [where('invitedHiveUser', '==', invitedHiveUser)]),
        where('status', '==', 'pending'),
        limit(1)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        throw new Error('An invite for this user already exists');
      }

      // Create invite (expires in 7 days)
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      const inviteRef = await addDoc(collection(db, COMMUNITY_INVITES_COLLECTION), {
        communityId,
        invitedEmail: invitedEmail || null,
        invitedHiveUser: invitedHiveUser || null,
        invitedBy,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt,
      });

      const createdDoc = await getDoc(inviteRef);
      return docToCommunityInvite(createdDoc);
    } catch (error) {
      console.error('Error creating invite:', error);
      throw error;
    }
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
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    try {
      const inviteRef = doc(db, COMMUNITY_INVITES_COLLECTION, inviteId);
      const inviteDoc = await getDoc(inviteRef);

      if (!inviteDoc.exists()) {
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

      const batch = writeBatch(db);

      // Update invite status
      batch.update(inviteRef, { status: 'accepted' });

      // Create member record
      const memberRef = doc(collection(db, COMMUNITY_MEMBERS_COLLECTION));
      batch.set(memberRef, {
        communityId: invite.communityId,
        userId,
        username,
        hiveUsername: hiveUsername || null,
        role: 'member',
        status: 'active',
        joinedAt: serverTimestamp(),
        invitedBy: invite.invitedBy,
      });

      // Increment member count
      const communityRef = doc(db, COMMUNITIES_COLLECTION, invite.communityId);
      batch.update(communityRef, {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const createdMemberDoc = await getDoc(memberRef);
      return docToCommunityMember(createdMemberDoc);
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }

  /**
   * Get pending invites for a user
   */
  static async getUserInvites(
    email?: string,
    hiveUsername?: string
  ): Promise<CommunityInvite[]> {
    if (!db) {
      throw FIREBASE_NOT_CONFIGURED_ERROR;
    }

    if (!email && !hiveUsername) {
      return [];
    }

    try {
      const invites: CommunityInvite[] = [];

      if (email) {
        const emailQuery = query(
          collection(db, COMMUNITY_INVITES_COLLECTION),
          where('invitedEmail', '==', email),
          where('status', '==', 'pending')
        );
        const emailSnapshot = await getDocs(emailQuery);
        invites.push(...emailSnapshot.docs.map(docToCommunityInvite));
      }

      if (hiveUsername) {
        const hiveQuery = query(
          collection(db, COMMUNITY_INVITES_COLLECTION),
          where('invitedHiveUser', '==', hiveUsername),
          where('status', '==', 'pending')
        );
        const hiveSnapshot = await getDocs(hiveQuery);
        invites.push(...hiveSnapshot.docs.map(docToCommunityInvite));
      }

      // Filter out expired invites
      const now = new Date();
      return invites.filter((invite) => {
        const expiresAt = invite.expiresAt instanceof Date ? invite.expiresAt : new Date(invite.expiresAt);
        return expiresAt > now;
      });
    } catch (error) {
      console.error('Error getting user invites:', error);
      return [];
    }
  }
}
