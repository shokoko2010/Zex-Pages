
import React from 'react';
import { GoogleGenAI } from '@google/genai';
import DashboardPage from './DashboardPage';
import ContentPlannerPage from './ContentPlannerPage';
import BulkSchedulerPage from './BulkSchedulerPage';
import InboxPage from './InboxPage';
import AdsManagerPage from './AdsManagerPage';
import AnalyticsPage from './AnalyticsPage';
import PageProfilePage from './PageProfilePage';
import UserManagementPage from './UserManagementPage';
import AdminPage from './AdminPage';
import { Target, Role, PublishedPost, ScheduledPost, Draft, InboxItem, PerformanceSummaryData, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, Plan, PageProfile, TeamMember, AppUser, PostType, ContentPlanItem, StrategyHistoryItem, DashboardView } from '../types';

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
    
    // For DashboardPage
    onPublish: (targetId: string, postType: PostType, options: any) => Promise<void>;
    onSaveDraft: (targetId: string, draftData: any) => Promise<void>;
    onDeleteScheduledPost: (postId: string) => Promise<void>;
    onUpdateScheduledPost: (targetId: string, postType: PostType, options: any) => Promise<void>;
    onSyncCalendar: () => void;
    isSyncingCalendar: boolean;
    onApprovePost: (postId: string) => void;
    onRejectPost: (postId: string) => void;
    
    // For other views
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
    aiClient: GoogleGenAI | null;
    stabilityApiKey: string | null;
    linkedInstagramTarget: Target | null;

    // TODO: These props should be reviewed and implemented
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

const DashboardViewRenderer: React.FC<DashboardViewRendererProps> = (props) => {
    
    const handlePublish = async (targetId: string, postType: PostType, options: any) => {
        await props.onPublish(targetId, postType, options);
    };

    const handleUpdate = async (targetId: string, postType: PostType, options: any) => {
        await props.onUpdateScheduledPost(targetId, postType, options);
    };

    const handleSaveDraft = async (targetId: string, draftData: any) => {
        await props.onSaveDraft(targetId, draftData);
    };


    const renderView = () => {
        switch (props.activeView) {
            case 'dashboard':
                return (
                    <DashboardPage
                        managedTarget={props.managedTarget}
                        currentUserRole={props.currentUserRole}
                        publishedPosts={props.publishedPosts}
                        publishedPostsLoading={props.publishedPostsLoading}
                        scheduledPosts={props.scheduledPosts}
                        drafts={props.drafts}
                        performanceSummaryData={props.performanceSummaryData}
                        onSyncHistory={props.onSync}
                        performanceSummaryText={props.performanceSummaryText}
                        isGeneratingSummary={props.isGeneratingSummary}
                        onGeneratePerformanceSummary={props.onGeneratePerformanceSummary}
                        onFetchPostInsights={props.onFetchPostInsights}
                        isInsightsAllowed={!!props.userPlan?.limits.deepAnalytics}
                        onLoadDrafts={props.onLoadDrafts}
                        onDeleteDraft={props.onDeleteDraft}
                        onPublish={handlePublish}
                        onSaveDraft={handleSaveDraft}
                        onDeletePost={props.onDeleteScheduledPost}
                        onUpdatePost={handleUpdate}
                        onSyncCalendar={props.onSyncCalendar}
                        isSyncingCalendar={props.isSyncingCalendar}
                        onApprovePost={props.onApprovePost}
                        onRejectPost={props.onRejectPost}
                        pageProfile={props.pageProfile}
                        userPlan={props.userPlan}
                        aiClient={props.aiClient}
                        stabilityApiKey={props.stabilityApiKey}
                        linkedInstagramTarget={props.linkedInstagramTarget}
                    />
                );
            // Other cases are omitted for brevity, but would be here
            default:
                return <div>Please select a view</div>;
        }
    };

    return (
        <div className="min-h-full">
            {renderView()}
        </div>
    );
};

export default DashboardViewRenderer;
