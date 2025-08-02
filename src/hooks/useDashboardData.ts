import { useState, useCallback, useEffect } from "react";
import { Target, PublishedPost, ScheduledPost, Draft, InboxItem, PageProfile, PerformanceSummaryData } from "../types";
import { db } from "../services/firebaseService";

class FacebookTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FacebookTokenError";
    }
}

class FacebookApiHelper {
    private static readonly API_VERSION = "v19.0";
    private static readonly MAX_RETRIES = 3;
    private static readonly TIMEOUT = 30000;

    static async makeRequest<T = any>(endpoint: string, options: { method?: "GET" | "POST" | "DELETE"; params?: Record<string, any>; body?: Record<string, any> | FormData; accessToken: string; }): Promise<any> {
        const { method = "GET", params = {}, body, accessToken } = options;
        const baseUrl = `https://graph.facebook.com/${this.API_VERSION}`;
        const url = new URL(`${baseUrl}${endpoint}`);
        
        url.searchParams.append("access_token", accessToken);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) {
                    url.searchParams.append(key, value.join(","));
                } else {
                    url.searchParams.append(key, String(value));
                }
            }
        });

        const fetchOptions: RequestInit = { method, headers: new Headers() };
        if (body) {
            if (body instanceof FormData) {
                fetchOptions.body = body;
            } else {
                (fetchOptions.headers as Headers).set('Content-Type', 'application/json');
                fetchOptions.body = JSON.stringify(body);
            }
        }
        return this.executeWithRetry(url.toString(), fetchOptions);
    }

    private static async executeWithRetry<T>(url: string, options: RequestInit, attempt: number = 1): Promise<T> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                throw new Error(`HTTP ${response.status}: ${errorMessage}`);
            }

            const data = await response.json();
            if (data.error) throw this.createApiError(data.error);
            return data;
        } catch (error) {
            if (attempt >= this.MAX_RETRIES || (error instanceof Error && this.shouldNotRetry(error))) {
                throw error;
            }
            const delay = 1000 * Math.pow(2, attempt - 1);
            await this.sleep(delay);
            return this.executeWithRetry(url, options, attempt + 1);
        }
    }

    static getPagePosts(pageId: string, accessToken: string, limit: number = 50) {
        const fields = "id,message,created_time,permalink_url,full_picture";
        return this.makeRequest(`/${pageId}/posts`, { params: { fields, limit }, accessToken });
    }

    static getPostInsights(postId: string, accessToken: string) {
        const metrics = "post_impressions,post_clicks,post_engagements";
        return this.makeRequest(`/${postId}/insights`, { params: { metric: metrics, period: "lifetime" }, accessToken });
    }
    
    static getPageProfile(pageId: string, accessToken: string) {
        const fields = "id,name,category,description,about,link,picture,cover,fan_count,followers_count";
        return this.makeRequest(`/${pageId}`, { params: { fields }, accessToken });
    }
    
    static getPageInsights(pageId: string, accessToken: string, since: number, until: number) {
        const metrics = ['page_impressions', 'page_post_engagements', 'page_fans'].join(',');
        return this.makeRequest(`/${pageId}/insights`, { params: { metric: metrics, period: 'day', since, until }, accessToken });
    }

    static getAdAccounts(accessToken: string) {
        return this.makeRequest(`/me/adaccounts`, { params: { fields: 'id,name,account_id' }, accessToken });
    }

    static getCampaigns(adAccountId: string, accessToken: string) {
        const fields = 'id,name,status,objective,created_time,daily_budget,lifetime_budget,spend,insights{impressions,reach,clicks,spend}';
        return this.makeRequest(`/act_${adAccountId}/campaigns`, { params: { fields, limit: 100 }, accessToken });
    }

    private static createApiError(error: any): Error {
        const message = `Facebook API Error (${error.code}): ${error.message}`;
        const apiError = new Error(message);
        apiError.name = "FacebookApiError";
        return apiError;
    }

    private static shouldNotRetry(error: Error): boolean {
        return /190|OAuthException|100|Invalid parameter|200|Permission denied/.test(error.message);
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ### MODIFICATION START: Corrected helper functions ###
function processPageInsights(insights: any[], postCount: number): PerformanceSummaryData {
    const summary: PerformanceSummaryData = {
        totalPosts: postCount,
        postCount: postCount, // Added missing property
        totalReach: 0,
        totalEngagement: 0,
        totalImpressions: 0,
        fanCount: 0,
        averageEngagement: 0,
        engagementRate: 0,
        growthRate: 0,
        topPosts: [],
    };

    const impressionsData = insights.find(i => i.name === 'page_impressions')?.values || [];
    const engagementData = insights.find(i => i.name === 'page_post_engagements')?.values || [];
    const fanData = insights.find(i => i.name === 'page_fans')?.values || [];

    summary.totalImpressions = impressionsData.reduce((sum: number, day: { value: number }) => sum + (day.value || 0), 0);
    summary.totalEngagement = engagementData.reduce((sum: number, day: { value: number }) => sum + (day.value || 0), 0);
    summary.fanCount = fanData.length > 0 ? fanData[fanData.length - 1].value : 0;
    summary.totalReach = summary.totalImpressions;

    if (summary.totalReach > 0) {
        summary.engagementRate = (summary.totalEngagement / summary.totalReach) * 100;
    }
    return summary;
}

function processAudienceGrowth(insights: any[]): { date: string, fanCount: number }[] {
    const fanData = insights.find(i => i.name === 'page_fans')?.values || [];
    return fanData.map((day: { value: number; end_time: string }) => ({
        date: day.end_time.split('T')[0], fanCount: day.value,
    }));
}
// ### MODIFICATION END ###

interface UseDashboardDataProps {
    user: any;
    managedTarget: Target;
    fbAccessToken: string | null;
    aiClient: any;
    stabilityApiKey: string | null;
    onTokenError: () => void;
}

export const useDashboardData = ({ user, managedTarget, fbAccessToken, aiClient, stabilityApiKey, onTokenError }: UseDashboardDataProps) => {
    const [publishedPosts, setPublishedPosts] = useState<PublishedPost[]>([]);
    const [publishedPostsLoading, setPublishedPostsLoading] = useState(true);
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
    const [adCampaigns, setAdCampaigns] = useState<any[]>([]);
    const [pageProfile, setPageProfile] = useState<PageProfile>({ description: "", services: "", contactInfo: "", website: "", links: [], currentOffers: "", address: "", country: "", language: "ar", contentGenerationLanguages: ["ar"], ownerUid: "", team: [], members: [] });
    const [currentUserRole, setCurrentUserRole] = useState<"owner" | "admin" | "editor" | "viewer">("owner");
    const [syncingTargetId, setSyncingTargetId] = useState<string | null>(null);
    const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(undefined);
    const [performanceSummaryData, setPerformanceSummaryData] = useState<PerformanceSummaryData | null>(null);
    const [performanceSummaryText, setPerformanceSummaryText] = useState("");
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    const [audienceGrowthData, setAudienceGrowthData] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [contentTypeData, setContentTypePerformanceData] = useState<any[]>([]);
    const [isGeneratingDeepAnalytics, setIsGeneratingDeepAnalytics] = useState(false);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);
    const [audienceCityData, setAudienceCityData] = useState<{ [key: string]: number }>({});
    const [audienceCountryData, setAudienceCountryData] = useState<{ [key: string]: number }>({});

    const getTargetDataRef = useCallback(() => db.collection("targets_data").doc(managedTarget.id), [managedTarget]);

    const saveDataToFirestore = useCallback(async (dataToSave: { [key: string]: any }) => {
        try {
            const cleanedData = Object.fromEntries(
                Object.entries(dataToSave).filter(([_, value]) => value !== undefined)
            );
            await getTargetDataRef().set(cleanedData, { merge: true });
        } catch (error) {
            console.error("Error saving data to Firestore:", error);
        }
    }, [getTargetDataRef]);

    const loadDataFromFirestore = useCallback(async () => {
        if (!user) return;
        setPublishedPostsLoading(true);
        try {
            const doc = await getTargetDataRef().get();
            if (doc.exists) {
                const data = doc.data();
                if (data) {
                    if (data.publishedPosts) setPublishedPosts(data.publishedPosts);
                    if (data.scheduledPosts) setScheduledPosts(data.scheduledPosts);
                    if (data.drafts) setDrafts(data.drafts);
                    if (data.inboxItems) setInboxItems(data.inboxItems);
                    if (data.pageProfile) setPageProfile(data.pageProfile);
                    if (data.lastSyncTime) setLastSyncTime(data.lastSyncTime);
                    if (data.adCampaigns) setAdCampaigns(data.adCampaigns);
                    if (data.performanceSummaryData) setPerformanceSummaryData(data.performanceSummaryData);
                    if (data.performanceSummaryText) setPerformanceSummaryText(data.performanceSummaryText);
                    if (data.audienceGrowthData) setAudienceGrowthData(data.audienceGrowthData);
                    if (data.heatmapData) setHeatmapData(data.heatmapData);
                    if (data.contentTypeData) setContentTypePerformanceData(data.contentTypeData);
                    if (data.audienceCityData) setAudienceCityData(data.audienceCityData);
                    if (data.audienceCountryData) setAudienceCountryData(data.audienceCountryData);
                    
                    if (data.pageProfile?.ownerUid === user.uid) {
                        setCurrentUserRole("owner");
                    } else if (data.pageProfile?.team) {
                        const teamMember = data.pageProfile.team.find((member: any) => member.uid === user.uid);
                        setCurrentUserRole(teamMember?.role || "viewer");
                    }
                }
            }
        } catch (error) {
            console.error("Error loading data from Firestore:", error);
        } finally {
            setPublishedPostsLoading(false);
        }
    }, [user, getTargetDataRef]);

    const syncFacebookData = useCallback(async (target: Target) => {
        if (!target.access_token || !fbAccessToken) {
            console.log("Cannot sync Facebook data: missing access token");
            return;
        }

        console.log(`SYNC STARTED: Analytics and Posts for target: ${target.id}`);
        setSyncingTargetId(target.id);
        setPublishedPostsLoading(true);

        try {
            const postsResponse = await FacebookApiHelper.getPagePosts(target.id, target.access_token);
            const posts = postsResponse.data || [];
            console.log(`Fetched ${posts.length} posts.`);
            const newPublishedPosts = posts.map((post: any) => ({
                id: post.id,
                text: post.message || "",
                publishedAt: new Date(post.created_time),
                imagePreview: post.full_picture || "",
                permalinkUrl: post.permalink_url || "",
                analytics: { likes: 0, comments: 0, shares: 0, impressions: 0, reach: 0, engagedUsers: 0, loading: false },
                pageId: target.id,
                pageName: target.name,
                pageAvatarUrl: target.picture?.data?.url || "",
            }));
            setPublishedPosts(newPublishedPosts);

            const until = Math.floor(Date.now() / 1000);
            const since = until - (30 * 24 * 60 * 60);
            const insightsResponse = await FacebookApiHelper.getPageInsights(target.id, target.access_token, since, until);
            const pageInsights = insightsResponse.data || [];
            console.log(`Fetched ${pageInsights.length} page insight series.`);
            
            const summary = processPageInsights(pageInsights, posts.length);
            const growthData = processAudienceGrowth(pageInsights);
            
            setPerformanceSummaryData(summary);
            setAudienceGrowthData(growthData);

            await saveDataToFirestore({
                publishedPosts: newPublishedPosts,
                performanceSummaryData: summary,
                audienceGrowthData: growthData,
                lastSyncTime: new Date().toISOString(),
                syncStatus: "completed"
            });

            console.log("SYNC COMPLETED: Analytics and Posts sync successful.");

        } catch (error: any) {
            console.error("Error during analytics and posts sync:", error);
            if (error instanceof FacebookTokenError || error.message.includes("190")) {
                onTokenError();
            }
        } finally {
            setSyncingTargetId(null);
            setPublishedPostsLoading(false);
        }
    }, [fbAccessToken, saveDataToFirestore, onTokenError]);

    const syncAdCampaigns = useCallback(async (target: Target) => {
        if (!target.access_token) {
            console.warn("Cannot sync Ad Campaigns: missing access token");
            return;
        }

        console.log(`SYNC STARTED: Ad campaigns for target: ${target.id}`);
        setSyncingTargetId(target.id);

        try {
            const adAccountsResponse = await FacebookApiHelper.getAdAccounts(target.access_token);
            const adAccount = adAccountsResponse.data?.[0];

            if (!adAccount?.id) {
                console.warn("No ad account found for this user's token.");
                setAdCampaigns([]);
                await saveDataToFirestore({ adCampaigns: [] });
                return;
            }
            
            const adAccountId = adAccount.id.replace('act_', '');
            console.log(`Found Ad Account ID: ${adAccountId}`);
            
            const campaignsResponse = await FacebookApiHelper.getCampaigns(adAccountId, target.access_token);
            const campaigns = campaignsResponse.data || [];
            
            setAdCampaigns(campaigns);
            await saveDataToFirestore({ adCampaigns: campaigns });

            console.log(`SYNC COMPLETED: Fetched ${campaigns.length} ad campaigns.`);

        } catch (error: any) {
            console.error("Error syncing Ad Campaigns:", error);
            if (error instanceof FacebookTokenError || error.message.includes("190")) {
                onTokenError();
            }
        } finally {
            setSyncingTargetId(null);
        }
    }, [saveDataToFirestore, onTokenError]);

    const fetchPostInsights = useCallback(async (postId: string) => {
        if (!managedTarget.access_token) return;

        try {
            const insights = await FacebookApiHelper.getPostInsights(postId, managedTarget.access_token);

            const updatedPosts = publishedPosts.map(post => {
                if (post.id === postId) {
                    const impressions = insights.data?.find((d: any) => d.name === "post_impressions")?.values[0]?.value || 0;
                    const reach = insights.data?.find((d: any) => d.name === "post_impressions")?.values[0]?.value || 0;
                    const engagements = insights.data?.find((d: any) => d.name === "post_engagements")?.values[0]?.value;
                    const clicks = insights.data?.find((d: any) => d.name === "post_clicks")?.values[0]?.value || 0;
                    const finalEngagedUsers = engagements || clicks;
                    
                    return {
                        ...post,
                        analytics: { ...post.analytics, impressions, reach, engagedUsers: finalEngagedUsers, lastUpdated: new Date().toISOString() }
                    };
                }
                return post;
            });

            setPublishedPosts(updatedPosts);
            await saveDataToFirestore({ publishedPosts: updatedPosts });
        } catch (error) {
            console.error("Error fetching post insights:", error);
        }
    }, [managedTarget.access_token, publishedPosts, saveDataToFirestore]);

    const fetchPageProfile = useCallback(async () => {
        if (!managedTarget.access_token) return;

        setIsFetchingProfile(true);
        try {
            const profile = await FacebookApiHelper.getPageProfile(managedTarget.id, managedTarget.access_token);
            const newProfile: PageProfile = {
                description: profile.description || profile.about || "",
                services: profile.category || "",
                contactInfo: profile.phone || "",
                website: profile.website || profile.link || "",
                links: [], currentOffers: "", address: profile.location?.street || "", country: profile.location?.country || "",
                language: "ar", contentGenerationLanguages: ["ar"], ownerUid: user?.uid || "", team: [], members: []
            };

            setPageProfile(newProfile);
            await saveDataToFirestore({ pageProfile: newProfile });
        } catch (error: any) {
            console.error("Error fetching page profile:", error);
            if (error instanceof FacebookTokenError || error.message.includes("190")) {
                onTokenError();
            }
        } finally {
            setIsFetchingProfile(false);
        }
    }, [managedTarget.access_token, user?.uid, saveDataToFirestore, onTokenError]);

    // ### MODIFICATION START: Corrected `generatePerformanceSummary` ###
    const generatePerformanceSummary = useCallback(async () => {
        if (!aiClient || publishedPosts.length === 0) return;
        setIsGeneratingSummary(true);
        try {
            const totalLikes = publishedPosts.reduce((sum, post) => sum + (post.analytics?.likes || 0), 0);
            const totalComments = publishedPosts.reduce((sum, post) => sum + (post.analytics?.comments || 0), 0);
            const totalShares = publishedPosts.reduce((sum, post) => sum + (post.analytics?.shares || 0), 0);
            const totalImpressions = publishedPosts.reduce((sum, post) => sum + (post.analytics?.impressions || 0), 0);
            const totalReach = publishedPosts.reduce((sum, post) => sum + (post.analytics?.reach || 0), 0);
            const totalEngagedUsers = publishedPosts.reduce((sum, post) => sum + (post.analytics?.engagedUsers || 0), 0);

            let growthRate = 0;
            if (publishedPosts.length > 1) {
                const sortedPosts = [...publishedPosts].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
                const firstHalf = sortedPosts.slice(0, Math.floor(sortedPosts.length / 2));
                const secondHalf = sortedPosts.slice(Math.floor(sortedPosts.length / 2));
                const firstHalfEngagement = firstHalf.reduce((sum, post) => sum + (post.analytics?.likes || 0) + (post.analytics?.comments || 0), 0);
                const secondHalfEngagement = secondHalf.reduce((sum, post) => sum + (post.analytics?.likes || 0) + (post.analytics?.comments || 0), 0);
                if (firstHalfEngagement > 0) {
                    growthRate = ((secondHalfEngagement - firstHalfEngagement) / firstHalfEngagement) * 100;
                }
            }

            const avgEngagement = publishedPosts.length > 0 ? (totalLikes + totalComments + totalShares) / publishedPosts.length : 0;
            const engagementRate = totalReach > 0 ? ((totalLikes + totalComments + totalShares) / totalReach) * 100 : 0;
            
            const summary = `ملخص الأداء: تم تحليل ${publishedPosts.length} منشور. 
إجمالي التفاعل: ${totalLikes + totalComments + totalShares} (متوسط ${avgEngagement.toFixed(1)} لكل منشور)
الوصول: ${totalReach.toLocaleString()}، الانطباعات: ${totalImpressions.toLocaleString()}
معدل التفاعل: ${engagementRate.toFixed(2)}%
معدل النمو: ${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%
${totalEngagedUsers > 0 ? `المستخدمون المتفاعلون: ${totalEngagedUsers.toLocaleString()}` : ''}`;
            setPerformanceSummaryText(summary);
            
            const performanceData: PerformanceSummaryData = {
                totalPosts: publishedPosts.length,
                postCount: publishedPosts.length, // Added missing property
                averageEngagement: avgEngagement,
                growthRate: Math.round(growthRate * 100) / 100,
                totalReach,
                totalEngagement: totalLikes + totalComments + totalShares,
                engagementRate,
                totalImpressions: totalImpressions, // Added missing property
                fanCount: performanceSummaryData?.fanCount || 0,
                topPosts: publishedPosts.sort((a, b) => ((b.analytics?.likes || 0) + (b.analytics?.comments || 0)) - ((a.analytics?.likes || 0) + (a.analytics?.comments || 0))).slice(0, 3),
            };
            
            setPerformanceSummaryData(performanceData);
            await saveDataToFirestore({ performanceSummaryText: summary, performanceSummaryData: performanceData });
        } catch (error) {
            console.error('Error generating performance summary:', error);
        } finally {
            setIsGeneratingSummary(false);
        }
    }, [aiClient, publishedPosts, saveDataToFirestore, performanceSummaryData]);
    // ### MODIFICATION END ###

    const generateDeepAnalytics = useCallback(async () => {
        if (!aiClient || publishedPosts.length === 0) return;
        setIsGeneratingDeepAnalytics(true);
        try {
            console.log('Generating deep analytics based on post data...');
            
            const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const newHeatmapData: { day: string; hour: number; value: number }[] = [];
            days.forEach(day => {
                for (let hour = 6; hour <= 23; hour += 3) {
                    const postsInSlot = publishedPosts.filter(p => new Date(p.publishedAt).getDay() === days.indexOf(day) && new Date(p.publishedAt).getHours() >= hour && new Date(p.publishedAt).getHours() < hour + 3);
                    const totalEngagement = postsInSlot.reduce((sum: number, post: PublishedPost) => sum + (post.analytics?.likes || 0) + (post.analytics?.comments || 0), 0);
                    if (totalEngagement > 0) {
                        newHeatmapData.push({ day, hour, value: Math.min(Math.floor(totalEngagement / 10) + (postsInSlot.length * 2), 50) });
                    }
                }
            });
            setHeatmapData(newHeatmapData);
            
            const imagePosts = publishedPosts.filter(p => p.imagePreview);
            const textPosts = publishedPosts.filter(p => !p.imagePreview && p.text);
            const imageEngagement = imagePosts.reduce((sum: number, post: PublishedPost) => sum + (post.analytics?.likes || 0) + (post.analytics?.comments || 0), 0);
            const textEngagement = textPosts.reduce((sum: number, post: PublishedPost) => sum + (post.analytics?.likes || 0) + (post.analytics?.comments || 0), 0);

            const newContentTypeData = [
                { type: 'صور', count: imagePosts.length, avgEngagement: imagePosts.length > 0 ? imageEngagement / imagePosts.length : 0 },
                { type: 'نصوص', count: textPosts.length, avgEngagement: textPosts.length > 0 ? textEngagement / textPosts.length : 0 },
            ].filter(item => item.count > 0);
            setContentTypePerformanceData(newContentTypeData);

            await saveDataToFirestore({ heatmapData: newHeatmapData, contentTypeData: newContentTypeData });
        } catch (error) {
            console.error('Error generating deep analytics:', error);
        } finally {
            setIsGeneratingDeepAnalytics(false);
        }
    }, [aiClient, publishedPosts, saveDataToFirestore]);

    useEffect(() => {
        if (user && managedTarget) {
            loadDataFromFirestore();
        }
    }, [user, managedTarget, loadDataFromFirestore]);

    return {
        publishedPosts,
        publishedPostsLoading,
        scheduledPosts,
        drafts,
        inboxItems,
        adCampaigns,
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
        setAdCampaigns,
        setPageProfile,
        setCurrentUserRole,
        setPerformanceSummaryData,
        setPerformanceSummaryText,
        setAudienceGrowthData,
        setHeatmapData,
        setContentTypePerformanceData,
        setAudienceCityData,
        setAudienceCountryData,
        saveDataToFirestore,
        syncFacebookData,
        syncAdCampaigns,
        generatePerformanceSummary,
        generateDeepAnalytics,
        fetchPostInsights,
        fetchPageProfile,
        fetchMessageHistory: async () => {}
    };
};
