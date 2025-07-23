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
import { generateContentPlan, generatePerformanceSummary, generateOptimalSchedule, generatePostInsights, enhanceProfileFromFacebookData, generateSmartReplies, generateAutoReply, generatePostSuggestion, generateHashtags, generateDescriptionForImage, generateBestPostingTimesHeatmap, generateContentTypePerformance, generateImageFromPrompt } from '../services/geminiService';
import { generateImageWithStabilityAI } from '../services/stabilityai';
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

console.log('aiClient:', aiClient);
console.log('stabilityApiKey:', stabilityApiKey);
console.log('currentUserRole:', currentUserRole);

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
  // ملاحظة: لا يمكن حفظ ملف الصورة نفسه في المسودة بدون حل تخزين (مثل Firebase Storage).
  // سيتم حفظ النص، وسيحتاج المستخدم إلى إعادة تحديد الصورة عند تحميل المسودة.
  const newDraft: Draft = {
    id: `draft_${Date.now()}`,
    text: postText,
    hasImage: !!selectedImage,
    imagePreview: imagePreview || undefined, // رابط المعاينة مؤقت
    createdAt: new Date().toISOString(),
  };

  const updatedDrafts = [...drafts, newDraft];
  setDrafts(updatedDrafts);
  await saveDataToFirestore({ drafts: updatedDrafts.map(d => ({...d, imageFile: null})) }); // لا تحفظ كائن الملف

  showNotification('success', 'تم حفظ المسودة! ملاحظة: يجب إعادة تحديد الصورة عند التحميل.');
  clearComposer();
};

const handleLoadDraft = (draftId: string) => {
  const draftToLoad = drafts.find(d => d.id === draftId);
  if (draftToLoad) {
    clearComposer();
    setPostText(draftToLoad.text);
    if (draftToLoad.hasImage) {
      showNotification('partial', 'تم تحميل نص المسودة. يرجى إعادة تحديد الصورة للمتابعة.');
    } else {
      showNotification('success', 'تم تحميل المسودة.');
    }
    setView('composer');
    // حذف المسودة بعد تحميلها لمنع التكرار
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    setDrafts(updatedDrafts);
    saveDataToFirestore({ drafts: updatedDrafts });
  }
};

const handleDeleteDraft = async (draftId: string) => {
  const updatedDrafts = drafts.filter(d => d.id !== draftId);
  setDrafts(updatedDrafts);
  await saveDataToFirestore({ drafts: updatedDrafts });
  showNotification('success', 'تم حذف المسودة.');
};

const handleDeleteScheduledPost = async (postId: string, silent: boolean = false) => {
  if (!managedTarget.access_token) {
      if (!silent) showNotification('error', 'رمز الوصول غير صالح.');
      return;
  }
  try {
      const response = await fetch(`https://graph.facebook.com/v20.0/${postId}?access_token=${managedTarget.access_token}`, {
          method: 'DELETE'
      });
      const resData = await response.json();
      if (!resData.success) {
          throw new Error(resData.error?.message || 'فشل حذف المنشور من فيسبوك.');
      }
      const updatedScheduled = scheduledPosts.filter(p => p.id !== postId);
      setScheduledPosts(updatedScheduled);
      await saveDataToFirestore({ scheduledPosts: updatedScheduled.map(p => ({...p, scheduledAt: p.scheduledAt.toISOString()})) });
      if (!silent) showNotification('success', 'تم حذف المنشور المجدول بنجاح.');
  } catch (error: any) {
      if (!silent) showNotification('error', `فشل الحذف: ${error.message}`);
  }
};

