
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Target, PublishedPost, Draft, ScheduledPost, BulkPostItem, ContentPlanItem, StrategyRequest, WeeklyScheduleSettings, PageProfile, PerformanceSummaryData, StrategyHistoryItem, InboxItem, AutoResponderSettings, PostAnalytics, Plan, Role, AppUser, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, PostType } from '../types';
import Header from './Header';
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
import Button from './ui/Button';
import { db } from '../services/firebaseService';
import type { User } from '../services/firebaseService';
import { generateContentPlan, generatePerformanceSummary, generatePostInsights, generateBestPostingTimesHeatmap, generateContentTypePerformance } from '../services/geminiService';


// Icons
import PencilSquareIcon from './icons/PencilSquareIcon';
import CalendarIcon from './icons/CalendarIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import QueueListIcon from './icons/QueueListIcon';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import InboxArrowDownIcon from './icons/InboxArrowDownIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import BriefcaseIcon from './icons/BriefcaseIcon'; 

type DashboardView = 'composer' | 'calendar' | 'drafts' | 'analytics' | 'bulk' | 'planner' | 'inbox' | 'profile' | 'ads';

interface DashboardPageProps {
  user: User;
  isAdmin: boolean;
  userPlan: Plan | null;
  plans: Plan[];
  allUsers: AppUser[];
  managedTarget: Target;
  allTargets: Target[];
  onChangePage: () => void;
  onLogout: () => void;
  isSimulationMode: boolean;
  aiClient: any;
  stabilityApiKey: string | null;
  onSettingsClick: () => void;
  fetchWithPagination: (path: string, accessToken?: string) => Promise<any[]>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  fbAccessToken: string | null;
  strategyHistory: StrategyHistoryItem[];
  onSavePlan: (pageId: string, plan: ContentPlanItem[], request: StrategyRequest) => Promise<void>;
  onDeleteStrategy: (pageId: string, strategyId: string) => Promise<void>;
}

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    notificationCount?: number;
    isPolling?: boolean;
    disabled?: boolean;
    disabledTooltip?: string;
}> = ({ icon, label, active, onClick, notificationCount, isPolling, disabled = false, disabledTooltip }) => (
    <div className="relative group">
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors text-right ${
                active
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={disabled}
        >
            {icon}
            <span className="flex-grow">{label}</span>
            {isPolling && <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin mr-1" />}
            {notificationCount && notificationCount > 0 ? (
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{(notificationCount)}</span>
            ) : null}
        </button>
        {disabled && disabledTooltip && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                {disabledTooltip}
            </div>
        )}
    </div>
);

const initialAutoResponderSettings: AutoResponderSettings = {
  rules: [],
  fallback: {
    mode: 'off',
    staticMessage: 'شكرًا على رسالتك! سيقوم أحد ممثلينا بالرد عليك في أقرب وقت ممكن.',
  },
};

const initialPageProfile: PageProfile = {
    description: '', services: '', contactInfo: '', website: '',
    links: [], currentOffers: '', address: '', country: '',
    language: 'ar', contentGenerationLanguages: ['ar'],
    ownerUid: '', team: [], members: [],
};


const DashboardPage: React.FC<DashboardPageProps> = ({
  user, isAdmin, userPlan, plans, allUsers, managedTarget, allTargets, onChangePage, onLogout,
  isSimulationMode, aiClient, stabilityApiKey, onSettingsClick, fetchWithPagination,
  theme, onToggleTheme, fbAccessToken, strategyHistory, onSavePlan, onDeleteStrategy
}) => {
    const [view, setView] = useState<DashboardView>('composer');
    const [postText, setPostText] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [composerError, setComposerError] = useState('');
    const [includeInstagram, setIncludeInstagram] = useState(false);
    const [editingScheduledPostId, setEditingScheduledPostId] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [notification, setNotification] = useState<{type: 'success' | 'error' | 'partial', message: string, onUndo?: () => void} | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pageProfile, setPageProfile] = useState<PageProfile>(initialPageProfile);
    const [currentUserRole, setCurrentUserRole] = useState<Role>('viewer');
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [bulkPosts, setBulkPosts] = useState<BulkPostItem[]>([]);
    const [isSchedulingAll, setIsSchedulingAll] = useState(false);
    const [schedulingStrategy, setSchedulingStrategy] = useState<'even' | 'weekly'>('even');
    const [weeklyScheduleSettings, setWeeklyScheduleSettings] = useState<WeeklyScheduleSettings>({ days: [1, 3, 5], time: '19:00' });
    const [contentPlan, setContentPlan] = useState<ContentPlanItem[] | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);
    const [isSchedulingStrategy, setIsSchedulingStrategy] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);
    const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
    const [publishedPostsLoading, setPublishedPostsLoading] = useState(true);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d'>('30d');
    const [performanceSummaryData, setPerformanceSummaryData] = useState<PerformanceSummaryData | null>(null);
    const [performanceSummaryText, setPerformanceSummaryText] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [audienceGrowthData, setAudienceGrowthData] = useState<AudienceGrowthData[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
    const [contentTypeData, setContentTypePerformanceData] = useState<ContentTypePerformanceData[]>([]);
    const [isGeneratingDeepAnalytics, setIsGeneratingDeepAnalytics] = useState(false);
    const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
    const [isInboxLoading, setIsInboxLoading] = useState(true);
    const [autoResponderSettings, setAutoResponderSettings] = useState<AutoResponderSettings>(initialAutoResponderSettings);
    const [repliedUsersPerPost, setRepliedUsersPerPost] = useState<Record<string, string[]>>({});
    const [isPolling, setIsPolling] = useState(false);
    const [syncingTargetId, setSyncingTargetId] = useState<string | null>(null); 

    const linkedInstagramTarget = useMemo(() => allTargets.find(t => t.type === 'instagram' && t.parentPageId === managedTarget.id) || null, [managedTarget, allTargets]);
    const bulkSchedulerTargets = useMemo(() => [managedTarget, ...(linkedInstagramTarget ? [linkedInstagramTarget] : [])], [managedTarget, linkedInstagramTarget]);

    useEffect(() => {
      if (selectedImage) {
        const newUrl = URL.createObjectURL(selectedImage);
        setImagePreview(newUrl);
        return () => URL.revokeObjectURL(newUrl);
      }
      setImagePreview(null);
    }, [selectedImage]);

    const showNotification = useCallback((type: 'success' | 'error' | 'partial', message: string, onUndo?: () => void) => {
      setNotification({ type, message, onUndo });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setNotification(null), 5000);
    }, []);

    const getTargetDataRef = useCallback(() => db.collection('targets_data').doc(managedTarget.id), [managedTarget]);

    const saveDataToFirestore = useCallback(async (dataToSave: { [key: string]: any }) => {
      try { await getTargetDataRef().set(dataToSave, { merge: true }); }
      catch (error) { showNotification('error', 'فشل حفظ البيانات في السحابة.'); }
    }, [getTargetDataRef, showNotification]);

    const clearComposer = useCallback(() => {
      setPostText('');
      setSelectedImage(null);
      setImagePreview(null);
      setIsScheduled(false);
      setScheduleDate('');
      setComposerError('');
      setIncludeInstagram(false);
      setEditingScheduledPostId(null);
    }, []);

    const handlePageProfileChange = (newProfile: PageProfile) => {
      setPageProfile(newProfile);
      saveDataToFirestore({ pageProfile: newProfile });
    };

    const handleSaveDraft = async () => {
      if (!postText.trim() && !selectedImage) {
        showNotification('error', 'لا يمكن حفظ مسودة فارغة.');
        return;
      }
      const newDraft: Draft = {
        id: `draft_${Date.now()}`,
        text: postText,
        hasImage: !!selectedImage,
        imagePreview: imagePreview || undefined, 
        createdAt: new Date().toISOString(),
      };

      const updatedDrafts = [...drafts, newDraft];
      setDrafts(updatedDrafts);
      await saveDataToFirestore({ drafts: updatedDrafts }); 

      showNotification('success', 'تم حفظ المسودة بنجاح!');
      clearComposer();
    };
    
    const syncFacebookData = useCallback(async (target: Target) => {
        if (!target.access_token) {
            showNotification('error', 'Page access token is missing. Please re-authenticate.');
            return;
        }
        setSyncingTargetId(target.id);
        showNotification('partial', `جاري مزامنة بيانات ${target.name}...`);
        try {
            const scheduledPath = `/${target.id}/scheduled_posts?fields=id,message,scheduled_publish_time,attachments{media{source}}`;
            const fbScheduledPosts = await fetchWithPagination(scheduledPath, target.access_token);
            
            const newScheduledPosts: ScheduledPost[] = fbScheduledPosts.map((post: any) => ({
                id: post.id,
                text: post.message || '',
                scheduledAt: new Date(post.scheduled_publish_time * 1000),
                imageUrl: post.attachments?.data[0]?.media?.source,
                hasImage: !!post.attachments?.data[0]?.media?.source,
                targetId: target.id,
                targetInfo: { name: target.name, avatarUrl: target.picture.data.url, type: target.type },
                status: 'scheduled',
                isReminder: false,
                type: 'post' // <-- الإصلاح هنا
            }));
            setScheduledPosts(newScheduledPosts);

            const publishedPath = `/${target.id}/published_posts?fields=id,message,created_time,full_picture,likes.summary(true),comments.summary(true),shares`;
            const fbPublishedPosts = await fetchWithPagination(publishedPath, target.access_token);
            
            const newPublishedPosts: PublishedPost[] = fbPublishedPosts.map((post: any) => ({
                id: post.id,
                text: post.message || '',
                publishedAt: new Date(post.created_time),
                imagePreview: post.full_picture,
                analytics: {
                    likes: post.likes?.summary?.total_count || 0,
                    comments: post.comments?.summary?.total_count || 0,
                    shares: post.shares?.count || 0,
                    lastUpdated: new Date().toISOString(),
                },
                pageId: target.id,
                pageName: target.name,
                pageAvatarUrl: target.picture.data.url,
            }));
            setPublishedPosts(newPublishedPosts);
            setPublishedPostsLoading(false);

            await saveDataToFirestore({
                scheduledPosts: newScheduledPosts.map(p => ({...p, scheduledAt: p.scheduledAt.toISOString()})),
                publishedPosts: newPublishedPosts.map(p => ({...p, publishedAt: p.publishedAt.toISOString()})),
                lastSync: new Date().toISOString()
            });

            showNotification('success', 'تمت مزامنة بيانات فيسبوك بنجاح!');
        } catch (error: any) {
            console.error("Facebook Sync Error:", error);
            showNotification('error', `فشل المزامنة مع فيسبوك: ${error.message}`);
        } finally {
            setSyncingTargetId(null);
        }
    }, [fetchWithPagination, saveDataToFirestore, showNotification]);

    useEffect(() => {
        const loadDataAndSync = async () => {
            const dataRef = getTargetDataRef();
            setPublishedPostsLoading(true);
            setIsInboxLoading(true);

            const docSnap = await dataRef.get();
            if (docSnap.exists) {
                const data = docSnap.data()!;
                setPageProfile(data.pageProfile || initialPageProfile);
                setDrafts(data.drafts || []);
                setScheduledPosts(data.scheduledPosts?.map((p: any) => ({...p, scheduledAt: new Date(p.scheduledAt)})) || []);
                setPublishedPosts(data.publishedPosts?.map((p:any) => ({...p, publishedAt: new Date(p.publishedAt)})) || []);
                setInboxItems(data.inboxItems || []);
                setAutoResponderSettings(data.autoResponderSettings || initialAutoResponderSettings);
                setHeatmapData(data.heatmapData || []);
                setContentTypePerformanceData(data.contentTypeData || []);
                setPerformanceSummaryText(data.performanceSummaryText || '');
            } else {
                setPageProfile(initialPageProfile);
                setDrafts([]);
                setScheduledPosts([]);
                setPublishedPosts([]);
                setInboxItems([]);
            }
            
            await syncFacebookData(managedTarget);
            
            setPublishedPostsLoading(false);
            setIsInboxLoading(false);
        };

        loadDataAndSync();
    }, [managedTarget, getTargetDataRef, syncFacebookData]);


    const handlePublish = async (postType: PostType) => { /* ... */ };
    const handleEditScheduledPost = (postId: string) => { /* ... */ };
    const handleDeleteScheduledPost = (postId: string) => { /* ... */ };
    const handleApprovePost = (postId: string) => { /* ... */ };
    const handleRejectPost = (postId: string) => { /* ... */ };
    const handleLoadDraft = (draftId: string) => { /* ... */ };
    const handleDeleteDraft = (draftId: string) => { /* ... */ };
    const handleAddBulkPosts = (files: FileList | null) => { /* ... */ };
    const handleUpdateBulkPost = (id: string, updates: Partial<BulkPostItem>) => { /* ... */ };
    const handleRemoveBulkPost = (id: string) => { /* ... */ };
    const handleGenerateBulkPostFromText = async (id: string, text: string) => { /* ... */ };
    const handleGenerateImageFromText = async (id: string, text: string, service: 'gemini' | 'stability') => { /* ... */ };
    const handleGeneratePostFromImage = async (id: string, imageFile: File) => { /* ... */ };
    const handleAddImageManually = (id: string, file: File) => { /* ... */ };
    const handleScheduleAllBulk = async () => { /* ... */ };
    const handleReschedule = () => { /* ... */ };
    const handleScheduleStrategy = async () => { /* ... */ };
    const handleFetchProfile = async () => { /* ... */ };
    const handleGeneratePerformanceSummary = async () => {
        if (!aiClient || !performanceSummaryData) return;
        setIsGeneratingSummary(true);
        try {
            const summary = await generatePerformanceSummary(aiClient, performanceSummaryData, pageProfile, analyticsPeriod);
            setPerformanceSummaryText(summary);
            await saveDataToFirestore({ performanceSummaryText: summary });
        } catch (e) {
            showNotification('error', 'فشل في توليد ملخص الأداء.');
        } finally {
            setIsGeneratingSummary(false);
        }
    };
    
    const handleGenerateDeepAnalytics = async () => {
        if (!aiClient) return;
        setIsGeneratingDeepAnalytics(true);
        showNotification('partial', 'جاري إنشاء تحليلات معمقة، قد يستغرق الأمر دقيقة...');
        try {
            const [heatmap, contentType] = await Promise.all([
                generateBestPostingTimesHeatmap(aiClient, publishedPosts),
                generateContentTypePerformance(aiClient, publishedPosts)
            ]);
            setHeatmapData(heatmap);
            setContentTypePerformanceData(contentType);
            await saveDataToFirestore({ heatmapData: heatmap, contentTypeData: contentType });
            showNotification('success', 'تم إنشاء التحليلات المعمقة بنجاح!');
        } catch(e) {
            showNotification('error', 'فشل في إنشاء التحليلات المعمقة.');
        } finally {
            setIsGeneratingDeepAnalytics(false);
        }
    };
    
    const handleFetchPostInsights = async (postId: string) => {
        const post = publishedPosts.find(p => p.id === postId);
        if (!aiClient || !post) return null;
        try {
            const insights = await generatePostInsights(aiClient, post.text, post.analytics, []); // Assuming comments are fetched elsewhere
            return insights;
        } catch (e) {
            showNotification('error', 'فشل في جلب رؤى المنشور.');
            return null;
        }
    };


    const renderView = () => {
        switch (view) {
          case 'composer':
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <PostComposer
                  onPublish={handlePublish} onSaveDraft={handleSaveDraft} isPublishing={isPublishing}
                  postText={postText} onPostTextChange={setPostText}
                  onImageChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
                  onImageGenerated={setSelectedImage} onImageRemove={() => setSelectedImage(null)}
                  imagePreview={imagePreview} selectedImage={selectedImage} isScheduled={isScheduled}
                  onIsScheduledChange={setIsScheduled} scheduleDate={scheduleDate}
                  onScheduleDateChange={setScheduleDate} error={composerError} aiClient={aiClient}
                  stabilityApiKey={stabilityApiKey} managedTarget={managedTarget}
                  linkedInstagramTarget={linkedInstagramTarget} includeInstagram={includeInstagram}
                  onIncludeInstagramChange={setIncludeInstagram} pageProfile={pageProfile}
                  editingScheduledPostId={editingScheduledPostId} role={currentUserRole} userPlan={userPlan}
                />
                <PostPreview postText={postText} imagePreview={imagePreview} type={includeInstagram && linkedInstagramTarget ? 'instagram' : 'facebook'} pageName={managedTarget.name} pageAvatar={managedTarget.picture.data.url} />
              </div>
            );
          case 'calendar':
            return <ContentCalendar posts={scheduledPosts} onEdit={handleEditScheduledPost} onDelete={handleDeleteScheduledPost} managedTarget={managedTarget} userPlan={userPlan} role={currentUserRole} onApprove={handleApprovePost} onReject={handleRejectPost} onSync={() => syncFacebookData(managedTarget)} isSyncing={!!syncingTargetId} />
          case 'drafts':
            return <DraftsList drafts={drafts} onLoad={handleLoadDraft} onDelete={handleDeleteDraft} role={currentUserRole} />
          case 'bulk':
            return <BulkSchedulerPage bulkPosts={bulkPosts} onSchedulingStrategyChange={setSchedulingStrategy} onWeeklyScheduleSettingsChange={setWeeklyScheduleSettings} onReschedule={handleReschedule} onAddPosts={handleAddBulkPosts} onUpdatePost={handleUpdateBulkPost} onRemovePost={handleRemoveBulkPost} onGeneratePostFromText={handleGenerateBulkPostFromText} onGenerateImageFromText={handleGenerateImageFromText} onGeneratePostFromImage={handleGeneratePostFromImage} onAddImageManually={handleAddImageManually} onScheduleAll={handleScheduleAllBulk} targets={bulkSchedulerTargets} aiClient={aiClient} stabilityApiKey={stabilityApiKey} pageProfile={pageProfile} isSchedulingAll={isSchedulingAll} schedulingStrategy={schedulingStrategy} weeklyScheduleSettings={weeklyScheduleSettings} role={currentUserRole} showNotification={showNotification} />
          case 'planner':
            return <ContentPlannerPage plan={contentPlan} isGenerating={isGeneratingPlan} strategyHistory={strategyHistory} isSchedulingStrategy={isSchedulingStrategy} error={planError} role={currentUserRole} onScheduleStrategy={handleScheduleStrategy} aiClient={aiClient} onGeneratePlan={async (request, images) => { /* ... */ }} onStartPost={(planItem) => { /* ... */ }} pageProfile={pageProfile} onLoadFromHistory={(plan) => setContentPlan(plan)} onDeleteFromHistory={(id) => onDeleteStrategy(managedTarget.id, id)} />
          case 'inbox':
            return <InboxPage items={inboxItems} isLoading={isInboxLoading} autoResponderSettings={autoResponderSettings} onAutoResponderSettingsChange={(settings) => {setAutoResponderSettings(settings); saveDataToFirestore({ autoResponderSettings: settings });}} repliedUsersPerPost={repliedUsersPerPost} currentUserRole={currentUserRole} isSyncing={isPolling} onSync={() => setIsPolling(true)} onReply={async ()=>{return true}} onMarkAsDone={()=>{}} onGenerateSmartReplies={async ()=>{return []}} onFetchMessageHistory={() => {}} aiClient={aiClient} role={currentUserRole} onLike={async () => {}} selectedTarget={managedTarget}/>
          case 'analytics':
            return <AnalyticsPage publishedPosts={publishedPosts} publishedPostsLoading={publishedPostsLoading} analyticsPeriod={analyticsPeriod} setAnalyticsPeriod={setAnalyticsPeriod} performanceSummaryData={performanceSummaryData} performanceSummaryText={performanceSummaryText} isGeneratingSummary={isGeneratingSummary} audienceGrowthData={audienceGrowthData} heatmapData={heatmapData} contentTypeData={contentTypeData} isGeneratingDeepAnalytics={isGeneratingDeepAnalytics} managedTarget={managedTarget} userPlan={userPlan} currentUserRole={currentUserRole} onGeneratePerformanceSummary={handleGeneratePerformanceSummary} onGenerateDeepAnalytics={handleGenerateDeepAnalytics} onFetchPostInsights={handleFetchPostInsights} />
          case 'profile':
            return <PageProfilePage profile={pageProfile} onProfileChange={handlePageProfileChange} isFetchingProfile={isFetchingProfile} onFetchProfile={handleFetchProfile} role={currentUserRole} user={user} />
          case 'ads':
            return <AdsManagerPage selectedTarget={managedTarget} role={currentUserRole} />;
          default: return null;
        }
      }
      
      return (
        <>
          <Header pageName={managedTarget.name} onChangePage={onChangePage} onLogout={onLogout} onSettingsClick={onSettingsClick} theme={theme} onToggleTheme={onToggleTheme} />
          {notification && <div className={`fixed bottom-4 right-4 p-4 rounded-md text-white text-sm z-50 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}>{notification.message}</div>}
          <div className="flex flex-col md:flex-row min-h-[calc(100vh-68px)]">
            <aside className="w-full md:w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700/50 flex-shrink-0">
              <nav className="space-y-2">
                <NavItem icon={<PencilSquareIcon className="w-5 h-5" />} label="إنشاء منشور" active={view === 'composer'} onClick={() => setView('composer')} />
                <NavItem icon={<QueueListIcon className="w-5 h-5" />} label="الجدولة المجمعة" active={view === 'bulk'} onClick={() => setView('bulk')} />
                <NavItem icon={<BrainCircuitIcon className="w-5 h-5" />} label="استراتيجيات المحتوى" active={view === 'planner'} onClick={() => setView('planner')} />
                <NavItem icon={<CalendarIcon className="w-5 h-5" />} label="تقويم المحتوى" active={view === 'calendar'} onClick={() => setView('calendar')} />
                <NavItem icon={<ArchiveBoxIcon className="w-5 h-5" />} label="المسودات" active={view === 'drafts'} onClick={() => setView('drafts')} />
                <NavItem icon={<InboxArrowDownIcon className="w-5 h-5" />} label="صندوق الوارد" active={view === 'inbox'} onClick={() => setView('inbox')} />
                <NavItem icon={<ChartBarIcon className="w-5 h-5" />} label="التحليلات" active={view === 'analytics'} onClick={() => setView('analytics')} />
                <NavItem icon={<BriefcaseIcon className="w-5 h-5" />} label="مدير الإعلانات" active={view === 'ads'} onClick={() => setView('ads')} />
                <NavItem icon={<UserCircleIcon className="w-5 h-5" />} label="ملف الصفحة" active={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
              <div className="mt-8 pt-4 border-t dark:border-gray-700">
                    <Button onClick={() => syncFacebookData(managedTarget)} isLoading={!!syncingTargetId} variant="secondary" className="w-full" disabled={currentUserRole === 'viewer'} title={currentUserRole === 'viewer' ? 'لا تملك صلاحية المزامنة' : undefined}>
                        <ArrowPathIcon className="w-5 h-5 ml-2" />
                        {syncingTargetId ? 'جاري المزامنة...' : 'مزامنة بيانات فيسبوك'}
                    </Button>
              </div>
            </aside>
            <main className="flex-grow min-w-0 p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              {renderView()}
            </main>
          </div>
        </>
      );
};

export default DashboardPage;
