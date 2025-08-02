import React from 'react';
import { Target, Role, Plan, InboxItem, PublishedPost, ScheduledPost, Draft, BulkPostItem, ContentPlanItem, StrategyHistoryItem, PerformanceSummaryData, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, PageProfile } from '../types';
import PostComposer from './PostComposer';
import PostPreview from './PostPreview';
import AnalyticsPage from './AnalyticsPage';
import DraftsList from './DraftsList';
import ContentCalendar from './ContentCalendar';
import BulkSchedulerPage from './BulkSchedulerPage';
import ContentPlannerPage from './ContentPlannerPage';
import InboxPage from './InboxPage';
import PageProfilePage from './PageProfilePage';
import AdsManagerPage from './AdsManagerPage';

type DashboardView = 'composer' | 'calendar' | 'drafts' | 'analytics' | 'bulk' | 'planner' | 'inbox' | 'profile' | 'ads';

interface DashboardViewRendererProps {
    view: DashboardView;
    // Composer props
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
    // Calendar props
    scheduledPosts: ScheduledPost[];
    // Drafts props
    drafts: Draft[];
    // Analytics props
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
    // Bulk props
    bulkPosts: BulkPostItem[];
    schedulingStrategy: 'even' | 'weekly';
    weeklyScheduleSettings: { days: number[]; time: string };
    // Planner props
    contentPlan: ContentPlanItem[] | null;
    isGeneratingPlan: boolean;
    isSchedulingStrategy: boolean;
    planError: string | null;
    strategyHistory: StrategyHistoryItem[];
    // Inbox props
    inboxItems: InboxItem[];
    isInboxLoading: boolean;
    // Profile props
    pageProfile: PageProfile;
    isFetchingProfile: boolean;
    // Ads props
    adCampaigns: any[];
    isUpdatingCampaign: boolean;
    // Common props
    managedTarget: Target;
    linkedInstagramTarget: Target | null;
    currentUserRole: Role;
    userPlan: Plan | null;
    aiClient: any;
    stabilityApiKey: string | null;
    user: any; // Firebase user
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
    onViewChange: (view: any) => void;
}