const handlePublish = async () => {
  setComposerError('');
  if (!managedTarget.access_token) {
      setComposerError('رمز الوصول للصفحة غير صالح. حاول إعادة المزامنة أو المصادقة.');
      showNotification('error', 'رمز الوصول للصفحة غير صالح.');
      return;
  }
  setIsPublishing(true);

  try {
      // إذا كنا نقوم بتعديل منشور مجدول، يجب حذفه أولاً
      if (editingScheduledPostId) {
          await handleDeleteScheduledPost(editingScheduledPostId, true); // الحذف بصمت
      }

      const { access_token, id: pageId } = managedTarget;
      let endpoint = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      let response;

      if (selectedImage) {
          endpoint = `https://graph.facebook.com/v20.0/${pageId}/photos`;
          const formData = new FormData();
          formData.append('source', selectedImage);
          if (postText.trim()) formData.append('caption', postText);
          formData.append('access_token', access_token);
          if (isScheduled && scheduleDate) {
              formData.append('published', 'false');
              formData.append('scheduled_publish_time', Math.floor(new Date(scheduleDate).getTime() / 1000).toString());
          }
          response = await fetch(endpoint, { method: 'POST', body: formData });
      } else {
          const params: any = { message: postText, access_token };
          if (isScheduled && scheduleDate) {
              params.published = false;
              params.scheduled_publish_time = Math.floor(new Date(scheduleDate).getTime() / 1000);
          }
          response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(params),
          });
      }

      const responseData = await response.json();
      if (!response.ok) {
          throw new Error(responseData.error?.message || 'استجابة خطأ من فيسبوك.');
      }

      showNotification('success', isScheduled ? 'تمت جدولة المنشور بنجاح!' : 'تم نشر المنشور بنجاح!');
      clearComposer();
      await syncFacebookData(managedTarget); // مزامنة البيانات لإظهار المنشور الجديد

  } catch (error: any) {
      setComposerError(`فشل النشر: ${error.message}`);
      showNotification('error', `فشل النشر: ${error.message}`);
  } finally {
      setIsPublishing(false);
  }
};

const handleEditScheduledPost = async (postId: string) => {
  const postToEdit = scheduledPosts.find(p => p.id === postId);
  if (postToEdit) {
      clearComposer();
      setPostText(postToEdit.text);
      setIsScheduled(true);
      // تنسيق التاريخ ليتوافق مع حقل datetime-local
      const date = new Date(postToEdit.scheduledAt);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      setScheduleDate(date.toISOString().slice(0, 16));
      
      setEditingScheduledPostId(postId);

      if (postToEdit.imageUrl) {
          // محاولة تحميل الصورة الموجودة لمعاينتها وإعادة استخدامها
          try {
              const imageResponse = await fetch(postToEdit.imageUrl);
              const blob = await imageResponse.blob();
              const fileName = postToEdit.imageUrl.split('?')[0].split('/').pop() || 'image.jpg';
              const imageFile = new File([blob], fileName, { type: blob.type });
              setSelectedImage(imageFile); // هذا سيؤدي إلى تحديث المعاينة تلقائيًا
              showNotification('success', 'تم تحميل المنشور المجدول وبياناته.');
          } catch (e) {
              showNotification('partial', 'تم تحميل نص المنشور، لكن فشل تحميل الصورة. يرجى إعادة تحديدها.');
              setImagePreview(postToEdit.imageUrl);
              setSelectedImage(null);
          }
      } else {
          setImagePreview(null);
          setSelectedImage(null);
      }
      setView('composer');
  }
};

const handleApprovePost = async (postId: string) => { /* Placeholder for actual approve logic */ };
const handleRejectPost = async (postId: string) => { /* Placeholder for actual reject logic */ };

