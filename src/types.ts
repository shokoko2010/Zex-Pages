export interface Target {
  id: string;
  name: string;
  picture: {
      data: {
          url: string;
      };
  };
  access_token?: string;
  parentPageId?: string; // For Instagram business accounts linked to a Facebook Page
  type: 'facebook' | 'instagram';
  isFavorite?: boolean;
}

export interface Business {
  id: string;
  name: string;
  pictureUrl: string;
}

export interface PostAnalytics {
  likes?: number;
  comments?: number;
  shares?: number;
  loading?: boolean; // Added
  lastUpdated?: string; // ISO string, Added
}

export interface PublishedPost {
  id: string;
  text: string;
  publishedAt: Date;
  imagePreview?: string;
  analytics: PostAnalytics;
  pageId: string; // Added
  pageName: string; // Added
  pageAvatarUrl: string; // Added
}

export interface ScheduledPost {
  id: string; // This can be the local ID or the Facebook post ID after syncing
  postId?: string; // The definitive Facebook Post ID from FB Graph API
  text: string;
  imageUrl?: string;
  imageFile?: File; // For reminder re-publishing, or initially uploaded file
  hasImage?: boolean; // To track if an image exists, even if preview is gone
  scheduledAt: Date; // Actual scheduled date for FB scheduler
  isReminder: boolean; // Is this a reminder post (not directly from FB scheduler)
  targetId: string; // ID of the target (page/group/ig)
  targetInfo: { // Simplified target info for scheduled post display
      name: string;
      avatarUrl: string;
      type: 'facebook' | 'instagram';
  }
  publishedAt?: string; // ISO string for when it was actually published by FB
  isSynced?: boolean; // To indicate it's synced with Facebook's scheduler
  status?: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'error'; // Updated status types
}

export interface Draft {
  id: string;
  text: string;
  imagePreview?: string;
  imageFile?: File;
  createdAt: string;
}

export interface ContentPlanItem {
  day: string;
  hook: string;
  headline: string;
  body: string;
  imageIdea: string;
}

export interface StrategyRequest {
  type: 'standard' | 'campaign' | 'occasion' | 'pillar' | 'images';
  duration: 'weekly' | 'monthly' | 'annual';
  audience: string;
  goals: string;
  tone: string;
  pillars?: string;
  campaignName?: string;
  campaignObjective?: string;
  occasion?: string;
  pillarTopic?: string;
  postCount?: number;
}

export interface WeeklyScheduleSettings {
  days: number[]; // Array of day numbers (0 for Sunday, 6 for Saturday)
  time: string; // "HH:MM"
}

export interface BulkPostItem {
  id: string;
  text: string;
  imageFile?: File;
  imagePreview?: string;
  hasImage: boolean;
  scheduleDate: string; // ISO string
  targetIds: string[]; // Array of selected target IDs
  service?: 'gemini' | 'stability'; // For AI image generation
  prompt?: string; // For AI image generation
}

export interface PageProfile {
  description: string;
  services: string;
  contactInfo: string;
  website: string;
  links: { label: string; url: string }[];
  currentOffers: string;
  address: string;
  country: string;
  language: 'ar' | 'en' | 'mix'; // Primary language of the page content
  contentGenerationLanguages: ('ar' | 'en')[]; // Languages AI should generate content in
  ownerUid: string; // User ID of the page owner
  team: { uid: string; role: Role }[]; // Array of team members and their roles
  members: string[]; // UIDs of all members (owner + team members)
}

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  currentPlan: string; // ID of the active plan (e.g., 'free', 'pro')
  planExpiryDate?: string; // ISO string
  // Add other user profile info as needed
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  limits: {
      maxPages: number;
      maxTeamMembers: number;
      aiFeatures: boolean;
      bulkScheduling: boolean;
      contentPlanner: boolean;
      autoResponder: boolean;
      contentApprovalWorkflow: boolean;
      maxScheduledPostsPerMonth: number;
      imageGenerationQuota: number; // e.g., number of images per month
  };
  adminOnly?: boolean; // If this plan is for internal admins only
}

export interface StrategyHistoryItem {
  id: string;
  strategyRequest: StrategyRequest;
  contentPlan: ContentPlanItem[];
  timestamp: string; // ISO string
  pageId: string;
}

export interface InboxItem {
  id: string; // Unique ID for the conversation/comment
  type: 'comment' | 'message';
  from: {
      id: string;
      name: string;
      profilePictureUrl?: string;
  };
  text: string;
  timestamp: string; // ISO string
  status: 'new' | 'replied' | 'done'; // 'new', 'replied', 'done'
  context?: string; // e.g., post ID or message thread ID
  link?: string; // Link to the comment/message on Facebook/Instagram
}

export interface AutoResponderRule {
  keywords: string[];
  response: string;
  active: boolean;
}

export interface AutoResponderFallback {
  mode: 'off' | 'static' | 'ai';
  staticMessage?: string;
}

export interface AutoResponderSettings {
  rules: AutoResponderRule[];
  fallback: AutoResponderFallback;
}

export interface AudienceGrowthData {
  date: string; // YYYY-MM-DD
  followers: number;
}

export interface HeatmapDataPoint {
  day: number; // 0 (Sunday) to 6 (Saturday)
  hour: number; // 0 to 23
  engagement: number; // Normalized from 0 to 1
}

export interface ContentTypePerformanceData {
  type: string;
  count: number;
  avgEngagement: number;
}