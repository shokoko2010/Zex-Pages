import React from 'react';
import Header from './Header';
import DashboardSidebar from './DashboardSidebar';
import DashboardViewRenderer from './DashboardViewRenderer';
import DashboardNotification from './DashboardNotification';
import MobileMenu from './MobileMenu';
import { Target, Role, Plan, InboxItem, PublishedPost, ScheduledPost, Draft, BulkPostItem, ContentPlanItem, StrategyHistoryItem, PerformanceSummaryData, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, PageProfile } from '../types';

type DashboardView = 'composer' | 'calendar' | 'drafts' | 'analytics' | 'bulk' | 'planner' | 'inbox' | 'profile' | 'ads';

interface DashboardLayoutProps {
    // Header props
    pageName: string;
    onChangePage: () => void;
    onLogout: () => void;
    onSettingsClick: () => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    
    // Sidebar props
    currentView: DashboardView;
    onViewChange: (view: DashboardView) => void;
    managedTarget: Target;
    currentUserRole: Role;
    inboxItems: InboxItem[];
    isSyncing: boolean;
    onSync: () => void;
    
    // View renderer props
    view: DashboardView;
    postText: string;
    onPostTextChange: (text: string) => void;
    imagePreview: string | null;
    selectedImage: File | null;
    isScheduled: boolean;
    scheduleDate: string;
    composerError: string;
    isPublishing: boolean;
    editingScheduledPostId: string | null;
    includeInstagram: boolean;
    scheduledPosts: ScheduledPost[];
    drafts: Draft[];
    publishedPosts: PublishedPost[];
    publishedPostsLoading: boolean;
    analyticsPeriod: '7d' | '30d';
  setAnalyticsPeriod: (period: '7d' | '30d') => void;
    performanceSummaryData: PerformanceSummaryData | null;
    performanceSummaryText: string;
    isGeneratingSummary: boolean;
    audienceGrowthData: AudienceGrowthData[];
    heatmapData: HeatmapDataPoint[];
    contentTypeData: ContentTypePerformanceData[];
    isGeneratingDeepAnalytics: boolean;
    audienceCityData: { [key: string]: number };
    audienceCountryData: { [key: string]: number };
    bulkPosts: BulkPostItem[];
    schedulingStrategy: 'even' | 'weekly';
    weeklyScheduleSettings: { days: number[]; time: string };
    contentPlan: ContentPlanItem[] | null;
    isGeneratingPlan: boolean;
    isSchedulingStrategy: boolean;
    planError: string | null;
    strategyHistory: StrategyHistoryItem[];
    inboxItemsForView: InboxItem[];
    isInboxLoading: boolean;
    pageProfile: PageProfile;
    isFetchingProfile: boolean;
    adCampaigns: any[];
    isUpdatingCampaign: boolean;
    linkedInstagramTarget: Target | null;
    userPlan: Plan | null;
    aiClient: any;
    stabilityApiKey: string | null;
    user: any;
    