const rescheduleBulkPosts = useCallback((
  postsToReschedule: BulkPostItem[],
  strategy: 'even' | 'weekly',
  settings: WeeklyScheduleSettings
): BulkPostItem[] => {
  if (postsToReschedule.length === 0) {
    return [];
  }

  const updatedPosts = [...postsToReschedule];
  let currentDate = new Date(); // Start from today

  if (strategy === 'even') {
    // Evenly distribute posts starting from the next hour, every 3 hours
    let startDate = new Date();
    startDate.setHours(startDate.getHours() + 1, 0, 0, 0); // Start from the next hour

    return updatedPosts.map((post, index) => {
      const scheduleDate = new Date(startDate.getTime() + index * 3 * 60 * 60 * 1000);
      return { ...post, scheduleDate: scheduleDate.toISOString() };
    });
  }

  if (strategy === 'weekly') {
    const { days, time } = settings;
    if (days.length === 0) {
      return postsToReschedule; // Do nothing if no days are selected
    }

    const [hour, minute] = time.split(':').map(Number);
    let postIndex = 0;
    
    // Start checking from tomorrow
    currentDate.setDate(currentDate.getDate() + 1);

    while (postIndex < updatedPosts.length) {
      if (days.includes(currentDate.getDay())) {
        const scheduleDate = new Date(currentDate);
        scheduleDate.setHours(hour, minute, 0, 0);

        // Check if the scheduled time is in the past, if so, schedule it for the next week
        if (scheduleDate < new Date()) {
            scheduleDate.setDate(scheduleDate.getDate() + 7);
        }

        updatedPosts[postIndex] = {
          ...updatedPosts[postIndex],
          scheduleDate: scheduleDate.toISOString(),
        };
        postIndex++;
      }
      // Move to the next day for the next post
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return updatedPosts;
  }

  return postsToReschedule;
}, []);
const handleReschedule = () => {
  setBulkPosts(prev => rescheduleBulkPosts(prev, schedulingStrategy, weeklyScheduleSettings));
  showNotification('success', 'تمت إعادة جدولة المنشورات بنجاح!');
};


const handleAddBulkPosts = useCallback((files: FileList | null) => {
  if (files) {
    const newPosts: BulkPostItem[] = Array.from(files).map((file, index) => ({
      id: `bulk_${Date.now()}_${index}`,
      text: '',
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      hasImage: true,
      scheduleDate: '',
      targetIds: [managedTarget.id],
    }));
    setBulkPosts(prev => [...prev, ...newPosts]);
  } else {
    // Add an empty text-only post
    const newTextPost: BulkPostItem = {
      id: `bulk_${Date.now()}_text_only`,
      text: '',
      imageFile: undefined,
      imagePreview: undefined,
      hasImage: false,
      scheduleDate: '',
      targetIds: [managedTarget.id],
    };
    setBulkPosts(prev => [...prev, newTextPost]);
  }
  showNotification('success', files ? `تمت إضافة ${files.length} منشورات جديدة للجدولة.` : 'تمت إضافة منشور نصي فارغ.');
}, [showNotification, managedTarget.id]);


const handleUpdateBulkPost = (id: string, updates: Partial<BulkPostItem>) => {
  setBulkPosts(prev => prev.map(p => {
      if (p.id === id) {
          const updatedItem = { ...p, ...updates };
          // If imageFile is set, ensure imagePreview and hasImage are updated
          if (updates.imageFile !== undefined) {
              updatedItem.imagePreview = updates.imageFile ? URL.createObjectURL(updates.imageFile) : undefined;
              updatedItem.hasImage = !!updates.imageFile;
          } else if (updates.imagePreview !== undefined) {
               updatedItem.hasImage = !!updates.imagePreview;
          }

          return updatedItem;
      }
      return p;
  }));
};
const handleRemoveBulkPost = (id: string) => setBulkPosts(prev => prev.filter(p => p.id !== id));

// AI Generation Functions for Bulk Posts
const handleGenerateBulkPostFromText = useCallback(async (id: string, text: string) => {
  const postToUpdate = bulkPosts.find(p => p.id === id);
  if (!aiClient || !postToUpdate) {
      showNotification('error', 'AI Client not configured or post not found.');
      return;
  }
  try {
      const generatedText = await generatePostSuggestion(aiClient, text, pageProfile);
      handleUpdateBulkPost(id, { text: generatedText });
      showNotification('success', 'تم توليد المنشور بنجاح من النص!');
  } catch (error: any) {
      showNotification('error', `فشل توليد المنشور: ${error.message}`);
  }
}, [aiClient, pageProfile, showNotification, bulkPosts]);

const handleGenerateImageFromText = useCallback(async (id: string, text: string, service: 'gemini' | 'stability') => {
  const postToUpdate = bulkPosts.find(p => p.id === id);
  if (!postToUpdate) {
      showNotification('error', 'Post not found.');
      return;
  }
  try {
      showNotification('partial', `جاري توليد الصورة باستخدام ${service === 'gemini' ? 'Gemini' : 'Stability AI'}... قد يستغرق هذا بعض الوقت.`);
      let base64;
      if (service === 'gemini') {
           if (!aiClient) {
              showNotification('error', 'Gemini API client is not configured.');
              return;
          }
          base64 = await generateImageFromPrompt(aiClient, text, 'standard', '1:1');
      } else if (service === 'stability') {
          if (!stabilityApiKey) {
              showNotification('error', 'Stability AI API key is not configured.');
              return;
          }
          base64 = await generateImageWithStabilityAI(stabilityApiKey, text, 'standard', '1:1', 'core', aiClient);
      }

      if (base64) {
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          const generatedFile = new File([blob], `generated_image_${id}.jpeg`, { type: 'image/jpeg' });

          handleUpdateBulkPost(id, { imageFile: generatedFile, hasImage: true, imagePreview: URL.createObjectURL(generatedFile) });
          showNotification('success', `تم توليد الصورة بنجاح باستخدام ${service === 'gemini' ? 'Gemini' : 'Stability AI'}!`);
      }
  } catch (error: any) {
      showNotification('error', `فشل توليد الصورة: ${error.message}`);
  }
}, [aiClient, stabilityApiKey, showNotification, bulkPosts, handleUpdateBulkPost]);


const handleGeneratePostFromImage = useCallback(async (id: string, imageFile: File) => {
  const postToUpdate = bulkPosts.find(p => p.id === id);
  if (!aiClient || !postToUpdate) {
      showNotification('error', 'AI Client not configured or post not found.');
      return;
  }
  try {
      const generatedDescription = await generateDescriptionForImage(aiClient, imageFile, pageProfile);
      handleUpdateBulkPost(id, { text: generatedDescription });
      showNotification('success', 'تم توليد وصف المنشور بنجاح من الصورة!');
  } catch (error: any) {
      showNotification('error', `فشل توليد الوصف: ${error.message}`);
  }
}, [aiClient, pageProfile, showNotification, bulkPosts]);

const handleAddImageManually = useCallback((id: string, file: File) => {
  handleUpdateBulkPost(id, { imageFile: file, hasImage: true, imagePreview: URL.createObjectURL(file) });
  showNotification('success', 'تمت إضافة الصورة بنجاح يدوياً.');
}, [handleUpdateBulkPost, showNotification]);

const handleScheduleAllBulk = async () => { /* Placeholder for actual schedule all logic */ };
const handleFetchProfile = async () => {};

  const handleScheduleStrategy = useCallback(async () => {
  if (!contentPlan || contentPlan.length === 0) {
      showNotification('error', 'لا توجد خطة لتحويلها.');
      return;
  }
  setIsSchedulingStrategy(true);
  try {
      const newBulkItems: BulkPostItem[] = contentPlan.map((item, index) => ({
          id: `bulk_strategy_${Date.now()}_${index}`, text: item.body, imageFile: undefined,
          imagePreview: undefined, hasImage: false, scheduleDate: '', targetIds: [managedTarget.id],
      }));
      
      const scheduledBulkItems = rescheduleBulkPosts(newBulkItems, schedulingStrategy, weeklyScheduleSettings);
      
      setBulkPosts(scheduledBulkItems);
      showNotification('success', `تم تحويل ${scheduledBulkItems.length} منشورًا إلى الجدولة المجمعة بنجاح!`);
      setView('bulk');
  } catch (error: any) {
      showNotification('error', `فشل تحويل الخطة: ${error.message}`);
  } finally {
      setIsSchedulingStrategy(false);
  }
}, [contentPlan, managedTarget.id, rescheduleBulkPosts, showNotification, schedulingStrategy, weeklyScheduleSettings]);


const syncFacebookData = useCallback(async (target: Target) => {
  if (!target.access_token) {
      showNotification('error', 'Page access token is missing. Please re-authenticate.');
      return;
  }
  setSyncingTargetId(target.id); // استخدام setSyncingTargetId المعرف كحالة
  showNotification('partial', 'جاري مزامنة بيانات فيسبوك...');
  try {
      // Fetch Scheduled Posts from Facebook
      const scheduledPath = `/${target.id}/scheduled_posts?fields=id,message,scheduled_publish_time,attachments{media{source}}`;
      const fbScheduledPosts = await fetchWithPagination(scheduledPath, target.access_token);
      
      const newScheduledPosts: ScheduledPost[] = fbScheduledPosts.map((post: any) => ({
          id: post.id,
          postId: post.id,
          text: post.message || '',
          scheduledAt: new Date(post.scheduled_publish_time * 1000),
          imageUrl: post.attachments?.data[0]?.media?.source,
          hasImage: !!post.attachments?.data[0]?.media?.source,
          isReminder: false,
          targetId: target.id,
          targetInfo: {
              name: target.name,
              avatarUrl: target.picture.data.url,
              type: target.type,
          },
          status: 'scheduled',
          approvals: {},
          rejections: {},
          imageFile: undefined,
      }));
      setScheduledPosts(newScheduledPosts);

      // Fetch Published Posts from Facebook
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
              loading: false,
              lastUpdated: new Date().toISOString(),
          },
          pageId: target.id,
          pageName: target.name,
          pageAvatarUrl: target.picture.data.url,
      }));
      setPublishedPosts(newPublishedPosts);
      
      // Save fresh data to Firestore
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
}, [fetchWithPagination, saveDataToFirestore, showNotification, setSyncingTargetId, managedTarget.id, managedTarget.name, managedTarget.picture.data.url, managedTarget.type]);
useEffect(() => {
  const loadDataFromFirestoreAndSync = async () => {
      const dataRef = getTargetDataRef();
      setPublishedPostsLoading(true);
      setIsInboxLoading(true);
      const docSnap = await dataRef.get();
      let loadedProfile: PageProfile;
      if (docSnap.exists) {
          const data = docSnap.data()!;
          loadedProfile = { ...initialPageProfile, ...(data.pageProfile || {}) };
          if (!loadedProfile.ownerUid) {
              loadedProfile.ownerUid = user.uid;
              loadedProfile.members = [user.uid];
          }
          setPageProfile(loadedProfile);
          setCurrentUserRole(loadedProfile.ownerUid === user.uid ? 'owner' : (loadedProfile.team?.find(m => m.uid === user.uid)?.role || 'viewer'));
          setAutoResponderSettings(data.autoResponderSettings || initialAutoResponderSettings);
          setDrafts(data.drafts?.map((d: any) => ({...d, imageFile: null})) || []);
          setScheduledPosts(data.scheduledPosts?.map((p: any) => ({...p, scheduledAt: new Date(p.scheduledAt)})) || []);
          setPublishedPosts(data.publishedPosts?.map((p:any) => ({...p, publishedAt: new Date(p.publishedAt)})) || []);
          setInboxItems(data.inboxItems?.map((i:any) => ({ ...i, timestamp: new Date(i.timestamp).toISOString() })) || []);
      } else {
          loadedProfile = { ...initialPageProfile, ownerUid: user.uid, members: [user.uid], team: [] };
          setPageProfile(loadedProfile);
          setCurrentUserRole('owner');
          setAutoResponderSettings(initialAutoResponderSettings);
          setDrafts([]); setScheduledPosts([]); setPublishedPosts([]); setInboxItems([]);
      }
      await saveDataToFirestore({ 
          id: managedTarget.id, 
          name: managedTarget.name, 
          pictureUrl: managedTarget.picture.data.url, 
          accessToken: managedTarget.access_token, 
          userId: user.uid, 
          pageProfile: loadedProfile 
      });
      clearComposer();
      setPublishedPostsLoading(false);
      setIsInboxLoading(false);
  };
  loadDataFromFirestoreAndSync(); 
}, [managedTarget.id, user.uid, getTargetDataRef, clearComposer, saveDataToFirestore]);


  useEffect(() => {
      if (managedTarget && managedTarget.access_token) {
          syncFacebookData(managedTarget);
      }
  }, [managedTarget, syncFacebookData]);


