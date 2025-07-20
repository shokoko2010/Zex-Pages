
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Target, PublishedPost, Draft, ScheduledPost, BulkPostItem, ContentPlanItem, StrategyRequest, WeeklyScheduleSettings, PageProfile, PerformanceSummaryData, StrategyHistoryItem, InboxItem, AutoResponderSettings, PostAnalytics, Plan, Role, AppUser, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData } from '../types';
import Header from './Header';
import PostComposer from './PostComposer';
import PostPreview from './PostPreview';
import AnalyticsPage from './AnalyticsPage';
import DraftsList from './DraftsList';
import ContentCalendar from './ContentCalendar';
import BulkSchedulerPage from './BulkSchedulerPage';
import ContentPlannerPage from './ContentPlannerPage';
import InboxPage from './InboxPage';
import { GoogleGenAI } from '@google/genai';
import { generateContentPlan, generatePerformanceSummary, generateOptimalSchedule, generatePostInsights, enhanceProfileFromFacebookData, generateSmartReplies, generateAutoReply, generatePostSuggestion, generateHashtags, generateDescriptionForImage, generateBestPostingTimesHeatmap, generateContentTypePerformance } from '../services/geminiService';
import PageProfilePage from './PageProfilePage';
import Button from './ui/Button';
import { db } from '../services/firebaseService';
import type { User } from '../services/firebaseService';

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

// New constants for data retention
const MAX_PUBLISHED_POSTS_TO_STORE = 100;
const MAX_INBOX_ITEMS_TO_STORE = 200;
const MAX_STRATEGY_HISTORY_TO_STORE = 20;

type DashboardView = 'composer' | 'calendar' | 'drafts' | 'analytics' | 'bulk' | 'planner' | 'inbox' | 'profile';

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
  aiClient: GoogleGenAI | null;
  stabilityApiKey: string | null;
  onSettingsClick: () => void;
  fetchWithPagination: (path: string, accessToken?: string) => Promise<any[]>;
  onSyncHistory: (target: Target) => Promise<void>;
  syncingTargetId: string | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  fbAccessToken: string | null;
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
                <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{notificationCount}</span>
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

const createNewScheduledPost = (
    target: Target, postText: string, selectedImage: File | null, imagePreview: string | null,
    scheduleDate: string, editingScheduledPostId: string | null, managedTarget: Target,
    userPlan: Plan | null, currentUserRole: Role
): ScheduledPost => {
    const needsApproval = userPlan?.limits.contentApprovalWorkflow && currentUserRole === 'editor';
    const postStatus: 'pending' | 'approved' = needsApproval ? 'pending' : 'approved';

    return {
        id: editingScheduledPostId && target.id === managedTarget.id ? editingScheduledPostId : `local_${Date.now()}_${target.id}`,
        text: postText, imageFile: selectedImage || undefined, imageUrl: imagePreview || undefined,
        hasImage: !!selectedImage || !!imagePreview,
        scheduledAt: new Date(scheduleDate),
        isReminder: target.type === 'instagram',
        targetId: target.id,
        targetInfo: { name: target.name, avatarUrl: target.picture.data.url, type: target.type },
        isSynced: false,
        status: postStatus,
    };
};

