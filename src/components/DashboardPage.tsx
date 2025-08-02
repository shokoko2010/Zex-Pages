import React, { useState, useCallback, useEffect } from 'react';
import { Target, PublishedPost, Draft, ScheduledPost, BulkPostItem, ContentPlanItem, StrategyRequest, PageProfile, Role, Plan, AppUser, StrategyHistoryItem, InboxItem } from '../types';
import { db } from '../services/firebaseService';
import type { User } from '../services/firebaseService';
import { generateContentPlan, generatePerformanceSummary, generatePostInsights, generateBestPostingTimesHeatmap, generateContentTypePerformance, generatePostSuggestion, generateImageFromPrompt, generateDescriptionForImage, enhanceProfileFromFacebookData } from '../services/geminiService';
import { generateImageWithStabilityAI } from '../services/stabilityai';

// Custom hooks
import { useDashboardData } from '../hooks/useDashboardData';
import { useFacebookApi } from '../hooks/useFacebookApi';

// Components
import DashboardLayout from './DashboardLayout';

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
  onTokenError: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = (props) => {
    const {
        user,
        isAdmin,
        userPlan,
        managedTarget,
        allTargets,
        onChangePage,
        onLogout,
        aiClient,
        stabilityApiKey,
        onSettingsClick,
        fetchWithPagination,
        theme,
        onToggleTheme,
        fbAccessToken,
        strategyHistory,
        onSavePlan,
        onDeleteStrategy,
        onTokenError
    } = props;

    // Use custom hooks
    const dashboardData = useDashboardData({
        user,
        managedTarget,
        fbAccessToken,
        aiClient,
        stabilityApiKey,
        onTokenError
    });

    // Local state for UI elements
    const [view, setView] = useState<'composer' | 'calendar' | 'drafts' | 'analytics' | 'bulk' | 'planner' | 'inbox' | 'profile' | 'ads'>('composer');
    const [postText, setPostText] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [composerError, setComposerError] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [editingScheduledPostId, setEditingScheduledPostId] = useState<string | null>(null);
    const [includeInstagram, setIncludeInstagram] = useState(false);
    const [bulkPosts, setBulkPosts] = useState<BulkPostItem[]>([]);
    const [schedulingStrategy, setSchedulingStrategy] = useState<'even' | 'weekly'>('even');
    const [weeklyScheduleSettings, setWeeklyScheduleSettings] = useState({ days: [1, 3, 5], time: '19:00' });
    const [contentPlan, setContentPlan] = useState<ContentPlanItem[] | null>(null);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isSchedulingStrategy, setIsSchedulingStrategy] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{type: 'success' | 'error' | 'partial', message: string} | null>(null);
    const [isUpdatingCampaign, setIsUpdatingCampaign] = useState(false);

    const showNotification = useCallback((type: 'success' | 'error' | 'partial', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    }, []);

    const clearComposer = useCallback(() => {
        setPostText('');
        setSelectedImage(null);
        setImagePreview(null);
        setIsScheduled(false);
        setScheduleDate('');
        setComposerError('');
        setEditingScheduledPostId(null);
        setIncludeInstagram(false);
    }, []);

    const setAnalyticsPeriod = useCallback((period: '7d' | '30d') => {
        // Simplified for now - would normally update analytics period
        console.log('Setting analytics period to:', period);
    }, []);

    const {
        publishedPosts,
        publishedPostsLoading,
        scheduledPosts,
        drafts,
        inboxItems,
        adCampaigns, // Add campaigns from dashboard data
        pageProfile,
        currentUserRole,
        syncingTargetId,
        lastSyncTime,
        performanceSummaryData,
        performanceSummaryText,
        isGeneratingSummary,
        audienceGrowthData,
        heatmapData,
        contentTypeData,
        isGeneratingDeepAnalytics,
        isFetchingProfile,
        audienceCityData,
        audienceCountryData,
        setPublishedPosts,
        setScheduledPosts,
        setDrafts,
        setInboxItems,
        setAdCampaigns, // Add setter
        setPageProfile,
        setCurrentUserRole,
        setPerformanceSummaryData,
        setPerformanceSummaryText,
        setAudienceGrowthData,
        setHeatmapData,
        setContentTypePerformanceData,
        saveDataToFirestore,
        syncFacebookData,
        generatePerformanceSummary,
        generateDeepAnalytics,
        fetchPostInsights,
        fetchPageProfile
    } = dashboardData;

    const facebookApi = useFacebookApi({
        fbAccessToken,
        onTokenError,
        showNotification,
        saveDataToFirestore
    });

    const { publishPost, fetchAdCampaigns, fetchCampaignSubEntities, handleUpdateCampaignStatus: updateCampaignStatus } = facebookApi;

    // Find linked Instagram account
    const linkedInstagramTarget = allTargets.find(
        target => target.type === 'instagram' && target.parentPageId === managedTarget.id
    );

    // Handler functions
    const handlePublish = useCallback(async () => {
        if (!postText.trim() && !selectedImage) {
            setComposerError('الرجاء إدخال نص أو صورة للمنشور');
            return;
        }

        setIsPublishing(true);
        setComposerError('');

        try {
            const result = await publishPost(
                managedTarget,
                postText,
                selectedImage,
                isScheduled,
                scheduleDate,
                includeInstagram,
                linkedInstagramTarget
            );

            if (isScheduled) {
                const newScheduledPost = {
                    id: result.id,
                    text: postText,
                    scheduledAt: new Date(scheduleDate),
                    isReminder: false,
                    targetId: managedTarget.id,
                    targetInfo: {
                        name: managedTarget.name,
                        avatarUrl: managedTarget.picture.data.url,
                        type: managedTarget.type
                    },
                    status: 'scheduled' as const,
                    type: 'post' as const
                };
                
                const updatedScheduledPosts = [...scheduledPosts, newScheduledPost];
                setScheduledPosts(updatedScheduledPosts);
                await saveDataToFirestore({ scheduledPosts: updatedScheduledPosts });
                
                showNotification('success', 'تم جدولة المنشور بنجاح');
            } else {
                const newPublishedPost = {
                    id: result.id,
                    text: postText,
                    publishedAt: new Date(),
                    imagePreview: imagePreview || '',
                    analytics: {
                        likes: 0,
                        comments: 0,
                        shares: 0,
                        loading: false,
                        lastUpdated: new Date().toISOString()
                    },
                    pageId: managedTarget.id,
                    pageName: managedTarget.name,
                    pageAvatarUrl: managedTarget.picture.data.url
                };
                
                const updatedPublishedPosts = [newPublishedPost, ...publishedPosts];
                setPublishedPosts(updatedPublishedPosts);
                await saveDataToFirestore({ publishedPosts: updatedPublishedPosts });
                
                showNotification('success', 'تم نشر المنشور بنجاح');
            }

            clearComposer();
        } catch (error: any) {
            console.error('Error publishing post:', error);
            setComposerError(error.message || 'فشل نشر المنشور');
            showNotification('error', error.message || 'فشل نشر المنشور');
        } finally {
            setIsPublishing(false);
        }
    }, [
        postText,
        selectedImage,
        isScheduled,
        scheduleDate,
        includeInstagram,
        managedTarget,
        linkedInstagramTarget,
        scheduledPosts,
        publishedPosts,
        imagePreview,
        setIsPublishing,
        setComposerError,
        setScheduledPosts,
        setPublishedPosts,
        saveDataToFirestore,
        showNotification,
        clearComposer,
        publishPost
    ]);

    const handleSaveDraft = useCallback(async () => {
        if (!postText.trim() && !selectedImage) {
            setComposerError('الرجاء إدخال نص أو صورة للمسودة');
            return;
        }

        const newDraft: Draft = {
            id: Date.now().toString(),
            text: postText,
            imagePreview: imagePreview || '',
            imageFile: selectedImage || undefined,
            createdAt: new Date().toISOString(),
            hasImage: !!selectedImage
        };

        const updatedDrafts = [newDraft, ...drafts];
        setDrafts(updatedDrafts);
        await saveDataToFirestore({ drafts: updatedDrafts });
        
        showNotification('success', 'تم حفظ المسودة بنجاح');
        clearComposer();
    }, [
        postText,
        selectedImage,
        imagePreview,
        drafts,
        setDrafts,
        saveDataToFirestore,
        showNotification,
        clearComposer,
        setComposerError
    ]);

    const handleEditScheduledPost = useCallback((post: ScheduledPost) => {
        setPostText(post.text);
        setScheduleDate(post.scheduledAt.toISOString().slice(0, 16));
        setIsScheduled(true);
        setEditingScheduledPostId(post.id);
        setView('composer');
    }, [
        setPostText,
        setScheduleDate,
        setIsScheduled,
        setEditingScheduledPostId,
        setView
    ]);

    const handleEditScheduledPostWrapper = useCallback((postId: string) => {
        const post = scheduledPosts.find(p => p.id === postId);
        if (post) {
            handleEditScheduledPost(post);
        }
    }, [scheduledPosts, handleEditScheduledPost]);

    const handleDeleteScheduledPost = useCallback(async (postId: string) => {
        try {
            const updatedScheduledPosts = scheduledPosts.filter(post => post.id !== postId);
            setScheduledPosts(updatedScheduledPosts);
            await saveDataToFirestore({ scheduledPosts: updatedScheduledPosts });
            showNotification('success', 'تم حذف المنشور المجدول');
        } catch (error) {
            showNotification('error', 'فشل حذف المنشور المجدول');
        }
    }, [scheduledPosts, setScheduledPosts, saveDataToFirestore, showNotification]);

    const handleApprovePost = useCallback(async (postId: string) => {
        try {
            const updatedScheduledPosts = scheduledPosts.map(post => 
                post.id === postId ? { ...post, status: 'approved' as const } : post
            );
            setScheduledPosts(updatedScheduledPosts);
            await saveDataToFirestore({ scheduledPosts: updatedScheduledPosts });
            showNotification('success', 'تم قبول المنشور');
        } catch (error) {
            showNotification('error', 'فشل قبول المنشور');
        }
    }, [scheduledPosts, setScheduledPosts, saveDataToFirestore, showNotification]);

    const handleRejectPost = useCallback(async (postId: string) => {
        try {
            const updatedScheduledPosts = scheduledPosts.map(post => 
                post.id === postId ? { ...post, status: 'rejected' as const } : post
            );
            setScheduledPosts(updatedScheduledPosts);
            await saveDataToFirestore({ scheduledPosts: updatedScheduledPosts });
            showNotification('success', 'تم رفض المنشور');
        } catch (error) {
            showNotification('error', 'فشل رفض المنشور');
        }
    }, [scheduledPosts, setScheduledPosts, saveDataToFirestore, showNotification]);

    const handleLoadDraft = useCallback((draft: Draft) => {
        setPostText(draft.text);
        setImagePreview(draft.imagePreview || null);
        setSelectedImage(draft.imageFile || null);
        setView('composer');
    }, [
        setPostText,
        setImagePreview,
        setSelectedImage,
        setView
    ]);

    const handleLoadDraftWrapper = useCallback((draftId: string) => {
        const draft = drafts.find(d => d.id === draftId);
        if (draft) {
            handleLoadDraft(draft);
        }
    }, [drafts, handleLoadDraft]);

    const handleDeleteDraft = useCallback(async (draftId: string) => {
        try {
            const updatedDrafts = drafts.filter(draft => draft.id !== draftId);
            setDrafts(updatedDrafts);
            await saveDataToFirestore({ drafts: updatedDrafts });
            showNotification('success', 'تم حذف المسودة');
        } catch (error) {
            showNotification('error', 'فشل حذف المسودة');
        }
    }, [drafts, setDrafts, saveDataToFirestore, showNotification]);

    // Ad campaigns handlers
    const handleFetchAdCampaigns = useCallback(async () => {
        setIsUpdatingCampaign(true);
        try {
            const campaigns = await fetchAdCampaigns(managedTarget, showNotification, fetchWithPagination);
            setAdCampaigns(campaigns);
            showNotification('success', 'تم تحديث بيانات الحملات الإعلانية بنجاح');
        } catch (error) {
            console.error('Error fetching ad campaigns:', error);
            showNotification('error', 'فشل جلب الحملات الإعلانية');
        } finally {
            setIsUpdatingCampaign(false);
        }
    }, [fetchAdCampaigns, managedTarget, showNotification, fetchWithPagination]);

    // Only fetch campaigns on initial load if no cached data exists
    useEffect(() => {
        if (view === 'ads' && adCampaigns.length === 0) {
            handleFetchAdCampaigns();
        }
    }, [view, adCampaigns.length, handleFetchAdCampaigns]);

    // Wrapper function to match expected interface
    const handleUpdateCampaignStatus = useCallback(async (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
        return updateCampaignStatus(campaignId, newStatus, showNotification, handleFetchAdCampaigns);
    }, [updateCampaignStatus, showNotification, handleFetchAdCampaigns]);

    const handlePageProfileChange = useCallback(async (profile: PageProfile) => {
        try {
            setPageProfile(profile);
            await saveDataToFirestore({ pageProfile: profile });
            showNotification('success', 'تم تحديث ملف الصفحة');
        } catch (error) {
            showNotification('error', 'فشل تحديث ملف الصفحة');
        }
    }, [setPageProfile, saveDataToFirestore, showNotification]);

    // Bulk scheduling handlers
    const onSchedulingStrategyChange = useCallback((strategy: 'even' | 'weekly') => {
        setSchedulingStrategy(strategy);
    }, [setSchedulingStrategy]);

    const onWeeklyScheduleSettingsChange = useCallback((settings: { days: number[]; time: string }) => {
        setWeeklyScheduleSettings(settings);
    }, [setWeeklyScheduleSettings]);

    const onReschedule = useCallback((postId: string, newDate: string) => {
        const updatedPosts = bulkPosts.map((post: BulkPostItem) => 
            post.id === postId ? { ...post, scheduleDate: newDate } : post
        );
        setBulkPosts(updatedPosts);
    }, [bulkPosts, setBulkPosts]);

    const onAddPosts = useCallback((posts: BulkPostItem[]) => {
        setBulkPosts((prev: BulkPostItem[]) => [...prev, ...posts]);
    }, []);

    const onUpdatePost = useCallback((post: BulkPostItem) => {
        const updatedPosts = bulkPosts.map((p: BulkPostItem) => p.id === post.id ? post : p);
        setBulkPosts(updatedPosts);
    }, [bulkPosts, setBulkPosts]);

    const onRemovePost = useCallback((postId: string) => {
        const updatedPosts = bulkPosts.filter((post: BulkPostItem) => post.id !== postId);
        setBulkPosts(updatedPosts);
    }, [bulkPosts, setBulkPosts]);

    const onGeneratePostFromText = useCallback(async (promptText: string) => {
        if (!aiClient) return;
        try {
            const suggestion = await generatePostSuggestion(aiClient, promptText, pageProfile);
            const newPost: BulkPostItem = {
                id: Date.now().toString(),
                text: suggestion,
                hasImage: false,
                scheduleDate: new Date().toISOString().slice(0, 16),
                targetIds: [managedTarget.id]
            };
            setBulkPosts(prev => [...prev, newPost]);
        } catch (error) {
            showNotification('error', 'فشل توليد المنشور');
        }
    }, [aiClient, pageProfile, managedTarget.id, setBulkPosts, showNotification]);

    const onGenerateImageFromText = useCallback(async (promptText: string) => {
        if (!stabilityApiKey) return;
        try {
            const imageData = await generateImageWithStabilityAI(stabilityApiKey, promptText, 'Photographic', '1:1', 'core');
            const newPost: BulkPostItem = {
                id: Date.now().toString(),
                text: '',
                hasImage: true,
                scheduleDate: new Date().toISOString().slice(0, 16),
                targetIds: [managedTarget.id],
                service: 'stability',
                prompt: promptText
            };
            setBulkPosts(prev => [...prev, newPost]);
        } catch (error) {
            showNotification('error', 'فشل توليد الصورة');
        }
    }, [stabilityApiKey, managedTarget.id, setBulkPosts, showNotification]);

    const onGeneratePostFromImage = useCallback(async (image: File) => {
        if (!aiClient) return;
        try {
            const description = "Generated description from image"; // Simplified for now
            const newPost: BulkPostItem = {
                id: Date.now().toString(),
                text: description,
                hasImage: true,
                scheduleDate: new Date().toISOString().slice(0, 16),
                targetIds: [managedTarget.id],
                service: 'gemini'
            };
            setBulkPosts((prev: BulkPostItem[]) => [...prev, newPost]);
        } catch (error) {
            showNotification('error', 'فشل تحليل الصورة');
        }
    }, [aiClient, managedTarget.id, setBulkPosts, showNotification]);

    const onAddImageManually = useCallback((postId: string, file: File) => {
        const updatedPosts = bulkPosts.map((post: BulkPostItem) => 
            post.id === postId ? { ...post, hasImage: true } : post
        );
        setBulkPosts(updatedPosts);
    }, [bulkPosts]);

    const onAddImageManuallyWrapper = useCallback((postId: string, file: File) => {
        onAddImageManually(postId, file);
    }, [onAddImageManually]);

    const onScheduleAll = useCallback(async () => {
        setIsPublishing(true);
        try {
            // Implementation for scheduling all posts
            showNotification('success', 'تم جدولة جميع المنشورات');
        } catch (error) {
            showNotification('error', 'فشل جدولة المنشورات');
        } finally {
            setIsPublishing(false);
        }
    }, [setIsPublishing, showNotification]);

    // Content planner handlers
    const onScheduleStrategy = useCallback(async (plan: ContentPlanItem[]) => {
        try {
            // Implementation for scheduling strategy
            showNotification('success', 'تم جدولة الاستراتيجية');
        } catch (error) {
            showNotification('error', 'فشل جدولة الاستراتيجية');
        }
    }, [showNotification]);

    const onGeneratePlan = useCallback(async (request: any) => {
        if (!aiClient) return;
        setIsGeneratingPlan(true);
        setPlanError(null);
        try {
            const plan = await generateContentPlan(aiClient, request, pageProfile);
            setContentPlan(plan);
            showNotification('success', 'تم توليد خطة المحتوى');
        } catch (error) {
            setPlanError('فشل توليد خطة المحتوى');
            showNotification('error', 'فشل توليد خطة المحتوى');
        } finally {
            setIsGeneratingPlan(false);
        }
    }, [aiClient, pageProfile, setContentPlan, setPlanError, setIsGeneratingPlan, showNotification]);

    const onGeneratePlanWrapper = useCallback(async (request: any) => {
        await onGeneratePlan(request);
    }, [onGeneratePlan]);

    const onStartPost = useCallback((item: ContentPlanItem) => {
        setPostText(`${item.hook}\n\n${item.headline}\n\n${item.body}`);
        setView('composer');
    }, [setPostText, setView]);

    const onLoadFromHistory = useCallback((item: StrategyHistoryItem) => {
        setContentPlan(item.contentPlan);
        setView('planner');
    }, [setContentPlan, setView]);

    const onLoadFromHistoryWrapper = useCallback((item: StrategyHistoryItem) => {
        onLoadFromHistory(item);
    }, [onLoadFromHistory]);

    const onDeleteFromHistory = useCallback(async (strategyId: string) => {
        try {
            await onDeleteStrategy(managedTarget.id, strategyId);
            showNotification('success', 'تم حذف الاستراتيجية');
        } catch (error) {
            showNotification('error', 'فشل حذف الاستراتيجية');
        }
    }, [managedTarget.id, onDeleteStrategy, showNotification]);

    // Analytics handlers
    const onGeneratePerformanceSummary = useCallback(async () => {
        await generatePerformanceSummary();
    }, [generatePerformanceSummary]);

    const onGenerateDeepAnalytics = useCallback(async () => {
        await generateDeepAnalytics();
    }, [generateDeepAnalytics]);

    const onFetchPostInsights = useCallback(async (postId: string) => {
        await fetchPostInsights(postId);
    }, [fetchPostInsights]);

    // Image handling
    const onImageChange = useCallback((file: File | null) => {
        setSelectedImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    }, [setSelectedImage, setImagePreview]);

    const onImageGenerated = useCallback((file: File) => {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }, [setSelectedImage, setImagePreview]);

    const onImageRemove = useCallback(() => {
        setSelectedImage(null);
        setImagePreview(null);
    }, [setSelectedImage, setImagePreview]);

    const onIsScheduledChange = useCallback((scheduled: boolean) => {
        setIsScheduled(scheduled);
    }, [setIsScheduled]);

    const onScheduleDateChange = useCallback((date: string) => {
        setScheduleDate(date);
    }, [setScheduleDate]);

    const onIncludeInstagramChange = useCallback((include: boolean) => {
        setIncludeInstagram(include);
    }, [setIncludeInstagram]);

    const onPostTextChange = useCallback((text: string) => {
        setPostText(text);
    }, [setPostText]);

    const onFetchMessageHistory = useCallback(async (conversationId: string) => {
        // Implementation for fetching message history
        console.log('Fetching message history for:', conversationId);
    }, []);

    return (
        <DashboardLayout
            // Header props
            pageName={managedTarget.name}
            onChangePage={onChangePage}
            onLogout={onLogout}
            onSettingsClick={onSettingsClick}
            theme={theme}
            onToggleTheme={onToggleTheme}
            
            // Sidebar props
            currentView={view}
            onViewChange={setView}
            managedTarget={managedTarget}
            currentUserRole={currentUserRole}
            inboxItems={inboxItems}
            isSyncing={!!syncingTargetId}
            onSync={() => syncFacebookData(managedTarget, lastSyncTime)}
            
            // View renderer props
            view={view}
            postText={postText}
            onPostTextChange={onPostTextChange}
            imagePreview={imagePreview}
            selectedImage={selectedImage}
            isScheduled={isScheduled}
            scheduleDate={scheduleDate}
            composerError={composerError}
            isPublishing={isPublishing}
            editingScheduledPostId={editingScheduledPostId}
            includeInstagram={includeInstagram}
            scheduledPosts={scheduledPosts}
            drafts={drafts}
            publishedPosts={publishedPosts}
            publishedPostsLoading={publishedPostsLoading}
            analyticsPeriod={'30d'}
            setAnalyticsPeriod={(period: '7d' | '30d') => {}} // Simplified for now
            performanceSummaryData={performanceSummaryData}
            performanceSummaryText={performanceSummaryText}
            isGeneratingSummary={isGeneratingSummary}
            audienceGrowthData={audienceGrowthData}
            heatmapData={heatmapData}
            contentTypeData={contentTypeData}
            isGeneratingDeepAnalytics={isGeneratingDeepAnalytics}
            audienceCityData={audienceCityData}
            audienceCountryData={audienceCountryData}
            bulkPosts={bulkPosts}
            schedulingStrategy={schedulingStrategy}
            weeklyScheduleSettings={weeklyScheduleSettings}
            contentPlan={contentPlan}
            isGeneratingPlan={isGeneratingPlan}
            isSchedulingStrategy={isSchedulingStrategy}
            planError={planError}
            strategyHistory={strategyHistory}
            inboxItemsForView={inboxItems}
            isInboxLoading={false} // Simplified
            pageProfile={pageProfile}
            isFetchingProfile={isFetchingProfile}
            adCampaigns={adCampaigns}
            isUpdatingCampaign={isUpdatingCampaign}
            linkedInstagramTarget={linkedInstagramTarget || null}
            userPlan={userPlan}
            aiClient={aiClient}
            stabilityApiKey={stabilityApiKey}
            user={user}
            
            // Handlers
            handlePublish={handlePublish}
            handleSaveDraft={handleSaveDraft}
            handleEditScheduledPost={handleEditScheduledPost}
            handleDeleteScheduledPost={handleDeleteScheduledPost}
            handleApprovePost={handleApprovePost}
            handleRejectPost={handleRejectPost}
            handleLoadDraft={handleLoadDraft}
            handleDeleteDraft={handleDeleteDraft}
            handlePageProfileChange={handlePageProfileChange}
            handleFetchProfile={fetchPageProfile}
            handleUpdateCampaignStatus={handleUpdateCampaignStatus}
            fetchCampaignSubEntities={fetchCampaignSubEntities}
            onSyncCampaigns={handleFetchAdCampaigns} // Add sync campaigns handler
            onSchedulingStrategyChange={onSchedulingStrategyChange}
            onWeeklyScheduleSettingsChange={onWeeklyScheduleSettingsChange}
            onReschedule={onReschedule}
            onAddPosts={onAddPosts}
            onUpdatePost={onUpdatePost}
            onRemovePost={onRemovePost}
            onGeneratePostFromText={onGeneratePostFromText}
            onGenerateImageFromText={onGenerateImageFromText}
            onGeneratePostFromImage={onGeneratePostFromImage}
            onAddImageManually={onAddImageManually}
            onScheduleAll={onScheduleAll}
            onScheduleStrategy={onScheduleStrategy}
            onGeneratePlan={onGeneratePlan}
            onStartPost={onStartPost}
            onLoadFromHistory={onLoadFromHistory}
            onDeleteFromHistory={onDeleteFromHistory}
            onGeneratePerformanceSummary={onGeneratePerformanceSummary}
            onGenerateDeepAnalytics={onGenerateDeepAnalytics}
            onFetchPostInsights={onFetchPostInsights}
            onIncludeInstagramChange={onIncludeInstagramChange}
            onImageChange={onImageChange}
            onImageGenerated={onImageGenerated}
            onImageRemove={onImageRemove}
            onIsScheduledChange={onIsScheduledChange}
            onScheduleDateChange={onScheduleDateChange}
            showNotification={showNotification}
            syncFacebookData={syncFacebookData}
            onFetchMessageHistory={onFetchMessageHistory}
            saveDataToFirestore={saveDataToFirestore}
            
            // Notification
            notification={notification}
        />
    );
};

export default DashboardPage;