const isAllowed = (feature: keyof Plan['limits']) => isAdmin || (userPlan?.limits[feature] ?? false);
const planName = userPlan?.name || 'Free';

const handleSetView = (newView: DashboardView) => {
  const featureMap: Partial<Record<DashboardView, { key: keyof Plan['limits'], name: string }>> = {
      'bulk': { key: 'bulkScheduling', name: 'الجدولة المجمعة' },
      'planner': { key: 'contentPlanner', name: 'استراتيجيات المحتوى' },
      'inbox': { key: 'autoResponder', name: 'صندوق الوارد' },
  };
  const requestedFeature = featureMap[newView];
  if (requestedFeature && !isAllowed(requestedFeature.key)) {
      alert(`ميزة "${requestedFeature.name}" غير متاحة في خطة "${planName}".`);
      return;
  }
  setView(newView);
};
  
const renderView = () => {
  switch (view) {
    case 'composer':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PostComposer
            postText={postText} onPostTextChange={setPostText} selectedImage={selectedImage}
            onImageChange={(e) => setSelectedImage(e.target.files ? e.target.files[0] : null)}
            onImageGenerated={setSelectedImage} onImageRemove={() => setSelectedImage(null)}
            imagePreview={imagePreview} isScheduled={isScheduled} onIsScheduledChange={setIsScheduled}
            scheduleDate={scheduleDate} onScheduleDateChange={setScheduleDate} error={composerError}
            onPublish={handlePublish} onSaveDraft={handleSaveDraft} includeInstagram={includeInstagram}
            onIncludeInstagramChange={setIncludeInstagram} linkedInstagramTarget={linkedInstagramTarget}
            editingScheduledPostId={editingScheduledPostId} userPlan={userPlan} isPublishing={isPublishing}
            aiClient={aiClient} pageProfile={pageProfile} stabilityApiKey={stabilityApiKey} managedTarget={managedTarget} role={currentUserRole}
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
      return (
        <ContentPlannerPage
          plan={contentPlan} isGenerating={isGeneratingPlan} strategyHistory={strategyHistory}
          isSchedulingStrategy={isSchedulingStrategy} error={planError} role={currentUserRole}
          onScheduleStrategy={handleScheduleStrategy} aiClient={aiClient}
          onGeneratePlan={async (request, images) => {
              setIsGeneratingPlan(true); setPlanError(null);
              try {
                  if (!aiClient) throw new Error("AI Client is not configured.");
                  const generatedPlan = await generateContentPlan(aiClient, request, pageProfile, images);
                  setContentPlan(generatedPlan);
                  await onSavePlan(managedTarget.id, generatedPlan, request);
                  showNotification('success', 'تم إنشاء الخطة وحفظها في السجل بنجاح!');
              } catch (e: any) {
                  setPlanError(e.message || 'فشل إنشاء الخطة');
                  showNotification('error', `فشل إنشاء الخطة: ${e.message}`);
              } finally { setIsGeneratingPlan(false); }
          }}
          onStartPost={(planItem) => {
              setView('composer');
              setPostText(`${planItem.hook}\n\n${planItem.headline}\n\n${planItem.body}`);
          }}
          pageProfile={pageProfile} onLoadFromHistory={(plan) => setContentPlan(plan)}
          onDeleteFromHistory={(id) => onDeleteStrategy(managedTarget.id, id)}
        />
      );

      case 'inbox':
        return <InboxPage items={inboxItems} isLoading={isInboxLoading} autoResponderSettings={autoResponderSettings} onAutoResponderSettingsChange={(settings) => {setAutoResponderSettings(settings); saveDataToFirestore({ autoResponderSettings: settings });}} repliedUsersPerPost={repliedUsersPerPost} currentUserRole={currentUserRole} isSyncing={isPolling} onSync={() => setIsPolling(true)} onReply={async ()=>{return true}} onMarkAsDone={()=>{}} onGenerateSmartReplies={async ()=>{return []}} onFetchMessageHistory={async ()=>{return []}} aiClient={aiClient} role={currentUserRole} />
      case 'analytics':
                      return <AnalyticsPage publishedPosts={publishedPosts} publishedPostsLoading={publishedPostsLoading} analyticsPeriod={analyticsPeriod} setAnalyticsPeriod={setAnalyticsPeriod} performanceSummaryText={performanceSummaryText} setPerformanceSummaryText={setPerformanceSummaryText} isGeneratingSummary={isGeneratingSummary} setIsGeneratingSummary={setIsGeneratingSummary} audienceGrowthData={audienceGrowthData} setAudienceGrowthData={setAudienceGrowthData} heatmapData={heatmapData} setHeatmapData={setHeatmapData} contentTypeData={contentTypeData} setContentTypePerformanceData={setContentTypePerformanceData} isGeneratingDeepAnalytics={isGeneratingDeepAnalytics} setIsGeneratingDeepAnalytics={setIsGeneratingDeepAnalytics} managedTarget={managedTarget} userPlan={userPlan} isSimulationMode={isSimulationMode} aiClient={aiClient} pageProfile={pageProfile} currentUserRole={currentUserRole} showNotification={showNotification} generatePerformanceSummary={generatePerformanceSummary} generatePostInsights={generatePostInsights} generateOptimalSchedule={async ()=>{return {days:[],time:''}}} generateBestPostingTimesHeatmap={generateBestPostingTimesHeatmap} generateContentTypePerformance={generateContentTypePerformance} />
                    case 'profile':
                      return <PageProfilePage profile={pageProfile} onProfileChange={handlePageProfileChange} isFetchingProfile={isFetchingProfile} onFetchProfile={handleFetchProfile} role={currentUserRole} user={user} />
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
                          <NavItem icon={<QueueListIcon className="w-5 h-5" />} label="الجدولة المجمعة" active={view === 'bulk'} onClick={() => handleSetView('bulk')} disabled={!isAllowed('bulkScheduling')} disabledTooltip={!isAllowed('bulkScheduling') ? `متاحة في الخطط الأعلى من ${planName}` : undefined} />
                          <NavItem icon={<BrainCircuitIcon className="w-5 h-5" />} label="استراتيجيات المحتوى" active={view === 'planner'} onClick={() => handleSetView('planner')} disabled={!isAllowed('contentPlanner')} disabledTooltip={!isAllowed('contentPlanner') ? `متاحة في الخطط الأعلى من ${planName}` : undefined} />
                          <NavItem icon={<CalendarIcon className="w-5 h-5" />} label="تقويم المحتوى" active={view === 'calendar'} onClick={() => setView('calendar')} />
                          <NavItem icon={<ArchiveBoxIcon className="w-5 h-5" />} label="المسودات" active={view === 'drafts'} onClick={() => setView('drafts')} />
                          <NavItem icon={<InboxArrowDownIcon className="w-5 h-5" />} label="صندوق الوارد" active={view === 'inbox'} onClick={() => handleSetView('inbox')} disabled={!isAllowed('autoResponder')} disabledTooltip={!isAllowed('autoResponder') ? `متاحة في الخطط الأعلى من ${planName}` : undefined} isPolling={isPolling} notificationCount={inboxItems.filter(item => item.status === 'new').length} />
                          <NavItem icon={<ChartBarIcon className="w-5 h-5" />} label="التحليلات" active={view === 'analytics'} onClick={() => setView('analytics')} />
                          <NavItem icon={<UserCircleIcon className="w-5 h-5" />} label="ملف الصفحة" active={view === 'profile'} onClick={() => setView('profile')} />
                        </nav>
                        <div className="mt-8 pt-4 border-t dark:border-gray-700">
                              <Button onClick={() => syncFacebookData(managedTarget)} isLoading={!!syncingTargetId} variant="secondary" className="w-full" disabled={currentUserRole === 'viewer'} title={currentUserRole === 'viewer' ? 'لا تملك صلاحية المزامنة' : undefined}>
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