const DashboardPage: React.FC<DashboardPageProps> = ({
    user, isAdmin, userPlan, plans, allUsers, managedTarget, allTargets, onChangePage, onLogout,
    isSimulationMode, aiClient, stabilityApiKey, onSettingsClick, fetchWithPagination, onSyncHistory,
    syncingTargetId, theme, onToggleTheme, fbAccessToken
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
  const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
  const [publishedPostsLoading, setPublishedPostsLoading] = useState(true);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d'>('30d');
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
  const [isSyncingScheduled, setIsSyncingScheduled] = useState(false);

  const linkedInstagramTarget = useMemo(() => allTargets.find(t => t.type === 'instagram' && t.parentPageId === managedTarget.id) || null, [managedTarget, allTargets]);
  const bulkSchedulerTargets = useMemo(() => [managedTarget, ...(linkedInstagramTarget ? [linkedInstagramTarget] : [])], [managedTarget, linkedInstagramTarget]);

  const clearComposer = useCallback(() => {
    setPostText(''); setSelectedImage(null); setImagePreview(null);
    setScheduleDate(''); setComposerError(''); setIsScheduled(false);
    setIncludeInstagram(!!linkedInstagramTarget); setEditingScheduledPostId(null);
  }, [linkedInstagramTarget]);

  const showNotification = useCallback((type: 'success' | 'error' | 'partial', message: string, onUndo?: () => void) => {
    setNotification({ type, message, onUndo });
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setNotification(null), 5000);
  }, []);

  const getTargetDataRef = useCallback(() => db.collection('targets_data').doc(managedTarget.id), [managedTarget]);

  const saveDataToFirestore = useCallback(async (dataToSave: { [key: string]: any }) => {
    try { await getTargetDataRef().set({ ...dataToSave }, { merge: true }); }
    catch (error) { showNotification('error', 'فشل حفظ البيانات في السحابة.'); }
  }, [getTargetDataRef, showNotification]);

  const handlePageProfileChange = (newProfile: PageProfile) => {
    setPageProfile(newProfile);
    saveDataToFirestore({ pageProfile: newProfile });
  };
  
  const rescheduleBulkPosts = useCallback((postsToReschedule: BulkPostItem[]): BulkPostItem[] => { /* ... unchanged ... */ return postsToReschedule; }, [schedulingStrategy, weeklyScheduleSettings]);
  const handleReschedule = () => setBulkPosts(prev => rescheduleBulkPosts(prev));
  const handleAddBulkPosts = useCallback((files: FileList) => { /* ... unchanged ... */ }, [rescheduleBulkPosts, showNotification, managedTarget.id]);
  const handleUpdateBulkPost = (id: string, updates: Partial<BulkPostItem>) => setBulkPosts(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  const handleRemoveBulkPost = (id: string) => setBulkPosts(prev => prev.filter(p => p.id !== id));
  const handleGenerateBulkDescription = async (id: string) => { /* ... unchanged ... */ };
  const handleGenerateBulkPostFromText = async (id: string) => { /* ... unchanged ... */ };
  const handleScheduleAllBulk = async () => { /* ... unchanged ... */ };
  const handleFetchProfile = useCallback(async () => { /* ... unchanged ... */ }, [managedTarget.id, isSimulationMode, aiClient, showNotification, pageProfile, handlePageProfileChange, fbAccessToken]);
  const syncScheduledPosts = useCallback(async () => { /* ... unchanged ... */ }, [managedTarget, isSimulationMode, fetchWithPagination, showNotification, saveDataToFirestore]);
  
  useEffect(() => {
    const loadDataFromFirestore = async () => {
        const dataRef = getTargetDataRef();
        setPublishedPostsLoading(true); setIsInboxLoading(true);

        const docSnap = await dataRef.get();
        if (docSnap.exists) {
            const data = docSnap.data()!;
            const loadedProfile: PageProfile = { ...initialPageProfile, ...(data.pageProfile || {}) };
            if (!loadedProfile.ownerUid) {
                loadedProfile.ownerUid = user.uid;
                loadedProfile.members = [user.uid];
                await saveDataToFirestore({ 
                    pageProfile: loadedProfile, id: managedTarget.id, name: managedTarget.name,
                    pictureUrl: managedTarget.picture.data.url, accessToken: managedTarget.access_token,
                });
            }
            setPageProfile(loadedProfile);
            setCurrentUserRole(loadedProfile.ownerUid === user.uid ? 'owner' : (loadedProfile.team?.find(m => m.uid === user.uid)?.role || 'viewer'));
            setAutoResponderSettings(data.autoResponderSettings || initialAutoResponderSettings);
            setDrafts(data.drafts?.map((d: any) => ({...d, imageFile: null})) || []);
            setScheduledPosts(data.scheduledPosts?.map((p: any) => ({...p, scheduledAt: new Date(p.scheduledAt), imageFile: undefined })) || []);
            setStrategyHistory(data.strategyHistory || []);
            setPublishedPosts(data.publishedPosts?.map((p:any) => ({...p, publishedAt: new Date(p.publishedAt)})) || []);
            setInboxItems(data.inboxItems?.map((i:any) => ({ ...i, timestamp: new Date(i.timestamp).toISOString() })) || []);
        } else {
            const newProfile: PageProfile = { ...initialPageProfile, ownerUid: user.uid, members: [user.uid], team: [] };
            setPageProfile(newProfile);
            setCurrentUserRole('owner');
            await saveDataToFirestore({ 
                pageProfile: newProfile, id: managedTarget.id, name: managedTarget.name,
                pictureUrl: managedTarget.picture.data.url, accessToken: managedTarget.access_token, userId: user.uid
            });
            // Reset all state for new target
            setAutoResponderSettings(initialAutoResponderSettings);
            setDrafts([]); setScheduledPosts([]); setStrategyHistory([]); setPublishedPosts([]); setInboxItems([]);
        }
        clearComposer();
        setPublishedPostsLoading(false);
        setIsInboxLoading(false);
    };
    loadDataFromFirestore();
  }, [managedTarget, getTargetDataRef, clearComposer, user.uid, saveDataToFirestore, initialPageProfile]);
  
    const handlePublish = async () => { /* ... unchanged ... */ };
    const handleSaveDraft = async () => { /* ... unchanged ... */ };
    const handleLoadDraft = (draftId: string) => { /* ... unchanged ... */ };
    const handleDeleteDraft = async (draftId: string) => { /* ... unchanged ... */ };
    const handleEditScheduledPost = (postId: string) => { /* ... unchanged ... */ };
    const handleDeleteScheduledPost = async (postId:string) => { /* ... unchanged ... */ };
    const handleApprovePost = async (postId: string) => { /* ... unchanged ... */ };
    const handleRejectPost = async (postId: string) => { /* ... unchanged ... */ };
    
  const handleSetView = (newView: DashboardView) => {
    // const isAllowed = (feature: keyof Plan['limits']) => userPlan?.limits[feature] ?? false;
    // const planName = userPlan?.name || 'Free';
    // const featureMap: Partial<Record<DashboardView, { key: keyof Plan['limits'], name: string }>> = {
    //     'bulk': { key: 'bulkScheduling', name: 'الجدولة المجمعة' },
    //     'planner': { key: 'contentPlanner', name: 'استراتيجيات المحتوى' },
    //     'inbox': { key: 'autoResponder', name: 'صندوق الوارد' },
    // };
    // const requestedFeature = featureMap[newView];
    // if (requestedFeature && !isAllowed(requestedFeature.key)) {
    //     alert(`ميزة "${requestedFeature.name}" غير متاحة في خطة "${planName}".`);
    //     return;
    // }
    setView(newView);
  };
    
  useEffect(() => {
    if (view === 'analytics' && userPlan?.limits.deepAnalytics && aiClient && publishedPosts.length > 0) {
      const generateData = async () => { /* ... unchanged ... */ };
      generateData();
    }
  }, [view, userPlan?.limits.deepAnalytics, aiClient, publishedPosts, showNotification]);

  const renderView = () => {
    const linkedInstagramTarget = allTargets.find(t => t.type === 'instagram' && t.parentPageId === managedTarget.id) || null; // Re-declare locally for renderView
    switch (view) {
      case 'composer':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <PostComposer
              postText={postText}
              onPostTextChange={setPostText}
              selectedImage={selectedImage}
              onImageChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
              onImageGenerated={setSelectedImage}
              onImageRemove={() => { setSelectedImage(null); setImagePreview(null); }}
              imagePreview={imagePreview}
              isScheduled={isScheduled}
              onIsScheduledChange={setIsScheduled}
              scheduleDate={scheduleDate}
              onScheduleDateChange={setScheduleDate}
              error={composerError}
              onPublish={handlePublish}
              onSaveDraft={handleSaveDraft}
              includeInstagram={includeInstagram}
              onIncludeInstagramChange={setIncludeInstagram}
              linkedInstagramTarget={linkedInstagramTarget}
              editingScheduledPostId={editingScheduledPostId}
              userPlan={userPlan}
              isPublishing={isPublishing}
              aiClient={aiClient}
              pageProfile={pageProfile}
              stabilityApiKey={stabilityApiKey}
              managedTarget={managedTarget}
              role={currentUserRole}
            />
            <PostPreview
              postText={postText}
              imagePreview={imagePreview}
              type={includeInstagram && linkedInstagramTarget ? 'instagram' : 'facebook'}
              pageName={managedTarget.name}
              pageAvatar={managedTarget.picture.data.url}
            />
          </div>
        );
      case 'calendar':
        return (
          <ContentCalendar
            posts={scheduledPosts}
            onEdit={handleEditScheduledPost}
            onDelete={handleDeleteScheduledPost}
            managedTarget={managedTarget}
            userPlan={userPlan}
            role={currentUserRole}
            onApprove={handleApprovePost}
            onReject={handleRejectPost}
            onSync={() => onSyncHistory(managedTarget)}
            isSyncing={!!syncingTargetId}
          />
        );
      case 'drafts':
        return (
          <DraftsList
            drafts={drafts}
            onLoad={handleLoadDraft}
            onDelete={handleDeleteDraft}
            role={currentUserRole}
          />
        );
      case 'bulk':
        return (
          <BulkSchedulerPage
            bulkPosts={bulkPosts}
            onSchedulingStrategyChange={setSchedulingStrategy}
            onWeeklyScheduleSettingsChange={setWeeklyScheduleSettings}
            onReschedule={handleReschedule}
            onAddPosts={handleAddBulkPosts}
            onUpdatePost={handleUpdateBulkPost}
            onRemovePost={handleRemoveBulkPost}
            onGenerateDescription={handleGenerateBulkDescription}
            onGeneratePostFromText={handleGenerateBulkPostFromText}
            onScheduleAll={handleScheduleAllBulk}
            targets={bulkSchedulerTargets}
            aiClient={aiClient}
            isSchedulingAll={isSchedulingAll}
            schedulingStrategy={schedulingStrategy}
            weeklyScheduleSettings={weeklyScheduleSettings}
            role={currentUserRole}
          />
        );
      case 'planner':
        return (
          <ContentPlannerPage
            plan={contentPlan}
            isGenerating={isGeneratingPlan}
            strategyHistory={strategyHistory}
            isSchedulingStrategy={isSchedulingStrategy}
            error={planError}
            role={currentUserRole}
            onScheduleStrategy={handleScheduleAllBulk}
            aiClient={aiClient}
            onGeneratePlan={async (request, images) => {
                setIsGeneratingPlan(true);
                setPlanError(null);
                try {
                    const generatedPlan = await generateContentPlan(aiClient!, request, pageProfile, images);
                    setContentPlan(generatedPlan);
                } catch (e: any) {
                    setPlanError(e.message || 'Failed to generate content plan');
                } finally {
                    setIsGeneratingPlan(false);
                }
            }}
            onStartPost={(planItem) => {
                setView('composer');
                setPostText(`${planItem.hook}

${planItem.headline}

${planItem.body}`);
                // Note: Image generation is not directly supported from plan item yet
                // For now, user needs to generate or upload manually.
            }}
            pageProfile={pageProfile}
            onLoadFromHistory={(plan) => setContentPlan(plan)}
            onDeleteFromHistory={(id) => setStrategyHistory(prev => prev.filter(item => item.id !== id))}
          />
        );
      case 'inbox':
        return (
          <InboxPage
            items={inboxItems}
            isLoading={isInboxLoading}
            autoResponderSettings={autoResponderSettings}
            onAutoResponderSettingsChange={(settings) => {
                setAutoResponderSettings(settings);
                saveDataToFirestore({ autoResponderSettings: settings });
            }}
            repliedUsersPerPost={repliedUsersPerPost}
            currentUserRole={currentUserRole}
            isSyncing={isPolling}
            onSync={() => setIsPolling(true)}
            onReply={async (item, message) => { /* ... reply logic ... */ return true; }}
            onMarkAsDone={(itemId) => {
                 setInboxItems(prev => prev.map(item => item.id === itemId ? {...item, status: 'done'} : item));
                 // Further action to mark as done in Firebase/Facebook API needed
            }}
            onGenerateSmartReplies={async (commentText) => { /* ... smart reply logic ... */ return []; }}
            onFetchMessageHistory={async (conversationId) => { /* ... fetch history logic ... */ }}
            aiClient={aiClient}
            role={currentUserRole}
          />
        );
      case 'analytics':
        return (
          <AnalyticsPage
            publishedPosts={publishedPosts}
            publishedPostsLoading={publishedPostsLoading}
            analyticsPeriod={analyticsPeriod}
            setAnalyticsPeriod={setAnalyticsPeriod}
            performanceSummaryText={performanceSummaryText}
            setPerformanceSummaryText={setPerformanceSummaryText}
            isGeneratingSummary={isGeneratingSummary}
            setIsGeneratingSummary={setIsGeneratingSummary}
            audienceGrowthData={audienceGrowthData}
            setAudienceGrowthData={setAudienceGrowthData}
            heatmapData={heatmapData}
            setHeatmapData={setHeatmapData}
            contentTypeData={contentTypeData}
            setContentTypePerformanceData={setContentTypePerformanceData}
            isGeneratingDeepAnalytics={isGeneratingDeepAnalytics}
            setIsGeneratingDeepAnalytics={setIsGeneratingDeepAnalytics}
            managedTarget={managedTarget}
            userPlan={userPlan}
            isSimulationMode={isSimulationMode}
            aiClient={aiClient}
            pageProfile={pageProfile}
            currentUserRole={currentUserRole}
            showNotification={showNotification}
            generatePerformanceSummary={generatePerformanceSummary}
            generatePostInsights={generatePostInsights}
            generateOptimalSchedule={generateOptimalSchedule}
            generateBestPostingTimesHeatmap={generateBestPostingTimesHeatmap}
            generateContentTypePerformance={generateContentTypePerformance}
          />
        );
      case 'profile':
        return (
          <PageProfilePage
            profile={pageProfile}
            onProfileChange={handlePageProfileChange}
            isFetchingProfile={isFetchingProfile}
            onFetchProfile={handleFetchProfile}
            role={currentUserRole}
            user={user}
          />
        );
      default:
        return null;
    }
  };

  const isAllowed = (feature: keyof Plan['limits']) => userPlan?.limits[feature] ?? false;
  const planName = userPlan?.name || 'Free';

  return (
    <>
      <Header pageName={managedTarget.name} onChangePage={onChangePage} onLogout={onLogout} onSettingsClick={onSettingsClick} theme={theme} onToggleTheme={onToggleTheme} />
      {notification && <div className={`fixed bottom-4 right-4 p-4 rounded-md text-white text-sm z-50 ${
        notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}>
        {notification.message}
        {notification.onUndo && (
          <button onClick={() => { notification.onUndo?.(); setNotification(null); }} className="ml-4 underline">تراجع</button>
        )}
      </div>}
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-68px)]">
        <aside className="w-full md:w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700/50 flex-shrink-0">
          <nav className="space-y-2">
            <NavItem icon={<PencilSquareIcon className="w-5 h-5" />} label="إنشاء منشور" active={view === 'composer'} onClick={() => setView('composer')} />
            <NavItem icon={<QueueListIcon className="w-5 h-5" />} label="الجدولة المجمعة" active={view === 'bulk'} onClick={() => handleSetView('bulk')} />
            <NavItem icon={<BrainCircuitIcon className="w-5 h-5" />} label="استراتيجيات المحتوى" active={view === 'planner'} onClick={() => handleSetView('planner')} />
            <NavItem icon={<CalendarIcon className="w-5 h-5" />} label="تقويم المحتوى" active={view === 'calendar'} onClick={() => setView('calendar')} />
            <NavItem icon={<ArchiveBoxIcon className="w-5 h-5" />} label="المسودات" active={view === 'drafts'} onClick={() => setView('drafts')} />
            <NavItem icon={<InboxArrowDownIcon className="w-5 h-5" />} label="صندوق الوارد" active={view === 'inbox'} onClick={() => handleSetView('inbox')} isPolling={isPolling} notificationCount={inboxItems.filter(item => item.status === 'new').length} />
            <NavItem icon={<ChartBarIcon className="w-5 h-5" />} label="التحليلات" active={view === 'analytics'} onClick={() => setView('analytics')} />
            <NavItem icon={<UserCircleIcon className="w-5 h-5" />} label="ملف الصفحة" active={view === 'profile'} onClick={() => setView('profile')} />
          </nav>
          <div className="mt-8 pt-4 border-t dark:border-gray-700">
                <Button 
                    onClick={() => onSyncHistory(managedTarget)} 
                    isLoading={!!syncingTargetId} 
                    variant="secondary" 
                    className="w-full"
                    disabled={currentUserRole === 'viewer'}
                    title={currentUserRole === 'viewer' ? 'لا تملك صلاحية المزامنة' : undefined}
                >
                    <ArrowPathIcon className="w-5 h-5 ml-2" />
                    {syncingTargetId ? 'جاري المزامنة...' : 'مزامنة السجل الكامل'}
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
