
// ... (الكود السابق بدون تغيير)

export type PostType = 'post' | 'story' | 'reel'; // <-- جديد: تعريف أنواع المنشورات

export interface ScheduledPost {
  id: string;
  postId?: string;
  text: string;
  imageFile?: File;
  hasImage?: boolean;
  scheduledAt: Date; 
  isReminder: boolean;
  targetId: string;
  imageUrl?: string;
  photoId?: string;
  targetInfo: {
    name: string;
    avatarUrl: string;
    type: 'facebook' | 'instagram';
  }
  publishedAt?: string;
  isSynced?: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'scheduled' | 'error';
  type: PostType; // <-- جديد: إضافة نوع المنشور
}

// ... (بقية الكود بدون تغيير)
export interface Target {
  id: string;
  name: string;
  picture: {
    data: {
      url: string;
    };
  };
  access_token?: string;
  parentPageId?: string; 
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
  impressions?: number;
  reach?: number;
  engagedUsers?: number;
  loading?: boolean;
  lastUpdated?: string;
}

export interface PublishedPost {
  id: string;
  text: string;
  publishedAt: Date;
  imagePreview?: string;
  analytics: PostAnalytics;
  pageId: string;
  pageName: string;
  pageAvatarUrl: string;
  photoId?: string; // Add this line
}

export interface Draft {
  id: string;
  text: string;
  imagePreview?: string;
  imageFile?: File;
  createdAt: string;
  hasImage?: boolean;
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
  days: number[];
  time: string;
}

export interface BulkPostItem {
  id: string;
  text: string;
  imageFile?: File;
  imagePreview?: string;
  hasImage: boolean;
  scheduleDate: string;
  targetIds: string[];
  service?: 'gemini' | 'stability';
  prompt?: string;
}

export interface PageProfile {
  description: string;
  services: string;
  contactInfo: string;
  website: string;
  links: Link[];
  currentOffers: string;
  address: string;
  country: string;
  language: 'ar' | 'en' | 'mix';
  contentGenerationLanguages: ('ar' | 'en')[];
  ownerUid: string;
  team: TeamMember[];
  members: string[];
}

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  currentPlan: string;
  planExpiryDate?: string;
  isAdmin?: boolean;
  geminiApiKey?: string;
  stabilityApiKey?: string;
  favoriteTargetIds?: string[];
  onboardingCompleted?: boolean;
  targets?: Target[];
  fbAccessToken?: string;
  planId?: string;
  createdAt?: number;
  name?: string;
  lastLoginIp?: string;
}

export interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  limits: PlanLimits;
  adminOnly?: boolean;
  price?: number;
  pricePeriod?: 'monthly' | 'annual';
}

export interface StrategyHistoryItem {
  id: string;
  strategyRequest: StrategyRequest;
  contentPlan: ContentPlanItem[];
  timestamp: string;
  pageId: string;
  summary?: string;
  createdAt?: number;
  plan?: any;
}

export interface InboxMessage {
    id: string;
    text: string;
    from: 'user' | 'page';
    timestamp: string;
}
export interface InboxItem {
  id: string;
  type: 'comment' | 'message';
  from: {
    id: string;
    name: string;
    profilePictureUrl?: string;
  };
  text: string;
  timestamp: string;
  status: 'new' | 'replied' | 'done';
  context?: string;
  link?: string | null; // Allow null for link
  messages: InboxMessage[];
  conversationId: string;
  isReplied: boolean;
  authorPictureUrl: string;
  authorName: string;
  post?:any;
  authorId?:string;
}

export type AutoResponderTriggerSource = 'comments' | 'messages';
export type AutoResponderMatchType = 'any' | 'all' | 'exact' | 'contains';
export type AutoResponderActionType = 'like' | 'reply' | 'private_reply' | 'direct_message';

export interface RuleAction {
  type: AutoResponderActionType;
  enabled: boolean;
  messageVariations: string[];
  delay?: number;
  message?: string;
}

export interface AutoResponderRule {
  keywords: string[];
  response: string;
  active: boolean;
  trigger: {
    source: AutoResponderTriggerSource;
    matchType: AutoResponderMatchType;
    keywords: string[];
    negativeKeywords: string[];
  };
  actions: RuleAction[];
  enabled: boolean;
  name: string;
  id: string;
  replyOncePerUser: boolean;
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
  date: string;
  fanCount: number;
}

export interface HeatmapDataPoint {
  day: number;
  hour: number;
  engagement: number;
}

export interface ContentTypePerformanceData {
  type: string;
  count: number;
  avgEngagement: number;
}

export interface PerformanceSummaryData {
  totalPosts: number;
  averageEngagement: number;
  growthRate: number;
  totalReach: number;
  totalEngagement: number;
  engagementRate: number;
  topPosts: any[];
  postCount: number;
  totalImpressions: number; // Added this line
  fanCount: number; // Added this line
}

export interface Link {
    id: string;
    label: string;
    url: string;
}

export interface PlanLimits {
    maxPages: number;
    maxTeamMembers: number;
    aiFeatures: boolean;
    bulkScheduling: boolean;
    contentPlanner: boolean;
    autoResponder: boolean;
    contentApprovalWorkflow: boolean;
    maxScheduledPostsPerMonth: number;
    imageGenerationQuota: number;
    pages: number;
    scheduledPosts: number;
    drafts: number;
    aiText: boolean;
    aiImage: boolean;
    deepAnalytics: boolean;
}

export interface TeamMember {
    uid: string;
    role: Role;
    email: string;
}

export interface DashboardPageProps {
  onSyncHistory: (pageTarget: Target) => Promise<void>;
}

declare global {
    interface Window {
        FB: any;
    }
}
