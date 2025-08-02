export type Target = { // Basic definition, may need refinement
  id: string;
  name: string;
  picture?: { data: { url: string } }; // Added picture
 type?: string; // Added type
  parentPageId?: string; // Added parentPageId
  access_token?: string; // Added access_token
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
  pageAvatarUrl?: string; // Added pageAvatarUrl
  pageName?: string; // Added pageName
  imagePreview?: string; // Added imagePreview
};

export type Draft = { // Basic definition, may need refinement
  id: string;
  content: string;
  imagePreview?: string; // Added imagePreview
 hasImage?: boolean; // Added hasImage
  text?: string; // Added text
};

export type InboxItem = { // Basic definition, may need refinement
  id: string;
  from: string;
  message: string;
  status: string;
 type?: string; // Added type
  conversationId?: string; // Added conversationId
 messages?: any[]; // Added messages
 text?: string; // Added text
 authorName?: string; // Added authorName
 authorPictureUrl?: string; // Added authorPictureUrl
  timestamp?: string; // Added timestamp
  post?: any; // Added post
  link?: string; // Added link
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
  totalPosts?: number; // Added totalPosts
  totalImpressions?: number; // Added totalImpressions
  fanCount?: number; // Added fanCount
  postCount?: number; // Added postCount
};

export type AudienceGrowthData = { // Basic definition, may need refinement
  date: string;
  followers: number;
 fanCount?: number; // Added fanCount
};

export type ContentTypePerformanceData = { // Basic definition, may need refinement
  contentType: string;
  performanceMetric: number;
  avgEngagement?: number; // Added avgEngagement
  count?: number; // Added count
  type?: string; // Added type
};

export type PageProfile = { // Basic definition, may need refinement
  id: string;
  name: string;
 language?: string; // Added language
 contentGenerationLanguages?: string[]; // Added contentGenerationLanguages
 links?: { type: string; url: string }[]; // Added links
 contactInfo?: { address?: string; country?: string }; // Added contactInfo
 address?: string; // Added address
 country?: string; // Added country
 currentOffers?: string; // Added currentOffers
 team?: TeamMember[]; // Added team
 ownerUid?: string; // Added ownerUid
  members?: any[]; // Added members
  description?: string; // Added description
  services?: string; // Added services
  website?: string; // Added website
};

export type ScheduledPost = { // Basic definition, may need refinement
  id: string;
  content: string;
  scheduledTime: string;
 text: string | null; // Added text property
 imageUrl: string | null; // Added imageUrl property
 scheduledAt?: string; // Added scheduledAt - Note: Typo in error message, should likely be scheduledTime
 publishedAt?: string; // Added publishedAt
 status?: string; // Added status
 isReminder?: boolean; // Added isReminder
 isSynced?: boolean; // Added isSynced
 hasImage?: boolean; // Added hasImage
 targetInfo?: Target; // Added targetInfo
  postId?: string; // Added postId
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
  photoURL?: string | null; // Added photoURL
  name?: string | null; // Added name
  displayName?: string | null; // Added displayName
};

export type HeatmapDataPoint = { // Basic definition, may need refinement
 hour: number;
 day: number;
 intensity: number;
 engagement?: number; // Added engagement
};

export type Plan = { // Basic definition, may need refinement
 id: string;
 name: string;
 price: number;
  pricePeriod: string;
  limits: any; // Added limits property (using any for now)
 adminOnly: boolean;
  features?: string[]; // Added features
};

export type PostType = 'text' | 'image' | 'video'; // Basic definition, may need refinement

export type AutoResponderSettings = {}; // Added missing type
export type AutoResponderRule = {}; // Added missing type
export type AutoResponderTriggerSource = {}; // Added missing type
export type AutoResponderMatchType = {}; // Added missing type
export type AutoResponderActionType = {}; // Added missing type
export type BulkPostItem = {}; // Added missing type
export type WeeklyScheduleSettings = {}; // Added missing type
export type Link = {}; // Added missing type
export type PlanLimits = {}; // Added missing type
export type PostAnalytics = {}; // Added missing type
export type InboxMessage = {}; // Added missing type


export type ContentPlanItem = { // Basic definition, may need refinement
 id: string;
 description: string;
 day?: string; // Added day
 hook?: string; // Added hook
 headline?: string; // Added headline
 body?: string; // Added body
 imageIdea?: string; // Added imageIdea
};

export type StrategyHistoryItem = { // Basic definition, may need refinement
 plan: ContentPlanItem[];
 id: string;
 action: string;
 summary?: string; // Added summary
 createdAt?: string; // Added createdAt
};

export type Business = { // Basic definition, may need refinement
  id: string;
  name: string;
};

export type StrategyRequest = { // Basic definition, may need refinement
  targetId: string;
  prompt: string;
 type: string;
 duration?: string; // Added duration
 postCount?: number; // Added postCount
 pillars?: any; // Added pillars
 campaignName?: string; // Added campaignName
 campaignObjective?: string; // Added campaignObjective
 occasion?: string; // Added occasion
 pillarTopic?: string; // Added pillarTopic
 audience?: string; // Added audience
 goals?: string; // Added goals
 tone?: string; // Added tone
};

export type TeamMember = { // Basic definition, may need refinement
  id: string;
  name: string;
  uid?: string; // Added uid
 role?: Role; // Assuming team members have roles
};


export type DashboardView = 'dashboard' | 'planner' | 'scheduler' | 'inbox' | 'ads' | 'analytics' | 'profile' | 'users' | 'admin' | 'composer' | 'calendar' | 'drafts' | 'bulk'; // Added missing views


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
}