import { useCallback } from 'react';

class FacebookTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FacebookTokenError';
    }
}

// Professional Facebook API helper functions
class RateLimiter {
    private static readonly DEFAULT_DELAY = 200;
    private static readonly BURST_DELAY = 100;
    private static readonly CONCURRENT_LIMIT = 5;
    private static lastRequestTime = 0;
    private static requestQueue: Array<() => Promise<any>> = [];
    private static isProcessing = false;
    private static activeRequests = 0;

    static async execute<T>(fn: () => Promise<T>, isBurst: boolean = false): Promise<T> {
        const delay = isBurst ? this.BURST_DELAY : this.DEFAULT_DELAY;
        
        if (this.activeRequests >= this.CONCURRENT_LIMIT) {
            return new Promise((resolve, reject) => {
                this.requestQueue.push(async () => {
                    try {
                        const result = await this.execute(fn, isBurst);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        }

        this.activeRequests++;
        
        try {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            const waitTime = Math.max(0, delay - timeSinceLastRequest);
            
            if (waitTime > 0) {
                await this.sleep(waitTime);
            }
            
            const result = await fn();
            this.lastRequestTime = Date.now();
            
            return result;
        } finally {
            this.activeRequests--;
            
            if (this.requestQueue.length > 0 && this.activeRequests < this.CONCURRENT_LIMIT) {
                const next = this.requestQueue.shift();
                if (next) {
                    next().catch(console.error);
                }
            }
        }
    }

    static async executeBatch<T>(functions: Array<() => Promise<T>>, options: { maxConcurrent?: number; delay?: number; isBurst?: boolean } = {}): Promise<T[]> {
        const { maxConcurrent = this.CONCURRENT_LIMIT, delay = this.DEFAULT_DELAY, isBurst = false } = options;
        const results: T[] = [];
        
        for (let i = 0; i < functions.length; i += maxConcurrent) {
            const batch = functions.slice(i, i + maxConcurrent);
            
            const batchResults = await Promise.allSettled(
                batch.map(fn => this.execute(fn, isBurst))
            );
            
            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    console.warn('Batch request failed:', result.reason);
                }
            });
            
            if (i + maxConcurrent < functions.length) {
                await this.sleep(delay);
            }
        }
        
        return results;
    }

    public static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

class FacebookApiHelper {
    private static readonly API_VERSION = 'v19.0';
    private static readonly MAX_RETRIES = 3;
    private static readonly TIMEOUT = 30000;

    static async makeRequest<T = any>(
        endpoint: string,
        options: {
            method?: 'GET' | 'POST' | 'DELETE';
            params?: Record<string, any>;
            body?: Record<string, any> | FormData;
            accessToken: string;
        }
    ): Promise<T> {
        return RateLimiter.execute(async () => {
            const { method = 'GET', params = {}, body, accessToken } = options;
            
            if (endpoint.startsWith('https://')) {
                const fetchOptions: RequestInit = {
                    method,
                    headers: new Headers(),
                };

                if (body) {
                    if (body instanceof FormData) {
                        fetchOptions.body = body;
                    } else {
                        (fetchOptions.headers as Headers).set('Content-Type', 'application/json');
                        fetchOptions.body = JSON.stringify(body);
                    }
                }

                return this.executeWithRetry(endpoint, fetchOptions);
            }
            
            const baseUrl = `https://graph.facebook.com/${this.API_VERSION}`;
            const url = new URL(`${baseUrl}${endpoint}`);
            
            url.searchParams.append('access_token', accessToken);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                        url.searchParams.append(key, value.join(','));
                    } else if (typeof value === 'object') {
                        url.searchParams.append(key, JSON.stringify(value));
                    } else {
                        url.searchParams.append(key, String(value));
                    }
                }
            });

            const fetchOptions: RequestInit = {
                method,
                headers: new Headers(),
            };

            if (body) {
                if (body instanceof FormData) {
                    fetchOptions.body = body;
                } else {
                    (fetchOptions.headers as Headers).set('Content-Type', 'application/json');
                    fetchOptions.body = JSON.stringify(body);
                }
            }

            return this.executeWithRetry(url.toString(), fetchOptions);
        });
    }

    private static async executeWithRetry<T>(
        url: string,
        options: RequestInit,
        attempt: number = 1
    ): Promise<T> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

            const fullUrl = url.startsWith('https://') ? url : `https://graph.facebook.com/${this.API_VERSION}${url}`;

            const response = await fetch(fullUrl, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                const errorCode = errorData.error?.code || response.status;
                
                throw new Error(`HTTP ${response.status}: ${errorMessage}`);
            }

            const data = await response.json();

            if (data.error) {
                const fbError = data.error;
                throw this.createApiError(fbError);
            }

            return data;

        } catch (error) {
            if (attempt >= this.MAX_RETRIES) {
                throw error;
            }

            if (error instanceof Error && this.shouldNotRetry(error)) {
                throw error;
            }

            const baseDelay = 1000 * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 500;
            const delay = baseDelay + jitter;
            
            await this.sleep(delay);

            return this.executeWithRetry(url, options, attempt + 1);
        }
    }

    static async getPaginatedData<T = any>(
        endpoint: string,
        params: Record<string, any>,
        accessToken: string,
        maxItems?: number
    ): Promise<T[]> {
        const allData: T[] = [];
        
        let response: { data: T[]; paging?: { next?: string; cursors?: { after: string } } } = await this.makeRequest<{ data: T[]; paging?: any }>(
            endpoint,
            { params, accessToken }
        );

        if (response.data) {
            allData.push(...response.data);
        }

        let nextUrl = response.paging?.next || null;
        let pageCount = 0;
        const maxPages = 10;
        
        while (nextUrl && (!maxItems || allData.length < maxItems) && pageCount < maxPages) {
            pageCount++;
            
            const paginatedResponse = await RateLimiter.execute(async () => {
                return this.executeWithRetry<{ data: T[]; paging?: any }>(
                    nextUrl!,
                    { method: 'GET' }
                );
            }, true);

            if (paginatedResponse.data) {
                allData.push(...paginatedResponse.data);
            }

            nextUrl = paginatedResponse.paging?.next || null;
            
            if (nextUrl && pageCount < maxPages) {
                await RateLimiter.sleep(200);
            }
        }

        return maxItems ? allData.slice(0, maxItems) : allData;
    }

    static async getAdAccounts(
        userId: string,
        accessToken: string,
        fields: string[] = ['id', 'name', 'account_status', 'currency']
    ) {
        return this.getPaginatedData(
            `/${userId}/adaccounts`,
            { fields: fields.join(',') },
            accessToken
        );
    }

    static async getCampaigns(
        adAccountId: string,
        accessToken: string,
        options: {
            fields?: string[];
            status?: string[];
            limit?: number;
        } = {}
    ) {
        const {
            fields = ['id', 'name', 'status', 'objective'],
            status = ['ACTIVE', 'PAUSED'],
            limit = 100
        } = options;

        const params: any = {
            limit,
        };
        
        if (fields && fields.length > 0) {
            params.fields = fields.join(',');
        }
        
        if (status && status.length > 0) {
            params.status = status.join(',');
        }

        return this.getPaginatedData(
            `/${adAccountId}/campaigns`,
            params,
            accessToken,
            limit
        );
    }

    static async updateCampaignStatus(
        campaignId: string,
        status: 'ACTIVE' | 'PAUSED',
        accessToken: string
    ) {
        if (!['ACTIVE', 'PAUSED'].includes(status)) {
            throw new Error('Invalid status. Must be ACTIVE or PAUSED');
        }

        return this.makeRequest(`/${campaignId}`, {
            method: 'POST',
            body: { status },
            accessToken,
        });
    }

    // OPTIMIZED: Fast campaign insights for bulk operations
    static async getCampaignInsightsFast(
        campaignId: string,
        accessToken: string
    ) {
        try {
            const fields = 'spend,impressions,clicks,reach,ctr,cpc,cpp,cpm,frequency,cost_per_result,actions,conversions,website_purchase_roas';
            
            const response = await this.makeRequest(`/${campaignId}/insights`, {
                params: {
                    fields,
                    date_preset: 'last_30d'  // Only try the most common date range
                },
                accessToken,
            });
            
            return response;
        } catch (error) {
            // Return minimal data on error for speed
            return {
                data: [{
                    spend: '0',
                    impressions: '0',
                    clicks: '0',
                    reach: '0',
                    ctr: '0',
                    cpc: '0',
                    cpp: '0',
                    cpm: '0',
                    frequency: '0',
                    cost_per_result: '0',
                    actions: '0',
                    conversions: '0',
                    website_purchase_roas: '0',
                    _error: 'Fast fetch failed',
                    _note: 'Using minimal data'
                }]
            };
        }
    }

    // Original comprehensive version for individual campaign details
    static async getCampaignInsights(
        campaignId: string,
        accessToken: string
    ) {
        const fields = 'spend,impressions,clicks,reach,ctr,cpc,cpp,cpm,frequency,cost_per_result,actions,conversions,website_purchase_roas';
        
        // OPTIMIZED: Try only the most common date ranges
        const dateConfigs = [
            { date_preset: 'last_30d' },  // Most common and reliable
            { date_preset: 'last_7d' },   // Second most common
            { date_preset: 'yesterday' }, // For recent campaigns
        ];
        
        let lastError: any = null;
        
        for (let i = 0; i < dateConfigs.length; i++) {
            const config = dateConfigs[i];
            try {
                const params: any = { fields };
                Object.assign(params, config);
                
                const response = await this.makeRequest(`/${campaignId}/insights`, {
                    params,
                    accessToken,
                });
                
                if (response.data && response.data.length > 0) {
                    const insights = response.data[0];
                    
                    const hasMeaningfulData = Object.keys(insights).some(key => {
                        const value = insights[key];
                        return value !== '0' && value !== 0 && value !== null && value !== undefined && value !== '';
                    });
                    
                    if (hasMeaningfulData) {
                        return response;
                    } else {
                        // Return zeros data rather than trying more configs - this is faster
                        return response;
                    }
                }
                
            } catch (error) {
                lastError = error;
                continue;
            }
        }
        
        // Return minimal data if all attempts failed
        return {
            data: [{
                spend: '0',
                impressions: '0',
                clicks: '0',
                reach: '0',
                ctr: '0',
                cpc: '0',
                cpp: '0',
                cpm: '0',
                frequency: '0',
                cost_per_result: '0',
                actions: '0',
                conversions: '0',
                website_purchase_roas: '0',
                _error: 'No data available',
                _note: 'Campaign may be new, paused, or not yet started'
            }]
        };
    }

    static async getCampaignSubEntities(
        campaignId: string,
        accessToken: string
    ) {
        const fetchDetails = async (endpoint: 'adsets' | 'ads') => {
            let fields = '';
            if (endpoint === 'adsets') {
                fields = 'id,name,status,budget,daily_budget,start_time,end_time,targeting';
            } else {
                fields = 'id,name,status,creative{effective_object_story_id,object_id,object_type}';
            }
            
            return this.makeRequest(`/${campaignId}/${endpoint}`, {
                params: { fields },
                accessToken,
            });
        };

        try {
            const [adSets, ads] = await Promise.all([
                fetchDetails('adsets'),
                fetchDetails('ads')
            ]);

            return { 
                adSets: adSets.data || [], 
                ads: ads.data || [] 
            };
        } catch (error) {
            console.error('Error fetching campaign sub-entities:', error);
            return { adSets: [], ads: [] };
        }
    }

    private static createApiError(error: any): Error {
        const message = `Facebook API Error (${error.code}): ${error.message}`;
        const apiError = new Error(message);
        apiError.name = "FacebookApiError";
        return apiError;
    }

    private static shouldNotRetry(error: Error): boolean {
        if (error.message.includes("190") || error.message.includes("OAuthException")) {
            return true;
        }
        if (error.message.includes("100") || error.message.includes("Invalid parameter")) {
            return true;
        }
        if (error.message.includes("200") || error.message.includes("Permission denied")) {
            return true;
        }
        return false;
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private static getErrorType(error: Error): string {
        if (error.message.includes("190") || error.message.includes("OAuthException")) {
            return "TOKEN_ERROR";
        }
        if (error.message.includes("100") || error.message.includes("Invalid parameter")) {
            return "PARAMETER_ERROR";
        }
        if (error.message.includes("200") || error.message.includes("Permission denied")) {
            return "PERMISSION_ERROR";
        }
        if (error.message.includes("4") || error.message.includes("limit")) {
            return "RATE_LIMIT_ERROR";
        }
        return "UNKNOWN_ERROR";
    }
}

