
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Target, PublishedPost, Draft, ScheduledPost, BulkPostItem, ContentPlanItem, StrategyRequest, WeeklyScheduleSettings, PageProfile, PerformanceSummaryData, StrategyHistoryItem, InboxItem, AutoResponderSettings, Plan, Role, AppUser, AudienceGrowthData, HeatmapDataPoint, ContentTypePerformanceData, PostType } from '../types';
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
    disabled?: boolean;
}> = ({ icon, label, active, onClick, notificationCount, disabled = false }) => (
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
        {notificationCount && notificationCount > 0 ? (
            <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{notificationCount}</span>
        ) : null}
    </button>
);

const initialPageProfile: PageProfile = {
    description: '', services: '', contactInfo: '', website: '',
    links: [], currentOffers: '', address: '', country: '',
    language: 'ar', contentGenerationLanguages: ['ar'],
    ownerUid: '', team: [], members: [],
};


const DashboardPage: React.FC<DashboardPageProps> = ({
  user, isAdmin, userPlan, managedTarget, allTargets, onChangePage, onLogout, aiClient, stabilityApiKey, onSettingsClick, fetchWithPagination, theme, onToggleTheme, strategyHistory, onSavePlan, onDeleteStrategy
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
    const [notification, setNotification] = useState<{type: 'success' | 'error' | 'partial', message: string} | null>(null);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [pageProfile, setPageProfile] = useState<PageProfile>(initialPageProfile);
    const [currentUserRole, setCurrentUserRole] = useState<Role>('viewer');
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
    const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
    const [publishedPostsLoading, setPublishedPostsLoading] = useState(true);
    const [isInboxLoading, setIsInboxLoading] = useState(true);
    const [syncingTargetId, setSyncingTargetId] = useState<string | null>(null); 
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d'>('30d');
    const [performanceSummaryData, setPerformanceSummaryData] = useState<PerformanceSummaryData | null>(null);
    const [performanceSummaryText, setPerformanceSummaryText] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [audienceGrowthData, setAudienceGrowthData] = useState<AudienceGrowthData[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
    const [contentTypeData, setContentTypePerformanceData] = useState<ContentTypePerformanceData[]>([]);
    const [isGeneratingDeepAnalytics, setIsGeneratingDeepAnalytics] = useState(false);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);

    const linkedInstagramTarget = useMemo(() => allTargets.find(t => t.type === 'instagram' && t.parentPageId === managedTarget.id) || null, [managedTarget, allTargets]);

    useEffect(() => {
      if (selectedImage) {
        const url = URL.createObjectURL(selectedImage);
        setImagePreview(url);
        return () => URL.revokeObjectURL(url);
      }
      setImagePreview(null);
    }, [selectedImage]);

    const showNotification = useCallback((type: 'success' | 'error' | 'partial', message: string) => {
      setNotification({ type, message });
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      undoTimerRef.current = setTimeout(() => setNotification(null), 5000);
    }, []);

    const getTargetDataRef = useCallback(() => db.collection('targets_data').doc(managedTarget.id), [managedTarget]);
    const saveDataToFirestore = useCallback(async (dataToSave: { [key: string]: any }) => {
      try { await getTargetDataRef().set(dataToSave, { merge: true }); }
      catch (error) { showNotification('error', 'فشل حفظ البيانات.'); }
    }, [getTargetDataRef, showNotification]);
    
    const handlePageProfileChange = (newProfile: PageProfile) => {
      setPageProfile(newProfile);
      saveDataToFirestore({ pageProfile: newProfile });
    };

    const handleFetchProfile = async () => {
        setIsFetchingProfile(true);
        showNotification('partial', 'جاري جلب بيانات الصفحة من فيسبوك...');
        await new Promise(res => setTimeout(res, 1500));
        showNotification('success', 'تم تحديث ملف الصفحة (محاكاة).');
        setIsFetchingProfile(false);
    };

    const syncFacebookData = useCallback(async (target: Target) => {
        if (!target.access_token) { showNotification('error', 'رمز الوصول للصفحة مفقود.'); return; }
        setSyncingTargetId(target.id);
        showNotification('partial', `جاري مزامنة بيانات ${target.name}...`);
        
        try {
            const fields = "id,message,created_time,likes.summary(true),comments.summary(true),shares,attachments{subattachments,media,type,url}";
            const [fbScheduled, fbPublished, fbFeed, fbConvos] = await Promise.all([
                 fetchWithPagination(`/${target.id}/scheduled_posts?fields=${fields}`, target.access_token),
                 fetchWithPagination(`/${target.id}/published_posts?fields=${fields}`, target.access_token),
                 fetchWithPagination(`/${target.id}/feed?fields=comments.limit(10){from,message,created_time,id},message,link,from,attachments`, target.access_token),
                 fetchWithPagination(`/${target.id}/conversations?fields=participants,messages.limit(1){from,to,message,created_time}`, target.access_token)
            ]);
            
            const getImageUrl = (post: any) => post.attachments?.data[0]?.media?.image?.src || post.attachments?.data[0]?.subattachments?.data[0]?.media?.image?.src;

            setScheduledPosts(fbScheduled.map((post: any) => ({
                id: post.id, text: post.message || '', scheduledAt: new Date(post.scheduled_publish_time * 1000),
                imageUrl: getImageUrl(post), hasImage: !!getImageUrl(post), targetId: target.id,
                targetInfo: { name: target.name, avatarUrl: target.picture.data.url, type: target.type },
                status: 'scheduled', isReminder: false, type: 'post'
            } as ScheduledPost)));

            setPublishedPosts(fbPublished.map((post: any) => ({
                id: post.id, text: post.message || '', publishedAt: new Date(post.created_time),
                imagePreview: getImageUrl(post),
                analytics: { likes: post.likes?.summary?.total_count || 0, comments: post.comments?.summary?.total_count || 0, shares: post.shares?.count || 0, lastUpdated: new Date().toISOString() },
                pageId: target.id, pageName: target.name, pageAvatarUrl: target.picture.data.url,
            } as PublishedPost)));

            const newInbox: InboxItem[] = [];
            fbFeed.forEach((post: any) => {
                if(post.comments) post.comments.data.forEach((comment: any) => {
                    if (comment.from.id !== target.id) newInbox.push({
                        id: comment.id, type: 'comment', from: comment.from, text: comment.message,
                        timestamp: comment.created_time, status: 'new', link: post.link,
                        post: { message: post.message, picture: getImageUrl(post) },
                        authorName: comment.from.name, authorPictureUrl: `https://graph.facebook.com/${comment.from.id}/picture?type=normal`
                    } as InboxItem);
                });
            });
            fbConvos.forEach((convo: any) => {
                const lastMsg = convo.messages?.data[0];
                if (lastMsg && lastMsg.from.id !== target.id) {
                     const participant = convo.participants.data.find((p: any) => p.id !== target.id);
                     newInbox.push({
                        id: lastMsg.id, type: 'message', from: participant, text: lastMsg.message,
                        timestamp: lastMsg.created_time, status: 'new', conversationId: convo.id,
                        authorName: participant.name, authorPictureUrl: `https://graph.facebook.com/${participant.id}/picture?type=normal`
                    } as InboxItem);
                }
            });
            setInboxItems(newInbox.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

            await saveDataToFirestore({
                scheduledPosts: scheduledPosts.map(p => ({...p, scheduledAt: p.scheduledAt.toISOString()})),
                publishedPosts: publishedPosts.map(p => ({...p, publishedAt: p.publishedAt.toISOString()})),
                inboxItems: newInbox, lastSync: new Date().toISOString()
            });
            showNotification('success', 'تمت المزامنة بنجاح!');
        } catch (error: any) {
            showNotification('error', `فشل المزامنة: ${error.message}`);
        } finally {
            setSyncingTargetId(null);
            setIsInboxLoading(false);
            setPublishedPostsLoading(false);
        }
    }, [fetchWithPagination, saveDataToFirestore, showNotification, scheduledPosts, publishedPosts]);

    useEffect(() => {
        const loadDataAndSync = async () => {
            const dataRef = getTargetDataRef();
            setPublishedPostsLoading(true); setIsInboxLoading(true);

            const docSnap = await dataRef.get();
            let loadedProfile: PageProfile = initialPageProfile;

            if (docSnap.exists) {
                const data = docSnap.data()!;
                loadedProfile = { ...initialPageProfile, ...(data.pageProfile || {}) };
                setDrafts(data.drafts || []);
            }
            
            if (isAdmin || loadedProfile.ownerUid === user.uid) {
                setCurrentUserRole('owner');
            } else {
                setCurrentUserRole(loadedProfile.team?.find(m => m.uid === user.uid)?.role || 'viewer');
            }
            
            setPageProfile(loadedProfile);
            await syncFacebookData(managedTarget);
        };
        loadDataAndSync();
    }, [managedTarget.id, user.uid, isAdmin, getTargetDataRef, syncFacebookData]);

    const handlePublish = async (postType: PostType) => { /* ... */ };
    const handleSaveDraft = async () => { /* ... */ };
    const handleEditScheduledPost = (postId: string) => { /* ... */ };
    const handleDeleteScheduledPost = (postId: string) => { /* ... */ };
    const handleApprovePost = (postId: string) => { /* ... */ };
    const handleRejectPost = (postId: string) => { /* ... */ };
    const handleLoadDraft = (draftId: string) => { /* ... */ };
    const handleDeleteDraft = (draftId: string) => { /* ... */ };
    const onGeneratePerformanceSummary = async () => { /* ... */ };
    const onGenerateDeepAnalytics = async () => { /* ... */ };
    const onFetchPostInsights = async (postId: string): Promise<any> => { return null; };
      
      const renderView = () => {
          switch (view) {
              case 'composer': return <PostComposer onPublish={handlePublish} onSaveDraft={handleSaveDraft} isPublishing={isPublishing} postText={postText} onPostTextChange={setPostText} onImageChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)} onImageGenerated={setSelectedImage} onImageRemove={() => setSelectedImage(null)} imagePreview={imagePreview} selectedImage={selectedImage} isScheduled={isScheduled} onIsScheduledChange={setIsScheduled} scheduleDate={scheduleDate} onScheduleDateChange={setScheduleDate} error={composerError} aiClient={aiClient} stabilityApiKey={stabilityApiKey} managedTarget={managedTarget} linkedInstagramTarget={linkedInstagramTarget} includeInstagram={includeInstagram} onIncludeInstagramChange={setIncludeInstagram} pageProfile={pageProfile} editingScheduledPostId={editingScheduledPostId} role={currentUserRole} userPlan={userPlan} />;
              case 'calendar': return <ContentCalendar posts={scheduledPosts} onEdit={handleEditScheduledPost} onDelete={handleDeleteScheduledPost} managedTarget={managedTarget} userPlan={userPlan} role={currentUserRole} onApprove={handleApprovePost} onReject={handleRejectPost} onSync={() => syncFacebookData(managedTarget)} isSyncing={!!syncingTargetId} />;
              case 'drafts': return <DraftsList drafts={drafts} onLoad={handleLoadDraft} onDelete={handleDeleteDraft} role={currentUserRole} />;
              case 'inbox': return <InboxPage items={inboxItems} isLoading={isInboxLoading} onReply={async () => true} onMarkAsDone={() => {}} onLike={async () => {}} onGenerateSmartReplies={async () => []} onFetchMessageHistory={() => {}} autoResponderSettings={{rules: [], fallback: {mode: 'off'}}} onAutoResponderSettingsChange={() => {}} onSync={() => syncFacebookData(managedTarget)} isSyncing={!!syncingTargetId} aiClient={aiClient} role={currentUserRole} repliedUsersPerPost={{}} currentUserRole={currentUserRole} selectedTarget={managedTarget} />;
              case 'analytics': return <AnalyticsPage publishedPosts={publishedPosts} publishedPostsLoading={publishedPostsLoading} analyticsPeriod={analyticsPeriod} setAnalyticsPeriod={setAnalyticsPeriod} performanceSummaryData={performanceSummaryData} performanceSummaryText={performanceSummaryText} isGeneratingSummary={isGeneratingSummary} audienceGrowthData={audienceGrowthData} heatmapData={heatmapData} contentTypeData={contentTypeData} isGeneratingDeepAnalytics={isGeneratingDeepAnalytics} managedTarget={managedTarget} userPlan={userPlan} currentUserRole={currentUserRole} onGeneratePerformanceSummary={onGeneratePerformanceSummary} onGenerateDeepAnalytics={onGenerateDeepAnalytics} onFetchPostInsights={onFetchPostInsights} />;
              case 'profile': return <PageProfilePage profile={pageProfile} onProfileChange={handlePageProfileChange} isFetchingProfile={isFetchingProfile} onFetchProfile={handleFetchProfile} role={currentUserRole} user={user} />;
              case 'ads': return <AdsManagerPage selectedTarget={managedTarget} role={currentUserRole} />;
              default: return <div className="p-8 text-center">اختر قسمًا من القائمة للبدء.</div>;
          }
      };

      return (
        <>
          <Header pageName={managedTarget.name} onChangePage={onChangePage} onLogout={onLogout} onSettingsClick={onSettingsClick} theme={theme} onToggleTheme={onToggleTheme} />
          {notification && <div className={`fixed bottom-4 right-4 p-4 rounded-md text-white text-sm z-50 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.message}</div>}
          <div className="flex flex-col md:flex-row min-h-[calc(100vh-68px)]">
            <aside className="w-full md:w-64 bg-white dark:bg-gray-800 p-4 border-r dark:border-gray-700/50 flex-shrink-0">
              <nav className="space-y-2">
                 <NavItem icon={<PencilSquareIcon className="w-5 h-5" />} label="إنشاء منشور" active={view === 'composer'} onClick={() => setView('composer')} />
                 <NavItem icon={<QueueListIcon className="w-5 h-5" />} label="الجدولة المجمعة" active={view === 'bulk'} onClick={() => setView('bulk')} disabled={currentUserRole==='viewer'} />
                 <NavItem icon={<BrainCircuitIcon className="w-5 h-5" />} label="استراتيجيات المحتوى" active={view === 'planner'} onClick={() => setView('planner')} disabled={currentUserRole==='viewer'}/>
                 <NavItem icon={<CalendarIcon className="w-5 h-5" />} label="تقويم المحتوى" active={view === 'calendar'} onClick={() => setView('calendar')} />
                 <NavItem icon={<ArchiveBoxIcon className="w-5 h-5" />} label="المسودات" active={view === 'drafts'} onClick={() => setView('drafts')} />
                 <NavItem icon={<InboxArrowDownIcon className="w-5 h-5" />} label="صندوق الوارد" active={view === 'inbox'} onClick={() => setView('inbox')} notificationCount={inboxItems.filter(i => i.status === 'new').length} />
                 <NavItem icon={<ChartBarIcon className="w-5 h-5" />} label="التحليلات" active={view === 'analytics'} onClick={() => setView('analytics')} />
                 <NavItem icon={<BriefcaseIcon className="w-5 h-5" />} label="مدير الإعلانات" active={view === 'ads'} onClick={() => setView('ads')} />
                 <NavItem icon={<UserCircleIcon className="w-5 h-5" />} label="ملف الصفحة" active={view === 'profile'} onClick={() => setView('profile')} />
              </nav>
              <div className="mt-8 pt-4 border-t dark:border-gray-700">
                    <Button onClick={() => syncFacebookData(managedTarget)} isLoading={!!syncingTargetId} variant="secondary" className="w-full" disabled={currentUserRole === 'viewer'}>
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
