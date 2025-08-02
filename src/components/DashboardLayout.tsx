import React from 'react';
import Header from './Header';
import DashboardSidebar from './DashboardSidebar';
import DashboardViewRenderer from './DashboardViewRenderer';
import DashboardNotification from './DashboardNotification';
import MobileMenu from './MobileMenu';
import { Target, Role, Plan, InboxItem, PublishedPost, ScheduledPost, Draft, PageProfile, AppUser, DashboardView, DashboardViewRendererProps, ContentPlanItem, StrategyHistoryItem, PerformanceSummaryData, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData } from '../types';

interface DashboardLayoutProps {
    pageName: string;
    onChangePage: () => void;
    onLogout: () => void;
    onSettingsClick: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    currentView: DashboardView;
    onViewChange: (view: DashboardView) => void;
    managedTarget: Target;
    currentUserRole: Role;
    inboxItems: InboxItem[];
    isSyncing: boolean;
    onSync: (target: Target) => void;
    user: AppUser;
    userPlan: Plan | null;
    pageProfile: PageProfile;
    notification: { type: 'success' | 'error' | 'partial', message: string } | null;
    showNotification: (type: 'success' | 'error' | 'partial', message: string) => void;
    publishedPosts: PublishedPost[];
    publishedPostsLoading: boolean;
    scheduledPosts: ScheduledPost[];
    drafts: Draft[];
    performanceSummaryData: PerformanceSummaryData | null;
    performanceSummaryText: string;
    isGeneratingSummary: boolean;
    onGeneratePerformanceSummary: () => void;
    onFetchPostInsights: (postId: string) => Promise<any>;
    onLoadDrafts: () => void;
    onDeleteDraft: (draftId: string) => Promise<void>;
    onPublish: DashboardViewRendererProps['onPublish'];
    onSaveDraft: DashboardViewRendererProps['onSaveDraft'];
    onDeleteScheduledPost: (postId: string) => Promise<void>;
    onUpdateScheduledPost: DashboardViewRendererProps['onUpdateScheduledPost'];
    onSyncCalendar: () => void;
    isSyncingCalendar: boolean;
    onApprovePost: (postId: string) => void;
    onRejectPost: (postId: string) => void;
    adCampaigns: any[];
    isUpdatingCampaign: boolean;
    handleUpdateCampaignStatus: (campaignId: string, newStatus: "ACTIVE" | "PAUSED") => Promise<boolean>;
    fetchCampaignSubEntities: (campaignId: string) => Promise<{ adSets: any[], ads: any[] }>;
    onSyncAdCampaigns: (target: Target) => Promise<void>;
    audienceGrowthData: AudienceGrowthData[];
    heatmapData: HeatmapDataPoint[];
    contentTypeData: ContentTypePerformanceData[];
    isGeneratingDeepAnalytics: boolean;
    audienceCityData: { [key: string]: number };
    audienceCountryData: { [key: string]: number };
    onGenerateDeepAnalytics: () => void;
    onFetchPageProfile: () => Promise<void>;
    isFetchingProfile: boolean;
    onProfileChange: (newProfile: PageProfile) => void;
    allUsers: AppUser[];
    plans: Plan[];
    aiClient: any;
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

const DashboardLayout: React.FC<DashboardLayoutProps> = (props) => {
    return (
        <>
            <Header 
                pageName={props.pageName} 
                onChangePage={props.onChangePage} 
                onLogout={props.onLogout} 
                onSettingsClick={props.onSettingsClick} 
                theme={props.theme} 
                onToggleTheme={props.onToggleTheme}
                user={props.user}
            />
            
            <DashboardNotification notification={props.notification} />
            
            <MobileMenu
                currentView={props.currentView}
                onViewChange={props.onViewChange}
                managedTarget={props.managedTarget}
                currentUserRole={props.currentUserRole}
                inboxItems={props.inboxItems}
                isSyncing={props.isSyncing}
                onSync={() => props.onSync(props.managedTarget)}
            />
            
            <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
                <div className="hidden md:block">
                    <DashboardSidebar
                        currentView={props.currentView}
                        onViewChange={props.onViewChange}
                        managedTarget={props.managedTarget}
                        currentUserRole={props.currentUserRole}
                        inboxItems={props.inboxItems}
                        isSyncing={props.isSyncing}
                        onSync={() => props.onSync(props.managedTarget)}
                    />
                </div>
                
                <main className="flex-grow min-w-0 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                            <DashboardViewRenderer
                                activeView={props.currentView}
                                managedTarget={props.managedTarget}
                                currentUserRole={props.currentUserRole}
                                publishedPosts={props.publishedPosts}
                                publishedPostsLoading={props.publishedPostsLoading}
                                scheduledPosts={props.scheduledPosts}
                                drafts={props.drafts}
                                performanceSummaryData={props.performanceSummaryData}
                                onSync={props.onSync}
                                performanceSummaryText={props.performanceSummaryText}
                                isGeneratingSummary={props.isGeneratingSummary}
                                onGeneratePerformanceSummary={props.onGeneratePerformanceSummary}
                                onFetchPostInsights={props.onFetchPostInsights}
                                userPlan={props.userPlan}
                                onLoadDrafts={props.onLoadDrafts}
                                onDeleteDraft={props.onDeleteDraft}
                                onPublish={props.onPublish}
                                onSaveDraft={props.onSaveDraft}
                                onDeleteScheduledPost={props.onDeleteScheduledPost}
                                onUpdateScheduledPost={props.onUpdateScheduledPost}
                                onSyncCalendar={props.onSyncCalendar}
                                isSyncingCalendar={props.isSyncingCalendar}
                                onApprovePost={props.onApprovePost}
                                onRejectPost={props.onRejectPost}
                                pageProfile={props.pageProfile}
                                aiClient={props.aiClient}
                                stabilityApiKey={props.stabilityApiKey}
                                linkedInstagramTarget={props.linkedInstagramTarget}
                                inboxItems={props.inboxItems}
                                adCampaigns={props.adCampaigns}
                                onFetchMessageHistory={() => Promise.resolve()}
                                onSendMessage={() => Promise.resolve()}
                                onMarkAsDone={() => Promise.resolve()}
                                onSyncAdCampaigns={props.onSyncAdCampaigns}
                                handleUpdateCampaignStatus={props.handleUpdateCampaignStatus}
                                fetchCampaignSubEntities={props.fetchCampaignSubEntities}
                                isUpdatingCampaign={props.isUpdatingCampaign}
                                audienceGrowthData={props.audienceGrowthData}
                                heatmapData={props.heatmapData}
                                contentTypeData={props.contentTypeData}
                                isGeneratingDeepAnalytics={props.isGeneratingDeepAnalytics}
                                audienceCityData={props.audienceCityData}
                                audienceCountryData={props.audienceCountryData}
                                onGenerateDeepAnalytics={props.onGenerateDeepAnalytics}
                                isFetchingProfile={props.isFetchingProfile}
                                onFetchPageProfile={props.onFetchPageProfile}
                                onProfileChange={props.onProfileChange}
                                user={props.user}
                                allUsers={props.allUsers}
                                plans={props.plans}
                                contentPlan={props.contentPlan}
                                isGeneratingPlan={props.isGeneratingPlan}

                                planError={props.planError}
                                isSchedulingStrategy={props.isSchedulingStrategy}
                                strategyHistory={props.strategyHistory}
                                onGeneratePlan={props.onGeneratePlan}
                                onScheduleStrategy={props.onScheduleStrategy}
                                onStartPost={props.onStartPost}
                                onLoadFromHistory={props.onLoadFromHistory}
                                onDeleteFromHistory={props.onDeleteFromHistory}
                            />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default DashboardLayout;