    // Handlers
    handlePublish: () => Promise<void>;
    handleSaveDraft: () => Promise<void>;
    handleEditScheduledPost: (post: ScheduledPost) => void;
    handleDeleteScheduledPost: (postId: string) => Promise<void>;
    handleApprovePost: (postId: string) => Promise<void>;
    handleRejectPost: (postId: string) => Promise<void>;
    handleLoadDraft: (draft: Draft) => void;
    handleDeleteDraft: (draftId: string) => Promise<void>;
    handlePageProfileChange: (profile: PageProfile) => Promise<void>;
    handleFetchProfile: () => Promise<void>;
    handleUpdateCampaignStatus: (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => Promise<boolean>;
    fetchCampaignSubEntities: (campaignId: string) => Promise<{ adSets: any[]; ads: any[] }>;
    onSyncCampaigns: () => Promise<void>; // Add sync campaigns handler
    onSchedulingStrategyChange: (strategy: 'even' | 'weekly') => void;
    onWeeklyScheduleSettingsChange: (settings: { days: number[]; time: string }) => void;
    onReschedule: (postId: string, newDate: string) => void;
    onAddPosts: (posts: BulkPostItem[]) => void;
    onUpdatePost: (post: BulkPostItem) => void;
    onRemovePost: (postId: string) => void;
    onGeneratePostFromText: (text: string) => Promise<void>;
    onGenerateImageFromText: (text: string) => Promise<void>;
    onGeneratePostFromImage: (image: File) => Promise<void>;
    onAddImageManually: (postId: string, file: File) => void;
    onScheduleAll: () => Promise<void>;
    onScheduleStrategy: (plan: ContentPlanItem[]) => Promise<void>;
    onGeneratePlan: (request: any) => Promise<void>;
    onStartPost: (item: ContentPlanItem) => void;
    onLoadFromHistory: (item: StrategyHistoryItem) => void;
    onDeleteFromHistory: (strategyId: string) => Promise<void>;
    onGeneratePerformanceSummary: () => Promise<void>;
    onGenerateDeepAnalytics: () => Promise<void>;
    onFetchPostInsights: (postId: string) => Promise<void>;
    onIncludeInstagramChange: (include: boolean) => void;
    onImageChange: (file: File | null) => void;
    onImageGenerated: (file: File) => void;
    onImageRemove: () => void;
    onIsScheduledChange: (scheduled: boolean) => void;
    onScheduleDateChange: (date: string) => void;
    showNotification: (type: 'success' | 'error' | 'partial', message: string) => void;
    syncFacebookData: (target: Target, lastSyncTime?: string) => Promise<void>;
    onFetchMessageHistory: (conversationId: string) => Promise<void>;
    saveDataToFirestore: (data: { [key: string]: any }) => Promise<void>;
    
    // Notification
    notification: { type: 'success' | 'error' | 'partial', message: string } | null;
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
            
            {/* Mobile Menu */}
            <MobileMenu
                currentView={props.currentView}
                onViewChange={props.onViewChange}
                managedTarget={props.managedTarget}
                currentUserRole={props.currentUserRole}
                inboxItems={props.inboxItems}
                isSyncing={props.isSyncing}
                onSync={props.onSync}
            />
            
            <div className="flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
                {/* Desktop Sidebar */}
                <div className="hidden md:block">
                    <DashboardSidebar
                        currentView={props.currentView}
                        onViewChange={props.onViewChange}
                        managedTarget={props.managedTarget}
                        currentUserRole={props.currentUserRole}
                        inboxItems={props.inboxItems}
                        isSyncing={props.isSyncing}
                        onSync={props.onSync}
                    />
                </div>
                
                <main className="flex-grow min-w-0 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                            <DashboardViewRenderer
                            view={props.view}
                            postText={props.postText}
                            onPostTextChange={props.onPostTextChange}
                            imagePreview={props.imagePreview}
                            selectedImage={props.selectedImage}
                            isScheduled={props.isScheduled}
                            scheduleDate={props.scheduleDate}
                            composerError={props.composerError}
                            isPublishing={props.isPublishing}
                            editingScheduledPostId={props.editingScheduledPostId}
                            includeInstagram={props.includeInstagram}
                            scheduledPosts={props.scheduledPosts}
                            drafts={props.drafts}
                            publishedPosts={props.publishedPosts}
                            publishedPostsLoading={props.publishedPostsLoading}
                            analyticsPeriod={props.analyticsPeriod}
                            setAnalyticsPeriod={props.setAnalyticsPeriod}
                            performanceSummaryData={props.performanceSummaryData}
                            performanceSummaryText={props.performanceSummaryText}
                            isGeneratingSummary={props.isGeneratingSummary}
                            audienceGrowthData={props.audienceGrowthData}
                            heatmapData={props.heatmapData}
                            contentTypeData={props.contentTypeData}
                            isGeneratingDeepAnalytics={props.isGeneratingDeepAnalytics}
                            audienceCityData={props.audienceCityData}
                            audienceCountryData={props.audienceCountryData}
                            bulkPosts={props.bulkPosts}
                            schedulingStrategy={props.schedulingStrategy}
                            weeklyScheduleSettings={props.weeklyScheduleSettings}
                            contentPlan={props.contentPlan}
                            isGeneratingPlan={props.isGeneratingPlan}
                            isSchedulingStrategy={props.isSchedulingStrategy}
                            planError={props.planError}
                            strategyHistory={props.strategyHistory}
                            inboxItems={props.inboxItemsForView}
                            isInboxLoading={props.isInboxLoading}
                            pageProfile={props.pageProfile}
                            isFetchingProfile={props.isFetchingProfile}
                            adCampaigns={props.adCampaigns}
                            isUpdatingCampaign={props.isUpdatingCampaign}
                            managedTarget={props.managedTarget}
                            linkedInstagramTarget={props.linkedInstagramTarget}
                            currentUserRole={props.currentUserRole}
                            userPlan={props.userPlan}
                            aiClient={props.aiClient}
                            stabilityApiKey={props.stabilityApiKey}
                            user={props.user}
                            handlePublish={props.handlePublish}
                            handleSaveDraft={props.handleSaveDraft}
                            handleEditScheduledPost={props.handleEditScheduledPost}
                            handleDeleteScheduledPost={props.handleDeleteScheduledPost}
                            handleApprovePost={props.handleApprovePost}
                            handleRejectPost={props.handleRejectPost}
                            handleLoadDraft={props.handleLoadDraft}
                            handleDeleteDraft={props.handleDeleteDraft}
                            handlePageProfileChange={props.handlePageProfileChange}
                            handleFetchProfile={props.handleFetchProfile}
                            handleUpdateCampaignStatus={props.handleUpdateCampaignStatus}
                            fetchCampaignSubEntities={props.fetchCampaignSubEntities}
                            onSyncCampaigns={props.onSyncCampaigns} // Add sync campaigns handler
                            onSchedulingStrategyChange={props.onSchedulingStrategyChange}
                            onWeeklyScheduleSettingsChange={props.onWeeklyScheduleSettingsChange}
                            onReschedule={props.onReschedule}
                            onAddPosts={props.onAddPosts}
                            onUpdatePost={props.onUpdatePost}
                            onRemovePost={props.onRemovePost}
                            onGeneratePostFromText={props.onGeneratePostFromText}
                            onGenerateImageFromText={props.onGenerateImageFromText}
                            onGeneratePostFromImage={props.onGeneratePostFromImage}
                            onAddImageManually={props.onAddImageManually}
                            onScheduleAll={props.onScheduleAll}
                            onScheduleStrategy={props.onScheduleStrategy}
                            onGeneratePlan={props.onGeneratePlan}
                            onStartPost={props.onStartPost}
                            onLoadFromHistory={props.onLoadFromHistory}
                            onDeleteFromHistory={props.onDeleteFromHistory}
                            onGeneratePerformanceSummary={props.onGeneratePerformanceSummary}
                            onGenerateDeepAnalytics={props.onGenerateDeepAnalytics}
                            onFetchPostInsights={props.onFetchPostInsights}
                            onIncludeInstagramChange={props.onIncludeInstagramChange}
                            onImageChange={props.onImageChange}
                            onImageGenerated={props.onImageGenerated}
                            onImageRemove={props.onImageRemove}
                            onIsScheduledChange={props.onIsScheduledChange}
                            onScheduleDateChange={props.onScheduleDateChange}
                            showNotification={props.showNotification}
                            syncFacebookData={props.syncFacebookData}
                            onFetchMessageHistory={props.onFetchMessageHistory}
                            saveDataToFirestore={props.saveDataToFirestore}
                            onViewChange={props.onViewChange}
                        />
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default DashboardLayout;