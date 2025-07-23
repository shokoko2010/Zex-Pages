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
import { generateContentPlan, generatePerformanceSummary, generatePostInsights, generateBestPostingTimesHeatmap, generateContentTypePerformance, generatePostSuggestion, generateImageFromPrompt, generateHashtags, generateDescriptionForImage } from '../services/geminiService';
import { generateImageWithStabilityAI } from '../services/stabilityai';


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
  allUsers: AppUser[];
  managedTarget: Target;
  allTargets: Target[];
  onChangePage: () => void;
  onLogout: () => void;
  isSimulationMode: boolean;
  aiClient: any; // GoogleGenAI | null
  stabilityApiKey: string | null;
  onSettingsClick: () => void;
  fetchWithPagination: (path: string, accessToken?: string) => Promise<any[]>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  fbAccessToken: string | null; // <--- أضف هذا السطر
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
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors text-right ${active ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={disabled}>
        {icon}
        <span className="flex-grow">{label}</span>
        {notificationCount && notificationCount > 0 ? (<span className="bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{notificationCount}</span>) : null}
    </button>
);

const initialPageProfile: PageProfile = { description: '', services: '', contactInfo: '', website: '', links: [], currentOffers: '', address: '', country: '', language: 'ar', contentGenerationLanguages: ['ar'], ownerUid: '', team: [], members: [] };


const DashboardPage: React.FC<DashboardPageProps> = ({ user, isAdmin, userPlan, managedTarget, allTargets, onChangePage, onLogout, aiClient, stabilityApiKey, onSettingsClick, fetchWithPagination, theme, onToggleTheme, strategyHistory, onDeleteStrategy, onSavePlan }) => {
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
    const [bulkPosts, setBulkPosts] = useState<BulkPostItem[]>([]); 
    const [schedulingStrategy, setSchedulingStrategy] = useState<'even' | 'weekly'>('even'); 
    const [weeklyScheduleSettings, setWeeklyScheduleSettings] = useState<WeeklyScheduleSettings>({ days: [1, 3, 5], time: '19:00' });
    const [contentPlan, setContentPlan] = useState<ContentPlanItem[] | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isSchedulingStrategy, setIsSchedulingStrategy] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);

    const linkedInstagramTarget = useMemo(() => allTargets.find(t => t.type === 'instagram' && t.parentPageId === managedTarget.id) || null, [managedTarget, allTargets]);
    const bulkSchedulerTargets = useMemo(() => [managedTarget, ...(linkedInstagramTarget ? [linkedInstagramTarget] : [])], [managedTarget, linkedInstagramTarget]);

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
    
    const clearComposer = useCallback(() => {
      setPostText('');
      setSelectedImage(null);
      setImagePreview(null);
      setIsScheduled(false);
      setScheduleDate('');
      setComposerError('');
      setIncludeInstagram(false);
      setEditingScheduledPostId(null);
    }, [setPostText, setSelectedImage, setImagePreview, setIsScheduled, setScheduleDate, setComposerError, setIncludeInstagram, setEditingScheduledPostId]);

    const handlePageProfileChange = (newProfile: PageProfile) => {
      setPageProfile(newProfile);
      saveDataToFirestore({ pageProfile: newProfile });
    };

    const handleFetchProfile = async () => {
        setIsFetchingProfile(true);
        showNotification('partial', 'جاري جلب بيانات الصفحة من فيسبوك...');
        // Simulate fetching profile data - replace with actual FB API call if available
        await new Promise(res => setTimeout(res, 1500));
        showNotification('success', 'تم تحديث ملف الصفحة (محاكاة).');
        setIsFetchingProfile(false);
    };

    const syncFacebookData = useCallback(async (target: Target) => {
        if (!target.access_token) { showNotification('error', 'رمز الوصول للصفحة مفقود.'); return; }
        setSyncingTargetId(target.id);
        showNotification('partial', `جاري مزامنة بيانات ${target.name}...`);
        
        try {
            // **FIXED Facebook API fields request for attachments (removed problematic fields, added compatible ones)**
            // Added `source` for videos/other media, `src` for images within media
            const postFields = "id,message,created_time,likes.summary(true),comments.summary(true),shares,attachments{media{image{src},source},target{url},type}";
            const feedFields = "comments.limit(10){from,message,created_time,id},message,link,from,attachments{media{image{src},source},target{url},type}";
            const convoFields = "participants,messages.limit(1){from,to,message,created_time}";

            const [fbScheduled, fbPublished, fbFeed, fbConvos] = await Promise.all([
                 fetchWithPagination(`/${target.id}/scheduled_posts?fields=${postFields}`, target.access_token),
                 fetchWithPagination(`/${target.id}/published_posts?fields=${postFields}`, target.access_token),
                 fetchWithPagination(`/${target.id}/feed?fields=${feedFields}`, target.access_token),
                 fetchWithPagination(`/${target.id}/conversations?fields=${convoFields}`, target.access_token)
            ]);
            
            // Helper to get image URL from various attachment structures
            const getImageUrl = (post: any) => {
                const attachment = post.attachments?.data?.[0];
                if (!attachment) return undefined;
                if (attachment.media?.image?.src) return attachment.media.image.src; // Standard image URL
                if (attachment.media?.source) return attachment.media.source; // Video thumbnail (source URL)
                 if (attachment.subattachments?.data?.[0]?.media?.image?.src) return attachment.subattachments.data[0].media.image.src; // Album first image
                return undefined;
            };

            const finalScheduled = fbScheduled.map((post: any) => ({
                id: post.id, text: post.message || '', scheduledAt: new Date(post.scheduled_publish_time * 1000),
                imageUrl: getImageUrl(post), hasImage: !!getImageUrl(post), targetId: target.id,
                targetInfo: { name: target.name, avatarUrl: target.picture.data.url, type: target.type },
                status: 'scheduled', isReminder: false, type: 'post'
            } as ScheduledPost));
            setScheduledPosts(finalScheduled);

            const finalPublished = fbPublished.map((post: any) => ({
                id: post.id, text: post.message || '', publishedAt: new Date(post.created_time),
                imagePreview: getImageUrl(post),
                analytics: { likes: post.likes?.summary?.total_count || 0, comments: post.comments?.summary?.total_count || 0, shares: post.shares?.count || 0, lastUpdated: new Date().toISOString() },
                pageId: target.id, pageName: target.name, pageAvatarUrl: target.picture.data.url,
            } as PublishedPost));
            setPublishedPosts(finalPublished);

            const newInbox: InboxItem[] = [];
            fbFeed.forEach((post: any) => {
                if(post.comments) post.comments.data.forEach((comment: any) => {
                    if (comment.from.id !== target.id) newInbox.push({
                        id: comment.id, type: 'comment', from: comment.from, text: comment.message,
                        timestamp: comment.created_time, status: 'new', link: post.link,
                        post: { message: post.message, picture: getImageUrl(post) }, // Use getImageUrl for post picture
                        authorName: comment.from.name, authorPictureUrl: `https://graph.facebook.com/${comment.from.id}/picture?type=normal`
                    } as InboxItem);
                });
            });
            fbConvos.forEach((convo: any) => {
                const lastMsg = convo.messages?.data?.[0];
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

            // Save to Firestore using the local variables
            await saveDataToFirestore({
                scheduledPosts: finalScheduled.map(p => ({...p, scheduledAt: p.scheduledAt.toISOString()})),
                publishedPosts: finalPublished.map(p => ({...p, publishedAt: p.publishedAt.toISOString()})),
                inboxItems: newInbox, lastSync: new Date().toISOString()
            });
            showNotification('success', 'تمت المزامنة بنجاح!');
        } catch (error: any) {
            showNotification('error', `فشل المزامنة: ${error.message}`);
            console.error("Facebook Sync Error details:", error); // Log detailed error
        } finally {
            setSyncingTargetId(null);
            setIsInboxLoading(false);
            setPublishedPostsLoading(false);
        }
    }, [fetchWithPagination, saveDataToFirestore, showNotification]); // Removed scheduledPosts, publishedPosts from dependency array since they are derived within the function

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
                // Also load scheduled and published posts from Firestore initially
                setScheduledPosts(data.scheduledPosts?.map((p: any) => ({...p, scheduledAt: new Date(p.scheduledAt)})) || []);
                setPublishedPosts(data.publishedPosts?.map((p:any) => ({...p, publishedAt: new Date(p.publishedAt)})) || []);
                setInboxItems(data.inboxItems || []);
                setPerformanceSummaryData(data.performanceSummaryData || null);
                setPerformanceSummaryText(data.performanceSummaryText || '');
                setAudienceGrowthData(data.audienceGrowthData || []);
                setHeatmapData(data.heatmapData || []);
                setContentTypePerformanceData(data.contentTypeData || []);
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
    }, [managedTarget.id, user.uid, isAdmin, getTargetDataRef, syncFacebookData]); // Dependencies adjusted


    const handlePublish = async (postType: PostType) => {
        setComposerError('');
        if (!managedTarget.access_token) {
            setComposerError('رمز الوصول للصفحة غير صالح. حاول إعادة المزامنة أو المصادقة.');
            showNotification('error', 'رمز الوصول للصفحة غير صالح.');
            return;
        }
        setIsPublishing(true);

        try {
            // Basic publishing logic (you'll need to replace this with actual API calls)
            console.log(`Attempting to publish type ${postType}:`, { text: postText, image: selectedImage, scheduled: isScheduled, date: scheduleDate });
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

            showNotification('success', `تم ${isScheduled ? 'جدولة' : 'نشر'} المنشور بنجاح!`);
            clearComposer();
            await syncFacebookData(managedTarget); // Re-sync after publishing
        } catch (error: any) {
            setComposerError(`فشل النشر: ${error.message}`);
            showNotification('error', `فشل النشر: ${error.message}`);
        } finally {
            setIsPublishing(false);
        }
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

        showNotification('success', 'تم حفظ المسودة بنجاح! ملاحظة: يجب إعادة تحديد الصورة عند التحميل.');
        clearComposer();
    };

    const handleEditScheduledPost = (postId: string) => {
        const postToEdit = scheduledPosts.find(p => p.id === postId);
        if (postToEdit) {
            clearComposer();
            setPostText(postToEdit.text);
            setIsScheduled(true);
            const date = new Date(postToEdit.scheduledAt);
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            setScheduleDate(date.toISOString().slice(0, 16));
            setEditingScheduledPostId(postId);
            if (postToEdit.imageUrl) {
                setImagePreview(postToEdit.imageUrl);
            } else {
                setImagePreview(null);
            }
            setView('composer');
            showNotification('success', 'تم تحميل المنشور المجدول للتعديل.');
        }
    };

    const handleDeleteScheduledPost = async (postId: string) => {
        // Simulate deletion
        await new Promise(resolve => setTimeout(resolve, 500));
        const updatedScheduled = scheduledPosts.filter(p => p.id !== postId);
        setScheduledPosts(updatedScheduled);
        await saveDataToFirestore({ scheduledPosts: updatedScheduled.map(p => ({...p, scheduledAt: p.scheduledAt.toISOString()})) });
        showNotification('success', 'تم حذف المنشور المجدول.');
        await syncFacebookData(managedTarget); // Re-sync after deletion
    };

    const handleApprovePost = (postId: string) => {
        showNotification('partial', `الموافقة على المنشور ${postId} (محاكاة)...`);
        // Implement actual approval logic
    };

    const handleRejectPost = (postId: string) => {
        showNotification('partial', `رفض المنشور ${postId} (محاكاة)...`);
        // Implement actual rejection logic
    };

    const handleLoadDraft = (draftId: string) => {
        const draft = drafts.find(d => d.id === draftId);
        if (draft) {
            setPostText(draft.text);
            if (draft.hasImage && draft.imagePreview) {
                setImagePreview(draft.imagePreview);
                showNotification('partial', 'تم تحميل نص المسودة. إذا كانت تحتوي على صورة، يرجى إعادة تحديدها للنشر الفعلي.');
            } else {
                setImagePreview(null);
                showNotification('success', 'تم تحميل المسودة.');
            }
            const updatedDrafts = drafts.filter(d => d.id !== draftId);
            setDrafts(updatedDrafts);
            saveDataToFirestore({ drafts: updatedDrafts });
            setView('composer');
        }
    };

    const handleDeleteDraft = async (draftId: string) => {
        const updatedDrafts = drafts.filter(d => d.id !== draftId);
        setDrafts(updatedDrafts);
        await saveDataToFirestore({ drafts: updatedDrafts });
        showNotification('success', 'تم حذف المسودة.');
    };

    const onGeneratePerformanceSummary = async () => {
        if (!aiClient || !publishedPosts.length) {
            showNotification('error', 'لا توجد بيانات أو عميل AI لإنشاء الملخص.');
            return;
        }
        setIsGeneratingSummary(true);
        try {
            // Implement actual summary generation using AI
            const mockSummary: PerformanceSummaryData = {
                 totalPosts: publishedPosts.length, averageEngagement: 0, growthRate: 0,
                 totalReach: 0, totalEngagement: 0, engagementRate: 0, topPosts: [], postCount: publishedPosts.length
            }; // Replace with actual calculation for a proper summary
            setPerformanceSummaryData(mockSummary);
            const summary = await generatePerformanceSummary(aiClient, mockSummary, pageProfile, analyticsPeriod);
            setPerformanceSummaryText(summary);
            await saveDataToFirestore({ performanceSummaryText: summary, performanceSummaryData: mockSummary });
            showNotification('success', 'تم توليد ملخص الأداء.');
        } catch (e: any) {
            showNotification('error', `فشل توليد ملخص الأداء: ${e.message}`);
        } finally {
            setIsGeneratingSummary(false);
        }
    };

    const onGenerateDeepAnalytics = async () => {
        if (!aiClient || !publishedPosts.length) {
            showNotification('error', 'لا توجد بيانات أو عميل AI لإنشاء تحليلات معمقة.');
            return;
        }
        setIsGeneratingDeepAnalytics(true);
        showNotification('partial', 'جاري إنشاء تحليلات معمقة، قد يستغرق الأمر دقيقة...');
        try {
            // Implement actual deep analytics generation using AI
            const [heatmap, contentType] = await Promise.all([
                generateBestPostingTimesHeatmap(aiClient, publishedPosts), // Placeholder
                generateContentTypePerformance(aiClient, publishedPosts) // Placeholder
            ]);
            setHeatmapData(heatmap);
            setContentTypePerformanceData(contentType);
            await saveDataToFirestore({ heatmapData: heatmap, contentTypeData: contentType });
            showNotification('success', 'تم إنشاء التحليلات المعمقة بنجاح!');
        } catch(e: any) {
            showNotification('error', `فشل في إنشاء التحليلات المعمقة: ${e.message}`);
        } finally {
            setIsGeneratingDeepAnalytics(false);
        }
    };

    const onFetchPostInsights = async (postId: string): Promise<any> => {
        const post = publishedPosts.find(p => p.id === postId);
        if (!aiClient || !post) return null;
        try {
            // Implement actual insights fetching (e.g., fetching comments for this post)
            const commentsForInsights: { message: string }[] = []; // Fetch actual comments for the post
            const insights = await generatePostInsights(aiClient, post.text, post.analytics, commentsForInsights);
            showNotification('success', 'تم جلب رؤى المنشور.');
            return insights;
        } catch (e: any) {
            showNotification('error', `فشل في جلب رؤى المنشور: ${e.message}`);
            return null;
        }
    };

    // Bulk Scheduler Functions
    const onSchedulingStrategyChange = (strategy: 'even' | 'weekly') => setSchedulingStrategy(strategy);
    const onWeeklyScheduleSettingsChange = (settings: WeeklyScheduleSettings) => setWeeklyScheduleSettings(settings);

    const onReschedule = () => {
        showNotification('partial', 'وظيفة إعادة الجدولة (محاكاة).');
        // Implement actual rescheduling logic here
    };

    const onAddPosts = (files: FileList | null, textContent?: string) => {
        if (files) {
            const newPosts: BulkPostItem[] = Array.from(files).map((file, index) => ({
                id: `bulk_${Date.now()}_${index}`, text: '', imageFile: file,
                imagePreview: URL.createObjectURL(file), hasImage: true, scheduleDate: '',
                targetIds: [managedTarget.id],
            }));
            setBulkPosts(prev => [...prev, ...newPosts]);
            showNotification('success', `تمت إضافة ${newPosts.length} منشورات للجدولة المجمعة.`);
        } else if (textContent) {
            const newTextPost: BulkPostItem = {
                id: `bulk_${Date.now()}_text_${Math.random()}`, text: textContent, hasImage: false,
                scheduleDate: '', targetIds: [managedTarget.id],
            };
            setBulkPosts(prev => [...prev, newTextPost]);
            showNotification('success', 'تمت إضافة منشور نصي للجدولة المجمعة.');
        }
    };

    const onUpdatePost = (id: string, updates: Partial<BulkPostItem>) => {
        setBulkPosts(prev => prev.map(post => post.id === id ? { ...post, ...updates } : post));
        showNotification('partial', 'تم تحديث منشور في الجدولة المجمعة.');
    };

    const onRemovePost = (id: string) => {
        setBulkPosts(prev => prev.filter(post => post.id !== id));
        showNotification('partial', 'تم حذف منشور من الجدولة المجمعة.');
    };

    const onGeneratePostFromText = async (id: string, text: string) => {
        if (!aiClient || !text.trim()) { showNotification('error', 'الذكاء الاصطناعي غير متاح أو النص فارغ.'); return; }
        showNotification('partial', 'جاري توليد نص المنشور...');
        try {
            const generatedText = await generatePostSuggestion(aiClient, text, pageProfile);
            onUpdatePost(id, { text: generatedText });
            showNotification('success', 'تم توليد نص المنشور بالذكاء الاصطادي.');
        } catch (e: any) { showNotification('error', `فشل توليد النص: ${e.message}`); }
    };

    const onGenerateImageFromText = async (id: string, text: string, service: 'gemini' | 'stability') => {
        if (!text.trim() || (!aiClient && !stabilityApiKey)) { showNotification('error', 'الذكاء الاصطناعي غير متاح أو النص فارغ.'); return; }
         showNotification('partial', 'جاري توليد الصورة...');
        try {
            let base64Bytes;
            if (service === 'stability' && stabilityApiKey) {
                base64Bytes = await generateImageWithStabilityAI(stabilityApiKey, text, 'Photographic', '1:1', 'stable-diffusion-v1-6', aiClient);
            } else if (aiClient) {
                base64Bytes = await generateImageFromPrompt(aiClient, text, 'Photographic', '1:1');
            } else {
                throw new Error("خدمة توليد الصور غير متاحة.");
            }
            const file = new File([new Blob([Uint8Array.from(atob(base64Bytes), char => char.charCodeAt(0))], { type: 'image/jpeg' })], `img_${Date.now()}.jpeg`, { type: 'image/jpeg' });
            onUpdatePost(id, { imageFile: file, imagePreview: URL.createObjectURL(file), hasImage: true });
            showNotification('success', `تم توليد الصورة باستخدام ${service === 'gemini' ? 'Gemini' : 'Stability AI'}.`);
        } catch (e: any) { showNotification('error', `فشل توليد الصورة: ${e.message}`); }
    };

    const onGeneratePostFromImage = async (id: string, imageFile: File) => {
        if (!aiClient || !imageFile) { showNotification('error', 'الذكاء الاصطناعي غير متاح أو الصورة مفقودة.'); return; }
        showNotification('partial', 'جاري توليد نص من الصورة...');
        try {
            const description = await generateDescriptionForImage(aiClient, imageFile, pageProfile);
            onUpdatePost(id, { text: description });
            showNotification('success', 'تم توليد نص من الصورة.');
        } catch (e: any) { showNotification('error', `فشل توليد النص من الصورة: ${e.message}`); }
    };

    const onAddImageManually = (id: string, file: File) => {
        onUpdatePost(id, { imageFile: file, imagePreview: URL.createObjectURL(file), hasImage: true });
        showNotification('partial', 'تمت إضافة الصورة يدويًا.');
    };

    const onScheduleAll = async () => {
        // Implement actual scheduling logic for bulk posts
        showNotification('partial', 'جاري جدولة جميع المنشورات المجمعة...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setBulkPosts([]); // Clear after scheduling
        await syncFacebookData(managedTarget); // Re-sync
        showNotification('success', 'تمت جدولة جميع المنشورات المجمعة بنجاح!');
    };

    // Content Planner Functions
    const onGeneratePlan = async (request: StrategyRequest, images?: any[]) => {
        if (!aiClient) { setPlanError('عميل الذكاء الاصطناعي غير مكوّن.'); showNotification('error', 'عميل الذكاء الاصطناعي غير مكوّن.'); return; }
        setIsGeneratingPlan(true); setPlanError(null);
         showNotification('partial', 'جاري إنشاء خطة المحتوى...');
        try {
            const generatedPlan = await generateContentPlan(aiClient, request, pageProfile, images);
            setContentPlan(generatedPlan);
            await onSavePlan(managedTarget.id, generatedPlan, request); // Assuming onSavePlan is correctly implemented
            showNotification('success', 'تم إنشاء الخطة وحفظها في السجل بنجاح!');
        } catch (e: any) {
            setPlanError(e.message || 'فشل إنشاء الخطة');
            showNotification('error', `فشل إنشاء الخطة: ${e.message}`);
        } finally { setIsGeneratingPlan(false); }
    };

     // This function needs to match the expected signature by ContentPlannerPage
     const onScheduleStrategy = async () => {
         showNotification('partial', 'جاري جدولة الاستراتيجية...');
         // Implement actual scheduling logic for the current contentPlan
         // This would likely involve iterating through contentPlan and creating scheduled posts
         await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate async operation
         showNotification('success', 'تمت جدولة الاستراتيجية (محاكاة).');
         // Potentially re-sync scheduled posts
         await syncFacebookData(managedTarget);
     };

     // This function needs to match the expected signature by ContentPlannerPage
     const onDeleteFromHistory = async (strategyId: string) => { // Assuming ContentPlannerPage passes strategyId
          showNotification('partial', `جاري حذف الاستراتيجية ${strategyId} من السجل...`);
          await onDeleteStrategy(managedTarget.id, strategyId); // Call the original delete function
          showNotification('success', `تم حذف الاستراتيجية ${strategyId} من السجل.`);
     };

     const onStartPost = (planItem: ContentPlanItem) => {
      setPostText(`${planItem.hook}\n\n${planItem.headline}\n\n${planItem.body}`);
      setView('composer');
      showNotification('partial', 'تم تحميل نص الخطة في محرر المنشورات.');
  };  

  const onLoadFromHistory = (plan: ContentPlanItem[]) => {
    setContentPlan(plan);
    showNotification('success', 'تم تحميل الخطة من السجل.');
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
                  <PostPreview 
                      postText={postText} imagePreview={imagePreview} 
                      type={includeInstagram && linkedInstagramTarget ? 'instagram' : 'facebook'}
                      pageName={managedTarget.name} pageAvatar={managedTarget.picture.data.url} 
                  />
              </div>
          );
      case 'calendar': 
          return (
              <ContentCalendar 
                  posts={scheduledPosts} onEdit={handleEditScheduledPost} onDelete={handleDeleteScheduledPost}
                  managedTarget={managedTarget} userPlan={userPlan} role={currentUserRole}
                  onApprove={handleApprovePost} onReject={handleRejectPost}
                  onSync={() => syncFacebookData(managedTarget)} isSyncing={!!syncingTargetId} 
              />
          );
      case 'drafts': 
          return (
              <DraftsList 
                  drafts={drafts} onLoad={handleLoadDraft} onDelete={handleDeleteDraft} 
                  role={currentUserRole} 
              />
          );
          case 'bulk': 
          return (
              <BulkSchedulerPage 
                  bulkPosts={bulkPosts} onSchedulingStrategyChange={onSchedulingStrategyChange}
                  onWeeklyScheduleSettingsChange={onWeeklyScheduleSettingsChange} onReschedule={onReschedule}
                  onAddPosts={onAddPosts} onUpdatePost={onUpdatePost} onRemovePost={onRemovePost}
                  onGeneratePostFromText={onGeneratePostFromText} onGenerateImageFromText={onGenerateImageFromText}
                  onGeneratePostFromImage={onGeneratePostFromImage} onAddImageManually={onAddImageManually}
                  onScheduleAll={onScheduleAll} targets={bulkSchedulerTargets} aiClient={aiClient}
                  stabilityApiKey={stabilityApiKey} isSchedulingAll={false} // Adjust as needed
                  schedulingStrategy={schedulingStrategy} weeklyScheduleSettings={weeklyScheduleSettings}
                  role={currentUserRole} showNotification={showNotification} 
                  pageProfile={pageProfile} // <--- هذا هو السطر المضاف لحل المشكلة
              />
          );
      case 'planner': 
          return (
              <ContentPlannerPage 
                  plan={contentPlan} isGenerating={isGeneratingPlan} strategyHistory={strategyHistory}
                  isSchedulingStrategy={false} error={planError} role={currentUserRole} // isSchedulingStrategy and error might need actual states
                  onScheduleStrategy={async () => { showNotification('partial', 'وظيفة جدولة الاستراتيجية (محاكاة).'); }} // Placeholder async function
                  aiClient={aiClient} onGeneratePlan={onGeneratePlan} onStartPost={onStartPost}
                  pageProfile={pageProfile} onLoadFromHistory={onLoadFromHistory}
                  onDeleteFromHistory={async (id: string) => { await onDeleteStrategy(managedTarget.id, id); showNotification('success', 'تم حذف الاستراتيجية من السجل.'); }} // Corrected onDeleteFromHistory
              />
          );
      case 'inbox': 
          return (
              <InboxPage 
                  items={inboxItems} isLoading={isInboxLoading} 
                  onReply={async (item, message) => { showNotification('partial', `الرد على ${item.authorName}: ${message} (محاكاة)`); return true; }} // Placeholder
                  onMarkAsDone={(itemId) => { showNotification('partial', `تمييز ${itemId} كمكتمل (محاكاة)`); }} // Placeholder
                  onLike={async (itemId) => { showNotification('partial', `إعجاب بـ ${itemId} (محاكاة)`); }} // Placeholder
                  onGenerateSmartReplies={async (text) => { return ['شكراً لك!', 'مرحباً بك!', 'سأراجع هذا.']; }} // Placeholder
                  onFetchMessageHistory={() => { showNotification('partial', 'جلب سجل الرسائل (محاكاة).'); }} // Placeholder
                  autoResponderSettings={{ rules: [], fallback: { mode: 'off', staticMessage: '' } }} // Placeholder
                  onAutoResponderSettingsChange={() => { showNotification('partial', 'تغيير إعدادات الرد التلقائي (محاكاة).'); }} // Placeholder
                  onSync={() => syncFacebookData(managedTarget)} isSyncing={!!syncingTargetId}
                  aiClient={aiClient} role={currentUserRole} repliedUsersPerPost={{}} // Pass empty object if not used
                  currentUserRole={currentUserRole} selectedTarget={managedTarget}
              />
          );
      case 'analytics': 
          return (
              <AnalyticsPage 
                  publishedPosts={publishedPosts} publishedPostsLoading={publishedPostsLoading}
                  analyticsPeriod={analyticsPeriod} setAnalyticsPeriod={setAnalyticsPeriod}
                  performanceSummaryData={performanceSummaryData} performanceSummaryText={performanceSummaryText}
                  isGeneratingSummary={isGeneratingSummary} audienceGrowthData={audienceGrowthData}
                  heatmapData={heatmapData} contentTypeData={contentTypeData}
                  isGeneratingDeepAnalytics={isGeneratingDeepAnalytics} managedTarget={managedTarget}
                  userPlan={userPlan} currentUserRole={currentUserRole}
                  onGeneratePerformanceSummary={onGeneratePerformanceSummary}
                  onGenerateDeepAnalytics={onGenerateDeepAnalytics} onFetchPostInsights={onFetchPostInsights} 
              />
          );
      case 'profile': 
          return (
              <PageProfilePage 
                  profile={pageProfile} onProfileChange={handlePageProfileChange}
                  isFetchingProfile={isFetchingProfile} onFetchProfile={handleFetchProfile}
                  role={currentUserRole} user={user} 
              />
          );
      case 'ads': 
          return (
              <AdsManagerPage 
                  selectedTarget={managedTarget} role={currentUserRole} 
              />
          );
      default: 
          return <div className="p-8 text-center text-gray-500 dark:text-gray-400">اختر قسمًا من القائمة للبدء.</div>;
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