const DashboardViewRenderer: React.FC<DashboardViewRendererProps> = (props) => {
    const renderView = () => {
        switch (props.view) {
            case 'composer': 
                return (
                    <div className="p-6">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
                            <PostComposer 
                                onPublish={props.handlePublish} 
                                onSaveDraft={props.handleSaveDraft} 
                                isPublishing={props.isPublishing}
                                postText={props.postText} 
                                onPostTextChange={props.onPostTextChange}
                                onImageChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    const file = e.target.files ? e.target.files[0] : null;
                                    props.onImageChange(file);
                                }}
                                onImageGenerated={props.onImageGenerated} 
                                onImageRemove={props.onImageRemove}
                                imagePreview={props.imagePreview} 
                                selectedImage={props.selectedImage} 
                                isScheduled={props.isScheduled}
                                onIsScheduledChange={props.onIsScheduledChange} 
                                scheduleDate={props.scheduleDate}
                                onScheduleDateChange={props.onScheduleDateChange} 
                                error={props.composerError} 
                                aiClient={props.aiClient}
                                stabilityApiKey={props.stabilityApiKey} 
                                managedTarget={props.managedTarget}
                                linkedInstagramTarget={props.linkedInstagramTarget} 
                                includeInstagram={props.includeInstagram}
                                onIncludeInstagramChange={props.onIncludeInstagramChange} 
                                pageProfile={props.pageProfile}
                                editingScheduledPostId={props.editingScheduledPostId} 
                                role={props.currentUserRole} 
                                userPlan={props.userPlan} 
                            />
                            <div className="xl:sticky xl:top-6 xl:h-fit">
                                <PostPreview 
                                    postText={props.postText} 
                                    imagePreview={props.imagePreview} 
                                    type={props.includeInstagram && props.linkedInstagramTarget ? 'instagram' : 'facebook'}
                                    pageName={props.managedTarget.name} 
                                    pageAvatar={props.managedTarget.picture.data.url} 
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'calendar': 
                return (
                    <div className="p-6">
                        <ContentCalendar 
                            posts={props.scheduledPosts} 
                            onEdit={(postId) => {
                                const post = props.scheduledPosts.find(p => p.id === postId);
                                if (post) props.handleEditScheduledPost(post);
                            }} 
                            onDelete={props.handleDeleteScheduledPost}
                            managedTarget={props.managedTarget} 
                            userPlan={props.userPlan} 
                            role={props.currentUserRole}
                            onApprove={props.handleApprovePost} 
                            onReject={props.handleRejectPost}
                            onSync={() => props.syncFacebookData(props.managedTarget)} 
                            isSyncing={false} 
                            onCreatePost={() => props.onViewChange('composer')}
                        />
                    </div>
                );

            case 'drafts': 
                return (
                    <div className="p-6">
                        <DraftsList 
                            drafts={props.drafts} 
                            onLoad={(draftId) => {
                                const draft = props.drafts.find(d => d.id === draftId);
                                if (draft) props.handleLoadDraft(draft);
                            }} 
                            onDelete={props.handleDeleteDraft} 
                            role={props.currentUserRole} 
                        />
                    </div>
                );

            case 'bulk': 
                return (
                    <div className="p-6">
                        <BulkSchedulerPage 
                            bulkPosts={props.bulkPosts} 
                            onSchedulingStrategyChange={props.onSchedulingStrategyChange}
                            onWeeklyScheduleSettingsChange={props.onWeeklyScheduleSettingsChange} 
                            onReschedule={() => {}} 
                            onAddPosts={() => {}} 
                            onUpdatePost={() => {}} 
                            onRemovePost={() => {}} 
                            onGeneratePostFromText={props.onGeneratePostFromText} 
                            onGenerateImageFromText={props.onGenerateImageFromText}
                            onGeneratePostFromImage={async (id: string, imageFile: File) => {
                          await props.onGeneratePostFromImage(imageFile);
                      }} 
                            onAddImageManually={props.onAddImageManually as (postId: string, file: File) => void}
                            onScheduleAll={props.onScheduleAll} 
                            targets={[props.managedTarget]} 
                            aiClient={props.aiClient}
                            stabilityApiKey={props.stabilityApiKey} 
                            isSchedulingAll={props.isPublishing}
                            schedulingStrategy={props.schedulingStrategy} 
                            weeklyScheduleSettings={props.weeklyScheduleSettings}
                            role={props.currentUserRole} 
                            showNotification={props.showNotification} 
                            pageProfile={props.pageProfile}
                        />
                    </div>
                );

            case 'planner': 
                return (
                    <div className="p-6">
                        <ContentPlannerPage 
                            plan={props.contentPlan} 
                            isGenerating={props.isGeneratingPlan} 
                            strategyHistory={props.strategyHistory}
                            isSchedulingStrategy={props.isSchedulingStrategy} 
                            error={props.planError} 
                            role={props.currentUserRole}
                            onScheduleStrategy={() => props.onScheduleStrategy(props.contentPlan || [])} 
                            aiClient={props.aiClient} 
                            onGeneratePlan={props.onGeneratePlan} 
                            onStartPost={props.onStartPost}
                            pageProfile={props.pageProfile} 
                            onLoadFromHistory={(plan: ContentPlanItem[]) => {
                          // Create a mock StrategyHistoryItem from the plan
                          const mockHistoryItem: any = {
                              contentPlan: plan,
                              id: Date.now().toString(),
                              strategyRequest: { prompt: 'Loaded from history' },
                              timestamp: new Date().toISOString(),
                              pageId: props.managedTarget.id
                          };
                          props.onLoadFromHistory(mockHistoryItem);
                      }}
                            onDeleteFromHistory={props.onDeleteFromHistory}
                        />
                    </div>
                );

            case 'inbox':
                return (
                    <div className="p-6">
                        <InboxPage
                            items={props.inboxItems}
                            isLoading={props.isInboxLoading}
                            aiClient={props.aiClient}
                            role={props.currentUserRole}
                            currentUserRole={props.currentUserRole}
                            selectedTarget={props.managedTarget}
                            userPlan={props.userPlan}
                            onReply={async (item: InboxItem, message: string): Promise<boolean> => {
                                if (!props.managedTarget.access_token) {
                                    props.showNotification('error', 'رمز الوصول للصفحة مفقود للرد.');
                                    return false;
                                }
                                try {
                                    const endpointId = item.type === 'comment' ? item.id : item.conversationId;
                                    const endpointPath = item.type === 'comment' ? 'comments' : 'messages';
                        
                                    const response = await fetch(`https://graph.facebook.com/v19.0/${endpointId}/${endpointPath}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            message: message,
                                            access_token: props.managedTarget.access_token,
                                        }),
                                    });
                        
                                    const responseData = await response.json();
                                    if (!response.ok || responseData.error) {
                                        throw new Error(responseData.error?.message || 'فشل إرسال الرد.');
                                    }
                        
                                    const updatedInboxItems = props.inboxItems.map(i => 
                                        i.id === item.id ? { ...i, status: 'replied' as 'replied', isReplied: true } : i
                                    );
                                    await props.saveDataToFirestore({ inboxItems: updatedInboxItems });
                                    props.showNotification('success', `تم الرد على ${item.authorName}.`);
                                    return true;
                                } catch (error: any) {
                                    props.showNotification('error', `فشل الرد: ${error.message}`);
                                    return false;
                                }
                            }}
                        
                            onMarkAsDone={async (itemId: string) => {
                                const updatedInboxItems = props.inboxItems.map(item => 
                                    item.id === itemId ? { ...item, status: 'done' as 'done' } : item
                                );
                                await props.saveDataToFirestore({ inboxItems: updatedInboxItems });
                                props.showNotification('success', 'تم تحديث الحالة.');
                            }}
                        
                            onLike={async (itemId: string) => {
                                if (!props.managedTarget.access_token) {
                                    props.showNotification('error', 'رمز الوصول للصفحة مفقود.');
                                    return;
                                }
                                try {
                                    const response = await fetch(`https://graph.facebook.com/v19.0/${itemId}/likes`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            access_token: props.managedTarget.access_token,
                                        }),
                                    });
                                
                                    if (!response.ok) {
                                        throw new Error('فشل إرسال الإعجاب.');
                                    }
                                
                                    props.showNotification('success', 'تم إرسال الإعجاب.');
                                } catch (error: any) {
                                    props.showNotification('error', `فشل الإعجاب: ${error.message}`);
                                }
                            }}
                        
                            onFetchMessageHistory={props.onFetchMessageHistory}
                            autoResponderSettings={{ rules: [], fallback: { mode: 'off', staticMessage: '' } }}
                            onAutoResponderSettingsChange={() => { 
                                props.showNotification('partial', 'تغيير إعدادات الرد التلقائي (محاكاة).'); 
                            }}
                            onSync={() => props.syncFacebookData(props.managedTarget)}
                            isSyncing={false}
                        />
                    </div>
                );

            case 'analytics': 
                return (
                    <div className="p-6">
                        <AnalyticsPage 
                            publishedPosts={props.publishedPosts} 
                            publishedPostsLoading={props.publishedPostsLoading}
                            analyticsPeriod={props.analyticsPeriod} 
                            setAnalyticsPeriod={(period) => {
                          if (typeof period === 'function') {
                              // Handle the case where period is a SetStateAction function
                              props.setAnalyticsPeriod(period(props.analyticsPeriod));
                          } else {
                              props.setAnalyticsPeriod(period);
                          }
                      }}
                            performanceSummaryData={props.performanceSummaryData} 
                            performanceSummaryText={props.performanceSummaryText}
                            isGeneratingSummary={props.isGeneratingSummary} 
                            audienceGrowthData={props.audienceGrowthData}
                            heatmapData={props.heatmapData} 
                            contentTypeData={props.contentTypeData}
                            isGeneratingDeepAnalytics={props.isGeneratingDeepAnalytics} 
                            managedTarget={props.managedTarget}
                            userPlan={props.userPlan} 
                            currentUserRole={props.currentUserRole}
                            audienceCityData={props.audienceCityData}
                            audienceCountryData={props.audienceCountryData}
                            onGeneratePerformanceSummary={props.onGeneratePerformanceSummary}
                            onGenerateDeepAnalytics={props.onGenerateDeepAnalytics} 
                            onFetchPostInsights={props.onFetchPostInsights} 
                        />
                    </div>
                );

            case 'profile': 
                return (
                    <div className="p-6">
                        <PageProfilePage 
                            profile={props.pageProfile} 
                            onProfileChange={props.handlePageProfileChange}
                            isFetchingProfile={props.isFetchingProfile} 
                            onFetchProfile={props.handleFetchProfile}
                            role={props.currentUserRole} 
                            user={props.user} 
                        />
                    </div>
                );

            case 'ads': 
                return (
                    <div className="p-6">
                        <AdsManagerPage 
                            campaigns={props.adCampaigns} 
                            isLoading={props.isUpdatingCampaign}
                            onUpdateCampaignStatus={props.handleUpdateCampaignStatus}
                            fetchCampaignSubEntities={props.fetchCampaignSubEntities}
                            onSyncCampaigns={props.onSyncCampaigns} // Add sync campaigns handler
                            selectedTarget={props.managedTarget}
                            role={props.currentUserRole}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-full">
            {renderView()}
        </div>
    );
};

export default DashboardViewRenderer;