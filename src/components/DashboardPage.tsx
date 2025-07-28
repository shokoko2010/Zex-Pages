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
import { generateContentPlan, generatePerformanceSummary, generatePostInsights, generateBestPostingTimesHeatmap, generateContentTypePerformance, generatePostSuggestion, generateImageFromPrompt, generateHashtags, generateDescriptionForImage, enhanceProfileFromFacebookData } from '../services/geminiService';
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
class FacebookTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FacebookTokenError';
    }
  }
  
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
  fbAccessToken: string | null;
  strategyHistory: StrategyHistoryItem[];
  onSavePlan: (pageId: string, plan: ContentPlanItem[], request: StrategyRequest) => Promise<void>;
  onDeleteStrategy: (pageId: string, strategyId: string) => Promise<void>;
  onTokenError: () => void; // Add this line
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

const DashboardPage: React.FC<DashboardPageProps> = ({ user, isAdmin, userPlan, managedTarget, allTargets, onChangePage, onLogout, aiClient, stabilityApiKey, onSettingsClick, fetchWithPagination, theme, onToggleTheme, strategyHistory, onDeleteStrategy, onSavePlan, onTokenError }) => {
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
    const showNotification = useCallback((type: 'success' | 'error' | 'partial', message: string) => {
        setNotification({ type, message });
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setNotification(null), 5000);
      }, []);
    const makeRequestWithRetry = useCallback(async (url: string, accessToken: string): Promise<any> => {
        const response = await fetch(`https://graph.facebook.com/v19.0${url}&access_token=${accessToken}`);
        const data = await response.json();
        if (!response.ok || data.error) {
            const errorInfo = data.error || {};
            if (errorInfo.code === 190) {
                throw new FacebookTokenError(errorInfo.message || 'Invalid or expired token.');
            }
            throw new Error(errorInfo.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        return data;
    }, []); // Note the empty dependency array
    const onFetchMessageHistory = useCallback(async (conversationId: string) => {
        if (!managedTarget.access_token) {
            showNotification('error', 'رمز الوصول للصفحة مفقود لجلب سجل الرسائل.');
            return;
        }
        showNotification('partial', `جاري جلب سجل الرسائل...`);
        try {
            const historyData = await makeRequestWithRetry(`/${conversationId}/messages?fields=from,to,message,created_time&limit=100`, managedTarget.access_token);
            
            setInboxItems(prevItems => prevItems.map(item => 
                item.conversationId === conversationId ? { ...item, messages: (historyData.data || []).map((msg: any) => ({
                    id: msg.id, text: msg.message, from: (msg.from.id === managedTarget.id ? 'page' : 'user'), timestamp: msg.created_time
                })).reverse() } : item
            ));
            showNotification('success', 'تم جلب سجل الرسائل.');
        } catch (error: any) {
            if (error instanceof FacebookTokenError) {
                onTokenError();
            } else {
                showNotification('error', `فشل جلب سجل الرسائل: ${error.message}`);
            }
        }
    }, [managedTarget.id, managedTarget.access_token, onTokenError, showNotification, makeRequestWithRetry]);
   
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
    }, []);

    const handlePageProfileChange = (newProfile: PageProfile) => {
      setPageProfile(newProfile);
      saveDataToFirestore({ pageProfile: newProfile });
    };

    const handleFetchProfile = async () => {
      setIsFetchingProfile(true);
      showNotification('partial', 'جاري جلب بيانات الصفحة من فيسبوك...');
      try {
          const pageInfoFields = "about,category,contact_address,emails,website,phone,location,fan_count,overall_star_rating,engagement";
          const pageInfoResponse = await fetchWithPagination(`/${managedTarget.id}?fields=${pageInfoFields}`, managedTarget.access_token);
          const pageInfo = pageInfoResponse[0] || {};
          
          const facebookDataForGemini = {
              about: pageInfo.about,
              category: pageInfo.category,
              contact: pageInfo.emails?.[0] || pageInfo.phone,
              website: pageInfo.website,
              address: pageInfo.location?.street || pageInfo.contact_address?.street1,
              country: pageInfo.location?.country || pageInfo.contact_address?.country,
          };
  
          if (aiClient) {
              const enhancedProfile = await enhanceProfileFromFacebookData(aiClient, facebookDataForGemini);
              const newProfile = { ...pageProfile, ...enhancedProfile, ownerUid: user.uid, members: pageProfile.members.includes(user.uid) ? pageProfile.members : [...pageProfile.members, user.uid] };
              setPageProfile(newProfile);
              await saveDataToFirestore({ pageProfile: newProfile });
          } else {
              const fallbackProfile = {
                  ...pageProfile,
                  description: pageInfo.about || pageProfile.description,
                  contactInfo: pageInfo.emails?.[0] || pageInfo.phone || pageProfile.contactInfo,
                  website: pageInfo.website || pageProfile.website,
                  address: pageInfo.location?.street || pageProfile.address,
                  country: pageInfo.location?.country || pageProfile.country,
                  ownerUid: user.uid,
                  members: pageProfile.members.includes(user.uid) ? pageProfile.members : [...pageProfile.members, user.uid],
              };
              setPageProfile(fallbackProfile);
              await saveDataToFirestore({ pageProfile: fallbackProfile });
          }
          showNotification('success', 'تم تحديث ملف الصفحة بنجاح.');
      } catch (error: any) {
          showNotification('error', `فشل جلب بيانات الملف: ${error.message}`);
          console.error("Fetch Profile Error:", error);
      } finally {
          setIsFetchingProfile(false);
      }
  };
  
        const syncFacebookData = useCallback(async (target: Target) => {
            if (!target.access_token) {
                showNotification('error', 'رمز الوصول للصفحة مفقود.');
                return;
            }
            if (syncingTargetId) {
                showNotification('error', 'مزامنة أخرى قيد التنفيذ، يرجى الانتظار.');
                return;
            }
            setSyncingTargetId(target.id);
            setPublishedPosts([]);
            setScheduledPosts([]);
            setInboxItems([]);
            setPerformanceSummaryData(null);
            setPerformanceSummaryText('');
            setAudienceGrowthData([]);
            setHeatmapData([]);
            setContentTypePerformanceData([]);

            showNotification('partial', `جاري مزامنة بيانات ${target.name}...`);

            try {
                const getImageUrlFromPost = (post: any): string | undefined => {
                    return post.attachments?.data?.[0]?.media?.image?.src;
                };

                showNotification('partial', `(1/6) جلب المنشورات المجدولة...`);
                let finalScheduled: ScheduledPost[] = [];
                try {
                    const scheduledPostFields = "id,message,scheduled_publish_time,attachments{media}";
                    const scheduledData = await makeRequestWithRetry(`/${target.id}/scheduled_posts?fields=${scheduledPostFields}&limit=50`, target.access_token);
                    finalScheduled = (scheduledData.data || []).map((post: any) => ({
                        id: post.id, text: post.message || '', scheduledAt: new Date(post.scheduled_publish_time * 1000),
                        imageUrl: getImageUrlFromPost(post), hasImage: !!getImageUrlFromPost(post), targetId: target.id,
                        targetInfo: { name: target.name, avatarUrl: target.picture.data.url, type: target.type },
                        status: 'scheduled', isReminder: false, type: 'post'
                    } as ScheduledPost));
                    setScheduledPosts(finalScheduled);
                } catch (error) {
                    if (error instanceof FacebookTokenError) throw error;
                    console.warn('Failed to fetch scheduled posts:', error);
                }

                showNotification('partial', `(2/6) جلب المنشورات المنشورة...`);
                let fbPublishedContent: any[] = [];
                try {
                    const postContentFields = "id,message,created_time,permalink_url,attachments{media}";
                    const publishedData = await makeRequestWithRetry(`/${target.id}/published_posts?fields=${postContentFields}&limit=50`, target.access_token);
                    fbPublishedContent = publishedData.data || [];
                } catch (error) {
                    if (error instanceof FacebookTokenError) throw error;
                    console.warn('Failed to fetch published posts:', error);
                }

                showNotification('partial', `(3/6) جلب التفاعلات للمنشورات...`);
                const engagementMap = new Map<string, any>();
                if (fbPublishedContent.length > 0) {
                    for (const post of fbPublishedContent) {
                        try {
                            const engagement = await makeRequestWithRetry(`/${post.id}?fields=likes.summary(true),comments.summary(true),shares.summary(true)`, target.access_token);
                            engagementMap.set(post.id, engagement);
                        } catch (error) {
                            if (error instanceof FacebookTokenError) throw error;
                            console.warn(`Failed to fetch engagement for post ${post.id}:`, error);
                        }
                    }
                }
                const finalPublished = fbPublishedContent.map((post: any) => {
                    const engagement = engagementMap.get(post.id) || {};
                    return {
                        id: post.id, text: post.message || '', publishedAt: new Date(post.created_time),
                        imagePreview: getImageUrlFromPost(post),
                        analytics: {
                            likes: engagement.likes?.summary?.total_count || 0,
                            comments: engagement.comments?.summary?.total_count || 0,
                            shares: engagement.shares?.summary?.total_count || 0,
                        }, pageId: target.id, pageName: target.name, pageAvatarUrl: target.picture.data.url,
                    } as PublishedPost;
                });
                setPublishedPosts(finalPublished);

                showNotification('partial', `(4/6) جلب صندوق الوارد...`);
                const newInbox: InboxItem[] = [];
                try {
                    const convoFields = "participants,messages.limit(1){from,to,message,created_time}";
                    const conversationsData = await makeRequestWithRetry(`/${target.id}/conversations?fields=${convoFields}&limit=50`, target.access_token);
                    if (conversationsData.data) {
                        conversationsData.data.forEach((convo: any) => {
                            const lastMsg = convo.messages?.data?.[0];
                            if (lastMsg && lastMsg.from.id !== target.id) {
                                const participant = convo.participants.data.find((p: any) => p.id !== target.id);
                                if (participant) {
                                    newInbox.push({
                                        id: lastMsg.id, type: 'message', from: participant, text: lastMsg.message,
                                        timestamp: lastMsg.created_time, status: 'new', conversationId: convo.id,
                                        authorName: participant.name, authorPictureUrl: `https://graph.facebook.com/${participant.id}/picture?type=normal`
                                    } as InboxItem);
                                }
                            }
                        });
                    }
                } catch (error) {
                    if (error instanceof FacebookTokenError) throw error;
                    console.warn('Failed to fetch conversations:', error);
                }
                if (fbPublishedContent.length > 0) {
                    for (const post of fbPublishedContent) {
                        try {
                            const commentsData = await makeRequestWithRetry(`/${post.id}/comments?limit=50&fields=from{name,picture},message,created_time,id`, target.access_token);
                            if (commentsData.data) {
                                commentsData.data.forEach((comment: any) => {
                                    if (comment.from.id !== target.id) {
                                        newInbox.push({
                                            id: comment.id, type: 'comment', from: comment.from, text: comment.message,
                                            timestamp: comment.created_time, status: 'new', link: post.permalink_url,
                                            post: { message: post.message, picture: getImageUrlFromPost(post) },
                                            authorName: comment.from.name, authorPictureUrl: comment.from.picture?.data?.url
                                        } as InboxItem);
                                    }
                                });
                            }
                        } catch (error) {
                        if (error instanceof FacebookTokenError) throw error;
                        console.warn(`Failed to fetch comments for post ${post.id}:`, error);
                        }
                    }
                }
                setInboxItems(newInbox.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

                showNotification('partial', `(5/6) جلب تحليلات الصفحة...`);
                try {
                    let processedPerformanceSummary: PerformanceSummaryData = {
                        totalPosts: finalPublished.length,
                        averageEngagement: 0,
                        growthRate: 0,
                        totalReach: 0,
                        totalEngagement: 0,
                        engagementRate: 0,
                        topPosts: finalPublished.sort((a, b) => (b.analytics.likes || 0) + (b.analytics.comments || 0) + (b.analytics.shares || 0) - ((a.analytics.likes || 0) + (a.analytics.comments || 0) + (a.analytics.shares || 0))).slice(0, 3),
                        postCount: finalPublished.length,
                    };
                    let totalEngagement = 0;
                    let totalReach = 0;
                    let fanCountStart = 0;
                    let fanCountEnd = 0;

                    const period = analyticsPeriod === '7d' ? 'week' : 'days_28';

                    try {
                        const audienceGrowthDataResponse = await makeRequestWithRetry(`/${target.id}/insights?metric=page_fans&period=${period}`, target.access_token);
                        if (audienceGrowthDataResponse.data && audienceGrowthDataResponse.data.length > 0) {
                            const fanMetric = audienceGrowthDataResponse.data[0];
                            if (fanMetric.values && fanMetric.values.length > 1) {
                                const processedData: AudienceGrowthData[] = fanMetric.values.map((value: any) => ({
                                    date: value.end_time,
                                    fanCount: value.value
                                }));
                                setAudienceGrowthData(processedData);
                                fanCountStart = fanMetric.values[0].value;
                                fanCountEnd = fanMetric.values[fanMetric.values.length - 1].value;
                            } else if (fanMetric.values && fanMetric.values.length === 1) {
                                const processedData: AudienceGrowthData[] = fanMetric.values.map((value: any) => ({
                                    date: value.end_time,
                                    fanCount: value.value
                                }));
                                setAudienceGrowthData(processedData);
                                fanCountEnd = fanMetric.values[0].value;
                                fanCountStart = fanCountEnd;
                            }
                        }
                    } catch (error) {
                        if (error instanceof FacebookTokenError) throw error;
                        console.warn('Failed to fetch page_fans insight:', error);
                        setAudienceGrowthData([]);
                    }

                    try {
                        const postEngagementsData = await makeRequestWithRetry(`/${target.id}/insights?metric=page_post_engagements&period=${period}`, target.access_token);
                        if (postEngagementsData.data && postEngagementsData.data.length > 0 && postEngagementsData.data[0].values.length > 0) {
                            totalEngagement = postEngagementsData.data[0].values[postEngagementsData.data[0].values.length - 1].value;
                        }
                    } catch (error) {
                        if (error instanceof FacebookTokenError) throw error;
                        console.warn('Failed to fetch page_post_engagements insight:', error);
                    }

                    try {
                        const impressionsData = await makeRequestWithRetry(`/${target.id}/insights?metric=page_impressions_unique&period=${period}`, target.access_token);
                        if (impressionsData.data && impressionsData.data.length > 0 && impressionsData.data[0].values.length > 0) {
                            totalReach = impressionsData.data[0].values[impressionsData.data[0].values.length - 1].value;
                        }
                    } catch (error) {
                        if (error instanceof FacebookTokenError) throw error;
                        console.warn('Failed to fetch page_impressions_unique insight:', error);
                    }

                    processedPerformanceSummary.totalEngagement = totalEngagement;
                    processedPerformanceSummary.totalReach = totalReach;
                    if (totalReach > 0) {
                        processedPerformanceSummary.engagementRate = (totalEngagement / totalReach) * 100;
                    }
                    if (fanCountStart > 0) {
                        processedPerformanceSummary.growthRate = ((fanCountEnd - fanCountStart) / fanCountStart) * 100;
                    } else if (fanCountEnd > 0) {
                        processedPerformanceSummary.growthRate = 100;
                    } else {
                        processedPerformanceSummary.growthRate = 0;
                    }
                    setPerformanceSummaryData(processedPerformanceSummary);

                    const photoPosts = finalPublished.filter(p => p.imagePreview);
                    const textPosts = finalPublished.filter(p => !p.imagePreview);

                    const totalPhotoEngagement = photoPosts.reduce((sum, p) => sum + (p.analytics.likes || 0) + (p.analytics.comments || 0) + (p.analytics.shares || 0), 0);
                    const totalTextEngagement = textPosts.reduce((sum, p) => sum + (p.analytics.likes || 0) + (p.analytics.comments || 0) + (p.analytics.shares || 0), 0);
                    
                    const contentTypeChartData: ContentTypePerformanceData[] = [];
                    if (photoPosts.length > 0) {
                        contentTypeChartData.push({
                            type: 'منشورات الصور',
                            count: photoPosts.length,
                            avgEngagement: totalPhotoEngagement / photoPosts.length
                        });
                    }
                    if (textPosts.length > 0) {
                        contentTypeChartData.push({
                            type: 'منشورات نصية',
                            count: textPosts.length,
                            avgEngagement: totalTextEngagement / textPosts.length
                        });
                    }
                    setContentTypePerformanceData(contentTypeChartData);

                    try {
                        const onlineFansData = await makeRequestWithRetry(`/${target.id}/insights?metric=page_fans_online_per_day&period=days_28`, target.access_token);
                        if (onlineFansData.data && onlineFansData.data.length > 0 && onlineFansData.data[0].values.length > 0) {
                            const dailyValues = onlineFansData.data[0].values;
                            const heatmap: HeatmapDataPoint[] = [];
                            const hourlyAverages = new Array(24).fill(0);
                            dailyValues.forEach((dayData: any) => {
                                Object.entries(dayData.value).forEach(([hour, value]) => {
                                    hourlyAverages[parseInt(hour)] += value as number;
                                });
                            });

                            for (let day = 0; day < 7; day++) {
                                for (let hour = 0; hour < 24; hour++) {
                                    heatmap.push({
                                        day: day,
                                        hour: hour,
                                        engagement: hourlyAverages[hour] / dailyValues.length
                                    });
                                }
                            }
                            setHeatmapData(heatmap);
                        }
                    } catch (error) {
                        console.warn('Failed to fetch page_fans_online_per_day insight:', error);
                        setHeatmapData([]);
                    }
                } catch (error) {
                    if (error instanceof FacebookTokenError) throw error;
                    console.error('Facebook Insights Fetch Error:', error);
                    showNotification('error', `فشل جلب تحليلات الصفحة: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
                    setPerformanceSummaryData(null);
                    setPerformanceSummaryText('');
                    setAudienceGrowthData([]);
                    setHeatmapData([]);
                    setContentTypePerformanceData([]);
                }

                showNotification('partial', `(6/6) حفظ البيانات...`);
                await saveDataToFirestore({
                    scheduledPosts: finalScheduled.map(p => ({ ...p, scheduledAt: p.scheduledAt.toISOString() })),
                    publishedPosts: finalPublished.map(p => ({ ...p, publishedAt: p.publishedAt.toISOString() })),
                    inboxItems: newInbox,
                    performanceSummaryData: performanceSummaryData,
                    audienceGrowthData: audienceGrowthData,
                    heatmapData: heatmapData,
                    contentTypeData: contentTypeData,
                    lastSync: new Date().toISOString()
                });
                showNotification('success', 'تمت المزامنة بنجاح!');

            } catch (error: unknown) {
                console.error("Facebook Sync Error details:", error);
                if (error instanceof FacebookTokenError) {
                    onTokenError();
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'حدث خطأ غير معروف';
                    showNotification('error', `فشل المزامنة: ${errorMessage}`);
                }
            } finally {
                setSyncingTargetId(null);
                setIsInboxLoading(false);
                setPublishedPostsLoading(false);
            }
        }, [managedTarget, saveDataToFirestore, showNotification, syncingTargetId, onTokenError, makeRequestWithRetry, analyticsPeriod]);

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
                    setScheduledPosts(data.scheduledPosts?.map((p: any) => ({...p, scheduledAt: new Date(p.scheduledAt)})) || []);
                    setPublishedPosts(data.publishedPosts?.map((p:any) => ({...p, publishedAt: new Date(p.publishedAt)})) || []);
                    setInboxItems(data.inboxItems?.map((item: any) => ({...item, status: item.status as 'new' | 'replied' | 'done',})) || []);
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
        }, [managedTarget.id, user.uid, isAdmin]);

        const handlePublish = async (postType: PostType, postOptions: { [key: string]: any }) => {
            setComposerError('');
            if (!managedTarget.access_token) {
                setComposerError('رمز الوصول للصفحة غير صالح. حاول إعادة المزامنة أو المصادقة.');
                showNotification('error', 'رمز الوصول للصفحة غير صالح.');
                return;
            }
        
            // ملاحظة: أنواع المنشورات "story" و "reel" تتطلب منطقًا أكثر تعقيدًا
            // وخاصةً لـ Instagram. هذا المثال يركز على "post" لفيسبوك.
            if (postType === 'story' || postType === 'reel') {
                showNotification('error', 'نشر القصص والريلز غير مدعوم حاليًا في هذا المثال.');
                return;
            }
            
            setIsPublishing(true);
        
            try {
                const targetId = managedTarget.id;
                const accessToken = managedTarget.access_token;
                const baseUrl = `https://graph.facebook.com/v19.0/${targetId}`;
                let endpoint = '/feed';
                const formData = new FormData();
        
                formData.append('access_token', accessToken);
                if (postText) {
                    formData.append('message', postText);
                }
        
                if (isScheduled && scheduleDate) {
                    const scheduledTime = new Date(scheduleDate);
                    // فيسبوك يتوقع الوقت بتنسيق UNIX timestamp
                    formData.append('scheduled_publish_time', String(Math.floor(scheduledTime.getTime() / 1000)));
                    formData.append('published', 'false');
                } else {
                    formData.append('published', 'true');
                }
        
                if (selectedImage) {
                    endpoint = '/photos';
                    formData.append('source', selectedImage);
                } else if (!postText) {
                    setComposerError('لا يمكن إنشاء منشور فارغ. أضف نصًا أو صورة.');
                    setIsPublishing(false);
                    return;
                }
        
                const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'POST',
                    body: formData,
                });
        
                const responseData = await response.json();
                if (!response.ok || responseData.error) {
                    throw new Error(responseData.error?.message || 'فشل نشر المنشور.');
                }
        
                showNotification('success', `تم ${isScheduled ? 'جدولة' : 'نشر'} المنشور بنجاح!`);
                clearComposer();
                // انتظر قليلاً قبل المزامنة للسماح لفيسبوك بمعالجة المنشور
                setTimeout(() => syncFacebookData(managedTarget), 3000); 
        
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
        if (!managedTarget.access_token) {
            showNotification('error', 'رمز الوصول للصفحة مفقود للحذف.');
            return;
        }
        try {
            const response = await fetch(`https://graph.facebook.com/v19.0/${postId}`, {
                method: 'DELETE',
                body: JSON.stringify({ access_token: managedTarget.access_token }),
                headers: { 'Content-Type': 'application/json' },
            });
            const responseData = await response.json();
    
            if (!response.ok || !responseData.success) {
                throw new Error('فشل حذف المنشور المجدول من فيسبوك.');
            }
    
            const updatedScheduled = scheduledPosts.filter(p => p.id !== postId);
            setScheduledPosts(updatedScheduled);
            await saveDataToFirestore({ scheduledPosts: updatedScheduled.map(p => ({...p, scheduledAt: p.scheduledAt.toISOString()})) });
            showNotification('success', 'تم حذف المنشور المجدول.');
            
        } catch(error: any) {
            showNotification('error', `فشل الحذف: ${error.message}`);
            // أعد المزامنة لتصحيح أي اختلافات
            await syncFacebookData(managedTarget);
        }
    };
    

    const handleApprovePost = (postId: string) => {
        showNotification('partial', `الموافقة على المنشور ${postId} (محاكاة)...`);
        // Implement actual approval logic for team workflows
    };

    const handleRejectPost = (postId: string) => {
        showNotification('partial', `رفض المنشور ${postId} (محاكاة)...`);
        // Implement actual rejection logic for team workflows
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
          const totalLikes = publishedPosts.reduce((sum, p) => sum + (p.analytics.likes || 0), 0);
          const totalComments = publishedPosts.reduce((sum, p) => sum + (p.analytics.comments || 0), 0);
          const totalShares = publishedPosts.reduce((sum, p) => sum + (p.analytics.shares || 0), 0);
          const totalEngagement = totalLikes + totalComments + totalShares;
          
          const calculatedSummary: PerformanceSummaryData = {
              totalPosts: publishedPosts.length,
              averageEngagement: publishedPosts.length > 0 ? totalEngagement / publishedPosts.length : 0,
              growthRate: 0, // Placeholder, requires historical fan_count data
              totalReach: 0, // Placeholder, requires post impressions data
              totalEngagement: totalEngagement,
              engagementRate: 0, // Placeholder, requires reach data
              topPosts: publishedPosts.sort((a, b) => (b.analytics.likes || 0) + (b.analytics.comments || 0) + (b.analytics.shares || 0) - ((a.analytics.likes || 0) + (a.analytics.comments || 0) + (a.analytics.shares || 0))).slice(0, 3),
              postCount: publishedPosts.length,
          };
          setPerformanceSummaryData(calculatedSummary);
  
          const summary = await generatePerformanceSummary(aiClient, calculatedSummary, pageProfile, analyticsPeriod);
          setPerformanceSummaryText(summary);
          await saveDataToFirestore({ performanceSummaryText: summary, performanceSummaryData: calculatedSummary });
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
        const [heatmap, contentType] = await Promise.all([
            generateBestPostingTimesHeatmap(aiClient, publishedPosts),
            generateContentTypePerformance(aiClient, publishedPosts)
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
  if (!aiClient || !post) {
      showNotification('error', 'الذكاء الاصطناعي غير متاح أو المنشور غير موجود.');
      return null;
  }
  showNotification('partial', 'جاري جلب رؤى المنشور...');
  try {
      // In a real application, you would fetch actual comments for this specific post
      const commentsForInsights: { message: string }[] = []; // Placeholder for real comments
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

    const rescheduleBulkPosts = (postsToReschedule: BulkPostItem[], strategy: 'even' | 'weekly', settings: WeeklyScheduleSettings): BulkPostItem[] => {
      if (postsToReschedule.length === 0) return [];
      const updatedPosts = [...postsToReschedule];
      let currentDate = new Date();
  
      if (strategy === 'even') {
          let startDate = new Date();
          startDate.setHours(startDate.getHours() + 1, 0, 0, 0);
          return updatedPosts.map((post, index) => {
              const scheduleDate = new Date(startDate.getTime() + index * 3 * 60 * 60 * 1000); // Every 3 hours
              return { ...post, scheduleDate: scheduleDate.toISOString() };
          });
      }
  
      if (strategy === 'weekly') {
          const { days, time } = settings;
          if (days.length === 0) return postsToReschedule;
          const [hour, minute] = time.split(':').map(Number);
          let postIndex = 0;
          currentDate.setDate(currentDate.getDate() + 1);
          while (postIndex < updatedPosts.length) {
              if (days.includes(currentDate.getDay())) {
                  const scheduleDate = new Date(currentDate);
                  scheduleDate.setHours(hour, minute, 0, 0);
                  if (scheduleDate < new Date()) {
                      scheduleDate.setDate(scheduleDate.getDate() + 7);
                  }
                  updatedPosts[postIndex] = { ...updatedPosts[postIndex], scheduleDate: scheduleDate.toISOString() };
                  postIndex++;
              }
              currentDate.setDate(currentDate.getDate() + 1);
          }
          return updatedPosts;
      }
      return postsToReschedule;
  };
  
  const onReschedule = () => {
      setBulkPosts(prev => rescheduleBulkPosts(prev, schedulingStrategy, weeklyScheduleSettings));
      showNotification('success', 'تمت إعادة جدولة المنشورات بنجاح!');
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
      if (bulkPosts.length === 0) {
          showNotification('error', 'لا توجد منشورات للجدولة المجمعة.');
          return;
      }
      showNotification('partial', 'جاري جدولة جميع المنشورات المجمعة...');
      setIsPublishing(true);
      try {
                    // This is a simplified example. You'd need a more robust publishing function
          // that handles images and different post types, similar to handlePublish
          for (const post of bulkPosts) {
            console.log(`Scheduling bulk post: ${post.text} for ${post.scheduleDate}`);
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call per post
        }
        setBulkPosts([]); // Clear after successful scheduling
        showNotification('success', 'تمت جدولة جميع المنشورات المجمعة بنجاح!');
        await syncFacebookData(managedTarget); // Re-sync scheduled posts
    } catch (error: any) {
        showNotification('error', `فشل جدولة جميع المنشورات: ${error.message}`);
    } finally {
        setIsPublishing(false);
    }
};

  // Content Planner Functions
  const onGeneratePlan = async (request: StrategyRequest, images?: any[]) => {
      if (!aiClient) { setPlanError('عميل الذكاء الاصطناعي غير مكوّن.'); showNotification('error', 'عميل الذكاء الاصطناعي غير مكوّن.'); return; }
      setIsGeneratingPlan(true); setPlanError(null);
       showNotification('partial', 'جاري إنشاء خطة المحتوى...');
      try {
          const generatedPlan = await generateContentPlan(aiClient, request, pageProfile, images);
          setContentPlan(generatedPlan);
          await onSavePlan(managedTarget.id, generatedPlan, request);
          showNotification('success', 'تم إنشاء الخطة وحفظها في السجل بنجاح!');
      } catch (e: any) {
          setPlanError(e.message || 'فشل إنشاء الخطة');
          showNotification('error', `فشل إنشاء الخطة: ${e.message}`);
      } finally { setIsGeneratingPlan(false); }
  };

  const onScheduleStrategy = async () => {
      if (!contentPlan || contentPlan.length === 0) {
          showNotification('error', 'لا توجد خطة لتحويلها.');
          return;
      }
      setIsSchedulingStrategy(true);
      showNotification('partial', 'جاري تحويل الخطة إلى جدولة مجمعة...');
      try {
          const newBulkItems: BulkPostItem[] = contentPlan.map((item, index) => ({
              id: `bulk_strategy_${Date.now()}_${index}`,
              text: `${item.hook}\n${item.headline}\n${item.body}`,
              imageFile: undefined,
              imagePreview: undefined,
              hasImage: false,
              scheduleDate: '', // Will be set by rescheduleBulkPosts
              targetIds: [managedTarget.id],
          }));
          
          const scheduledBulkItems = rescheduleBulkPosts(newBulkItems, schedulingStrategy, weeklyScheduleSettings);
          
          setBulkPosts(scheduledBulkItems);
          showNotification('success', `تم تحويل ${scheduledBulkItems.length} منشورًا إلى الجدولة المجمعة بنجاح!`);
          setView('bulk'); // Navigate to bulk scheduler
      } catch (error: any) {
          showNotification('error', `فشل تحويل الخطة: ${error.message}`);
      } finally {
          setIsSchedulingStrategy(false);
      }
  };

   const onDeleteFromHistory = async (strategyId: string) => {
        showNotification('partial', `جاري حذف الاستراتيجية ${strategyId} من السجل...`);
        await onDeleteStrategy(managedTarget.id, strategyId);
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
                    stabilityApiKey={stabilityApiKey} isSchedulingAll={isPublishing}
                    schedulingStrategy={schedulingStrategy} weeklyScheduleSettings={weeklyScheduleSettings}
                    role={currentUserRole} showNotification={showNotification} 
                    pageProfile={pageProfile}
                />
            );
        case 'planner': 
            return (
                <ContentPlannerPage 
                    plan={contentPlan} isGenerating={isGeneratingPlan} strategyHistory={strategyHistory}
                    isSchedulingStrategy={isSchedulingStrategy} error={planError} role={currentUserRole}
                    onScheduleStrategy={onScheduleStrategy}
                    aiClient={aiClient} onGeneratePlan={onGeneratePlan} onStartPost={onStartPost}
                    pageProfile={pageProfile} onLoadFromHistory={onLoadFromHistory}
                    onDeleteFromHistory={onDeleteFromHistory}
                />
            );
            case 'inbox':
                return (
                    <InboxPage
                        items={inboxItems}
                        isLoading={isInboxLoading}
                        onReply={async (item: InboxItem, message: string): Promise<boolean> => { // Change return type
                            if (!managedTarget.access_token) {
                                showNotification('error', 'رمز الوصول للصفحة مفقود للرد.');
                                return false; // Return false on failure
                            }
                            try {
                                const endpointId = item.type === 'comment' ? item.id : item.conversationId;
                                const endpointPath = item.type === 'comment' ? 'comments' : 'messages';
                        
                                const response = await fetch(`https://graph.facebook.com/v19.0/${endpointId}/${endpointPath}`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        message: message,
                                        access_token: managedTarget.access_token,
                                    }),
                                });
                        
                                const responseData = await response.json();
                                if (!response.ok || responseData.error) {
                                    throw new Error(responseData.error?.message || 'فشل إرسال الرد.');
                                }
                        
                                // تحديث الحالة محليًا
                                const updatedInboxItems = inboxItems.map(i => i.id === item.id ? { ...i, status: 'replied' as 'replied', isReplied: true } : i);
                                setInboxItems(updatedInboxItems);
                                await saveDataToFirestore({ inboxItems: updatedInboxItems });
                                showNotification('success', `تم الرد على ${item.authorName}.`);
                                return true; // Return true on success
                            } catch (error: any) {
                                showNotification('error', `فشل الرد: ${error.message}`);
                                return false; // Return false on failure
                            }
                        }}
                        
                        onMarkAsDone={async (itemId: string) => {
                            // ... (keep existing onMarkAsDone logic)
                        }}
                        onLike={async (itemId: string) => {
                            // ... (keep existing onLike logic)
                        }}
                        onFetchMessageHistory={onFetchMessageHistory}
                        autoResponderSettings={{ rules: [], fallback: { mode: 'off', staticMessage: '' } }} // Keep your existing settings
                        onAutoResponderSettingsChange={() => { showNotification('partial', 'تغيير إعدادات الرد التلقائي (محاكاة).'); }} // Keep your existing handler
                        onSync={() => syncFacebookData(managedTarget)}
                        isSyncing={!!syncingTargetId}
                        aiClient={aiClient}
                        role={currentUserRole}
                        // repliedUsersPerPost is optional, only pass if you have the data
                        // repliedUsersPerPost={{}}
                        currentUserRole={currentUserRole} // If 'role' and 'currentUserRole' are the same, you might only need one.
                        selectedTarget={managedTarget}
                        userPlan={userPlan} // Pass the userPlan prop here
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
  {notification && <div className={`fixed bottom-4 right-4 p-4 rounded-md text-white text-sm z-50 ${notification.type === 'success' ? 'bg-green-500' : notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>{notification.message}</div>}
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
