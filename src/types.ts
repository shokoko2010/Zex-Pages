export type Target = { // Basic definition, may need refinement
  id: string;
  name: string;
};

export type Role = 'admin' | 'editor' | 'viewer' | 'owner'; // Basic definition, may need refinement

export type PublishedPost = { // Basic definition, may need refinement
  id: string;
  content: string;
  timestamp: string;
  likes: number;
  text: string | null; // Added text
  publishedAt: string | null; // Added publishedAt
  analytics: any; // Added analytics
};

export type Draft = { // Basic definition, may need refinement
  id: string;
  content: string;
};

export type InboxItem = { // Basic definition, may need refinement
  id: string;
  from: string;
  message: string;
  status: string;
};

export type PerformanceSummaryData = { // Basic definition, may need refinement
  reach: number;
  engagement: number;
  clicks: number;
  totalReach: number; // Added totalReach
  totalEngagement: number; // Added totalEngagement
  engagementRate: number; // Added engagementRate
  analytics: any; // Added analytics
  topPosts: PublishedPost[]; // Added topPosts
};

export type AudienceGrowthData = { // Basic definition, may need refinement
  date: string;
  followers: number;
};

export type ContentTypePerformanceData = { // Basic definition, may need refinement
  contentType: string;
  performanceMetric: number;
};

export type PageProfile = { // Basic definition, may need refinement
  id: string;
  name: string;
};

export type ScheduledPost = { // Basic definition, may need refinement
  id: string;
  content: string;
  scheduledTime: string;
  text: string | null; // Added text property
  imageUrl: string | null; // Added imageUrl property
};

export type AppUser = {
  id: string;
  email: string;
  fbAccessToken: string | null;
  uid: string;
  geminiApiKey: string | null;
  stabilityApiKey: string | null;
  lastLoginIp: string | null;
  createdAt: string | null; // Added createdAt
  onboardingCompleted: boolean;
  targets: Target[];
  planId: string | null;
  isAdmin: boolean;
};

export type HeatmapDataPoint = { // Basic definition, may need refinement
 hour: number;
 day: number;
 intensity: number;
};

export type Plan = { // Basic definition, may need refinement
 id: string;
 name: string;
  limits: any; // Added limits property (using any for now)
};

export type PostType = 'text' | 'image' | 'video'; // Basic definition, may need refinement


export type ContentPlanItem = { // Basic definition, may need refinement
 id: string;
 description: string;
};

export type StrategyHistoryItem = { // Basic definition, may need refinement
 id: string;
 action: string;
};

export type Business = { // Basic definition, may need refinement
  id: string;
  name: string;
};

export type StrategyRequest = { // Basic definition, may need refinement
  targetId: string;
  prompt: string;
};

export type TeamMember = { // Basic definition, may need refinement
  id: string;
  name: string;
};


export type DashboardView = 'dashboard' | 'planner' | 'scheduler' | 'inbox' | 'ads' | 'analytics' | 'profile' | 'users' | 'admin';

export interface DashboardViewRendererProps {
    activeView: DashboardView;
    managedTarget: Target;
    currentUserRole: Role;
    publishedPosts: PublishedPost[];
    publishedPostsLoading: boolean;
    scheduledPosts: ScheduledPost[];
    drafts: Draft[];
    inboxItems: InboxItem[];
    adCampaigns: any[];
    performanceSummaryData: PerformanceSummaryData | null;
    performanceSummaryText: string;
    isGeneratingSummary: boolean;
    audienceGrowthData: AudienceGrowthData[];
    heatmapData: HeatmapDataPoint[];
    contentTypeData: ContentTypePerformanceData[];
    isGeneratingDeepAnalytics: boolean;
    audienceCityData: { [key: string]: number };
    audienceCountryData: { [key: string]: number };
    userPlan: Plan | null;
    pageProfile: PageProfile;
    isFetchingProfile: boolean;
    isUpdatingCampaign: boolean;
    onSync: (target: Target) => void;
    onGeneratePerformanceSummary: () => void;
    onGenerateDeepAnalytics: () => void;
    onFetchPostInsights: (postId: string) => Promise<any>;
    onLoadDrafts: () => void;
    onDeleteDraft: (draftId: string) => Promise<void>;
    onPublish: (targetId: string, postType: PostType, options: any) => Promise<void>;
    onSaveDraft: (targetId: string, draftData: any) => Promise<void>;
    onDeleteScheduledPost: (postId: string) => Promise<void>;
    onUpdateScheduledPost: (targetId: string, postType: PostType, options: any) => Promise<void>;
    onSyncCalendar: () => void;
    isSyncingCalendar: boolean;
    onApprovePost: (postId: string) => void;
    onRejectPost: (postId: string) => void;
    onFetchMessageHistory: (conversationId: string) => Promise<any>;
    onSendMessage: (conversationId: string, message: string) => Promise<void>;
    onMarkAsDone: (conversationId: string) => Promise<void>;
    onSyncAdCampaigns: (target: Target) => Promise<void>;
    handleUpdateCampaignStatus: (campaignId: string, newStatus: "ACTIVE" | "PAUSED") => Promise<boolean>;
    fetchCampaignSubEntities: (campaignId: string) => Promise<{ adSets: any[], ads: any[] }>;
    onFetchPageProfile: () => Promise<void>;
    onProfileChange: (newProfile: PageProfile) => void;
    user: AppUser;
    allUsers: AppUser[];
    plans: Plan[];
    aiClient: any; // Using 'any' for GoogleGenAI to avoid circular dependencies if it's also a type
    stabilityApiKey: string | null;
    linkedInstagramTarget: Target | null;
    contentPlan: ContentPlanItem[] | null;
    isGeneratingPlan: boolean;
    planError: string | null;
    isSchedulingStrategy: boolean;
    strategyHistory: StrategyHistoryItem[];
    onGeneratePlan: (request: any) => Promise<void>;
    onScheduleStrategy: (plan: ContentPlanItem[]) => Promise<void>;
    onStartPost: (item: ContentPlanItem) => void;
    onLoadFromHistory: (item: StrategyHistoryItem) => void;
    onDeleteFromHistory: (strategyId: string) => Promise<void>;
};