export const useFacebookApi = ({
    userId,
    fbAccessToken,
    onTokenError,
    saveDataToFirestore,
    managedTarget
}: {
    userId: string;
    fbAccessToken: string | null;
    onTokenError: () => void;
    saveDataToFirestore?: (data: any) => Promise<void>;
    managedTarget?: any;
}) => {
    const fetchAdCampaigns = useCallback(async (showNotification?: (type: 'success' | 'error' | 'partial', message: string) => void) => {
        if (!fbAccessToken || !managedTarget) {
            showNotification?.('error', 'الرمز المميز أو الصفحة المستهدفة مفقودة');
            return [];
        }

        try {
            console.log('🔍 Starting ad accounts fetch...');
            
            const adAccounts = await FacebookApiHelper.getAdAccounts(userId, fbAccessToken);
            
            if (adAccounts.length === 0) {
                showNotification?.('error', 'لم يتم العثور على حسابات إعلانية متاحة');
                return [];
            }

            showNotification?.('partial', `تم العثور على ${adAccounts.length} حساب إعلاني. جاري فحص الحملات...`);

            const campaignPromises = adAccounts.map(adAccount => {
                return FacebookApiHelper.getCampaigns(adAccount.id, fbAccessToken, {
                    fields: ['id', 'name', 'status', 'objective'],
                    limit: 50
                }).catch(error => {
                    console.warn(`Could not fetch campaigns for ad account ${adAccount.name} (${adAccount.id}):`, error);
                    return [];
                });
            });
            
            const allCampaignsResults = await Promise.all(campaignPromises);
            const allCampaigns = allCampaignsResults.flat();

            console.log(`Total campaigns fetched across all accounts: ${allCampaigns.length}`);

            const validCampaigns = new Map<string, any>();

            for (const campaign of allCampaigns) {
                try {
                    const adsData = await FacebookApiHelper.makeRequest(
                        `/${campaign.id}/ads`,
                        {
                            params: {
                                fields: 'creative{effective_object_story_id,object_type,object_id}'
                            },
                            accessToken: fbAccessToken
                        }
                    );

                    if (adsData.data && adsData.data.length > 0) {
                        for (const ad of adsData.data) {
                            const creative = ad.creative || {};
                            
                            const postPromotionMatch = creative.effective_object_story_id?.startsWith(managedTarget.id + '_');
                            const pageLikeMatch = creative.object_type === 'PAGE' && creative.object_id === managedTarget.id;

                            if (postPromotionMatch || pageLikeMatch) {
                                if (!validCampaigns.has(campaign.id)) {
                                    const reason = postPromotionMatch ? "ترويج لمنشور" : "ترويج للصفحة (إعجابات)";
                                    console.log(`Found matching campaign "${campaign.name}" (ID: ${campaign.id}) because of: ${reason}.`);
                                    validCampaigns.set(campaign.id, campaign);
                                    break; 
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Could not fetch ads for campaign ${campaign.name} (${campaign.id}):`, error);
                }
            }
        
            const finalCampaigns = Array.from(validCampaigns.values());

            if (finalCampaigns.length > 0) {
                console.log(`🚀 Starting FAST insights fetch for ${finalCampaigns.length} campaigns...`);
                
                const campaignsWithInsights = await RateLimiter.executeBatch(
                    finalCampaigns.map((campaign) => async () => {
                        try {
                            // Use the FAST version for bulk operations
                            const insights = await FacebookApiHelper.getCampaignInsightsFast(campaign.id, fbAccessToken);
                            
                            const insightsData = insights.data && insights.data.length > 0 ? insights.data[0] : {};
                            
                            let spend = insightsData.spend || '0';
                            
                            if (spend === '0' || spend === 0) {
                                const costPerResult = parseFloat(insightsData.cost_per_result || '0');
                                const actions = parseInt(insightsData.actions || '0');
                                const clicks = parseInt(insightsData.clicks || '0');
                                const cpc = parseFloat(insightsData.cpc || '0');
                                
                                if (costPerResult > 0 && actions > 0) {
                                    spend = (costPerResult * actions).toString();
                                } else if (cpc > 0 && clicks > 0) {
                                    spend = (cpc * clicks).toString();
                                }
                            }
                            
                            const numericSpend = parseFloat(spend) || 0;
                            
                            return {
                                ...campaign,
                                insights: {
                                    spend: numericSpend > 0 ? numericSpend.toString() : spend,
                                    reach: insightsData.reach || '0',
                                    clicks: insightsData.clicks || '0',
                                    ctr: insightsData.ctr || '0',
                                    cpc: insightsData.cpc || '0',
                                    cpp: insightsData.cpp || '0',
                                    cpm: insightsData.cpm || '0',
                                    impressions: insightsData.impressions || '0',
                                    actions: insightsData.actions || '0',
                                    frequency: insightsData.frequency || '0',
                                    cost_per_result: insightsData.cost_per_result || '0',
                                    conversions: insightsData.conversions || '0',
                                    website_purchase_roas: insightsData.website_purchase_roas || '0',
                                    _calculated_spend: numericSpend > 0
                                }
                            };
                        } catch (error) {
                            console.warn(`Failed to fetch insights for campaign ${campaign.id}:`, error);
                            return {
                                ...campaign,
                                insights: {
                                    spend: '0',
                                    reach: '0',
                                    clicks: '0',
                                    ctr: '0',
                                    cpc: '0',
                                    cpp: '0',
                                    cpm: '0',
                                    impressions: '0',
                                    actions: '0',
                                    frequency: '0',
                                    cost_per_result: '0',
                                    conversions: '0',
                                    website_purchase_roas: '0',
                                    _error: 'Failed to fetch insights'
                                }
                            };
                        }
                    }),
                    { maxConcurrent: 8, delay: 200 } // Increased concurrency for faster processing
                );

                if (saveDataToFirestore) {
                    await saveDataToFirestore({ adCampaigns: campaignsWithInsights });
                }

                showNotification?.('success', `تم جلب ${campaignsWithInsights.length} حملة/حملات مرتبطة بهذه الصفحة بسرعة.`);
                return campaignsWithInsights;
            } else {
                showNotification?.('error', 'لم يتم العثور على أي حملات إعلانية مرتبطة بهذه الصفحة في جميع حساباتك المتاحة.');
                return [];
            }

        } catch (error: any) {
            console.error('An error occurred while fetching ad accounts or campaigns:', error);
            if (error instanceof FacebookTokenError) {
                onTokenError();
            } else {
                showNotification?.('error', `فشل البحث عن الحملات: ${error.message}`);
            }
            return [];
        }
    }, [fbAccessToken, onTokenError, managedTarget, userId, saveDataToFirestore]);

    const handleUpdateCampaignStatus = useCallback(async (campaignId: string, newStatus: 'ACTIVE' | 'PAUSED', showNotification?: (type: 'success' | 'error' | 'partial', message: string) => void, refreshFunction?: () => Promise<void>) => {
        if (!fbAccessToken) {
            showNotification?.('error', 'رمز الوصول مفقود');
            return false;
        }

        try {
            await FacebookApiHelper.updateCampaignStatus(campaignId, newStatus, fbAccessToken);
            showNotification?.('success', `تم تحديث حالة الحملة بنجاح إلى ${newStatus === 'ACTIVE' ? 'نشطة' : 'متوقفة'}`);
            if (refreshFunction) await refreshFunction();
            return true;
        } catch (error: any) {
            console.error('Error updating campaign status:', error);
            if (error instanceof FacebookTokenError) {
                onTokenError();
            } else {
                showNotification?.('error', `فشل تحديث حالة الحملة: ${error.message}`);
            }
            return false;
        }
    }, [fbAccessToken, onTokenError]);

    return {
        fetchAdCampaigns,
        handleUpdateCampaignStatus,
        fetchCampaignSubEntities: (campaignId: string) => fbAccessToken ? FacebookApiHelper.getCampaignSubEntities(campaignId, fbAccessToken) : Promise.resolve({ adSets: [], ads: [] }),
    };
};