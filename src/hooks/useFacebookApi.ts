import { useCallback } from 'react';

class FacebookTokenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'FacebookTokenError';
    }
}

// Professional Facebook API helper functions
class RateLimiter {
    private static readonly DEFAULT_DELAY = 200; // Reduced from 1000ms to 200ms
    private static readonly BURST_DELAY = 100; // Reduced from 500ms to 100ms
    private static readonly CONCURRENT_LIMIT = 5; // Allow up to 5 concurrent requests
    private static lastRequestTime = 0;
    private static requestQueue: Array<() => Promise<any>> = [];
    private static isProcessing = false;
    private static activeRequests = 0;

    /**
     * Execute a function with rate limiting
     */
    static async execute<T>(fn: () => Promise<T>, isBurst: boolean = false): Promise<T> {
        const delay = isBurst ? this.BURST_DELAY : this.DEFAULT_DELAY;
        
        // If we have too many active requests, add to queue
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
            // Calculate time to wait
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            const waitTime = Math.max(0, delay - timeSinceLastRequest);
            
            if (waitTime > 0) {
                await this.sleep(waitTime);
            }
            
            // Execute the function
            const result = await fn();
            this.lastRequestTime = Date.now();
            
            return result;
        } finally {
            this.activeRequests--;
            
            // Process next in queue if any
            if (this.requestQueue.length > 0 && this.activeRequests < this.CONCURRENT_LIMIT) {
                const next = this.requestQueue.shift();
                if (next) {
                    // Don't wait for the next one to complete, just trigger it
                    next().catch(console.error);
                }
            }
        }
    }

    /**
     * Execute multiple functions with controlled rate limiting
     */
    static async executeBatch<T>(functions: Array<() => Promise<T>>, options: { maxConcurrent?: number; delay?: number; isBurst?: boolean } = {}): Promise<T[]> {
        const { maxConcurrent = this.CONCURRENT_LIMIT, delay = this.DEFAULT_DELAY, isBurst = false } = options;
        const results: T[] = [];
        
        // Process in batches with higher concurrency
        for (let i = 0; i < functions.length; i += maxConcurrent) {
            const batch = functions.slice(i, i + maxConcurrent);
            
            // Execute batch concurrently
            const batchResults = await Promise.allSettled(
                batch.map(fn => this.execute(fn, isBurst))
            );
            
            // Process results, filtering out rejected promises
            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    console.warn('Batch request failed:', result.reason);
                }
            });
            
            // Minimal delay between batches (except for the last one)
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

    /**
     * Make a professional Facebook API request with error handling and retry logic
     */
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
            
            // Check if this is already a full URL (for pagination)
            if (endpoint.startsWith('https://')) {
                // For full URLs, just execute the request directly
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
            
            // For regular endpoints, construct the URL
            const baseUrl = `https://graph.facebook.com/${this.API_VERSION}`;
            const url = new URL(`${baseUrl}${endpoint}`);
            
            // Add access token and parameters
            url.searchParams.append('access_token', accessToken);
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value)) {
                        url.searchParams.append(key, value.join(','));
                    } else if (typeof value === 'object') {
                        // Serialize objects as JSON strings
                        url.searchParams.append(key, JSON.stringify(value));
                    } else {
                        url.searchParams.append(key, String(value));
                    }
                }
            });

            // Build request options
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

            // Execute with retry logic
            return this.executeWithRetry(url.toString(), fetchOptions);
        });
    }

    /**
     * Execute request with retry logic and enhanced error handling
     */
    private static async executeWithRetry<T>(
        url: string,
        options: RequestInit,
        attempt: number = 1
    ): Promise<T> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

            // Check if this is a full URL (for pagination) or just an endpoint
            const fullUrl = url.startsWith('https://') ? url : `https://graph.facebook.com/${this.API_VERSION}${url}`;

            // Only log in development or for retries
            if (attempt > 1 || process.env.NODE_ENV === 'development') {
                console.log(`🔄 Facebook API Request (Attempt ${attempt}/${this.MAX_RETRIES}):`, {
                    method: options.method,
                    url: fullUrl,
                    timestamp: new Date().toISOString()
                });
            }

            const response = await fetch(fullUrl, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                const errorCode = errorData.error?.code || response.status;
                
                console.error(`❌ Facebook API HTTP Error (${errorCode}):`, {
                    status: response.status,
                    statusText: response.statusText,
                    errorMessage,
                    url: fullUrl,
                    attempt,
                    timestamp: new Date().toISOString()
                });

                throw new Error(`HTTP ${response.status}: ${errorMessage}`);
            }

            const data = await response.json();

            // Check for Facebook API errors
            if (data.error) {
                const fbError = data.error;
                console.error(`❌ Facebook API Error (${fbError.code}):`, {
                    code: fbError.code,
                    message: fbError.message,
                    type: fbError.type,
                    subcode: fbError.subcode,
                    url: fullUrl,
                    attempt,
                    timestamp: new Date().toISOString(),
                    isUserLimit: fbError.code === 4 || fbError.message.includes('limit'),
                    isOAuthError: fbError.code === 190,
                    isPermissionError: fbError.code === 200,
                    isInvalidParameter: fbError.code === 100
                });

                throw this.createApiError(fbError);
            }

            // Only log success in development or for retries
            if (attempt > 1 || process.env.NODE_ENV === 'development') {
                console.log(`✅ Facebook API Success:`, {
                    url: fullUrl,
                    dataSize: JSON.stringify(data).length,
                    attempt,
                    timestamp: new Date().toISOString()
                });
            }

            return data;

        } catch (error) {
            if (attempt >= this.MAX_RETRIES) {
                console.error(`💥 Facebook API Max Retries Reached:`, {
                    error: error instanceof Error ? error.message : error,
                    url,
                    finalAttempt: attempt,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }

            // Don't retry on certain errors
            if (error instanceof Error && this.shouldNotRetry(error)) {
                console.error(`⛔ Facebook API Non-Retryable Error:`, {
                    error: error.message,
                    url,
                    attempt,
                    timestamp: new Date().toISOString(),
                    errorType: this.getErrorType(error)
                });
                throw error;
            }

            // Exponential backoff with jitter
            const baseDelay = 1000 * Math.pow(2, attempt - 1);
            const jitter = Math.random() * 500; // Add randomness to avoid thundering herd
            const delay = baseDelay + jitter;
            
            // Only log retry delays in development
            if (process.env.NODE_ENV === 'development') {
                console.warn(`⏳ Facebook API Retry Delay:`, {
                    currentAttempt: attempt,
                    maxRetries: this.MAX_RETRIES,
                    delay: `${Math.round(delay)}ms`,
                    error: error instanceof Error ? error.message : error,
                    url,
                    timestamp: new Date().toISOString()
                });
            }

            await this.sleep(delay);

            return this.executeWithRetry(url, options, attempt + 1);
        }
    }

    /**
     * Get paginated data with proper handling and rate limiting
     */
    static async getPaginatedData<T = any>(
        endpoint: string,
        params: Record<string, any>,
        accessToken: string,
        maxItems?: number
    ): Promise<T[]> {
        const allData: T[] = [];
        
        // Make initial request
        let response: { data: T[]; paging?: { next?: string; cursors?: { after: string } } } = await this.makeRequest<{ data: T[]; paging?: any }>(
            endpoint,
            { params, accessToken }
        );

        if (response.data) {
            allData.push(...response.data);
        }

        // Handle pagination with rate limiting
        let nextUrl = response.paging?.next || null;
        let pageCount = 0;
        const maxPages = 10; // Limit pagination to prevent excessive requests
        
        while (nextUrl && (!maxItems || allData.length < maxItems) && pageCount < maxPages) {
            pageCount++;
            
            // For pagination URLs, they already contain the access token and all parameters
            const paginatedResponse = await RateLimiter.execute(async () => {
                return this.executeWithRetry<{ data: T[]; paging?: any }>(
                    nextUrl!,
                    { method: 'GET' }
                );
            }, true); // Use burst mode for pagination

            if (paginatedResponse.data) {
                allData.push(...paginatedResponse.data);
            }

            nextUrl = paginatedResponse.paging?.next || null;
            
            // Small delay between pagination requests
            if (nextUrl && pageCount < maxPages) {
                await RateLimiter.sleep(200);
            }
        }

        return maxItems ? allData.slice(0, maxItems) : allData;
    }

    /**
     * Get ad accounts with proper error handling
     */
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

    /**
     * Get campaigns with comprehensive data
     */
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
        
        // Only add fields if there are fields specified
        if (fields && fields.length > 0) {
            params.fields = fields.join(',');
        }
        
        // Only add status filter if there are statuses to filter by
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

    /**
     * Update campaign status with proper validation
     */
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

    /**
     * Get campaign insights with comprehensive fields and improved error handling
     */
    static async getCampaignInsights(
        campaignId: string,
        accessToken: string
    ) {
        // Only log in development mode
        if (process.env.NODE_ENV === 'development') {
            console.log(`📊 Starting campaign insights fetch for ${campaignId}`);
        }
        
        // Use only valid fields for Facebook Ads Insights API
        // Removed 'purchases' field as it's not valid for campaign insights
        const fields = 'spend,impressions,clicks,reach,ctr,cpc,cpp,cpm,frequency,cost_per_result,actions,conversions,website_purchase_roas';
        
        // Try different date ranges and approaches, avoiding complex time_range for now
        const dateConfigs = [
            { date_preset: 'last_30d', time_increment: 'all_days' },
            { date_preset: 'last_7d', time_increment: 'all_days' },
            { date_preset: 'yesterday' },
            { date_preset: 'last_90d', time_increment: 'all_days' },
            // Try basic date ranges without time_increment
            { date_preset: 'last_30d' },
            { date_preset: 'last_7d' },
            { date_preset: 'last_14d' },
            { date_preset: 'this_month' },
            { date_preset: 'last_month' }
        ];
        
        let lastError: any = null;
        
        for (let i = 0; i < dateConfigs.length; i++) {
            const config = dateConfigs[i];
            try {
                // Only log attempts in development mode
                if (process.env.NODE_ENV === 'development') {
                    console.log(`🔄 Attempting campaign insights for ${campaignId} with config ${i + 1}/${dateConfigs.length}:`, config);
                }
                
                const params: any = { fields };
                Object.assign(params, config);
                
                const response = await this.makeRequest(`/${campaignId}/insights`, {
                    params,
                    accessToken,
                });
                
                // Only log responses in development mode
                if (process.env.NODE_ENV === 'development') {
                    console.log(`📈 Campaign insights response for ${campaignId} (config ${i + 1}):`, {
                        hasData: response.data && response.data.length > 0,
                        dataPoints: response.data?.length || 0,
                        config
                    });
                }
                
                // Check if we got valid data
                if (response.data && response.data.length > 0) {
                    const insights = response.data[0];
                    
                    // Validate that we have at least some non-zero data OR the campaign has actually run
                    const hasMeaningfulData = Object.keys(insights).some(key => {
                        const value = insights[key];
                        return value !== '0' && value !== 0 && value !== null && value !== undefined && value !== '';
                    });
                    
                    if (hasMeaningfulData) {
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`✅ Successfully fetched meaningful insights for campaign ${campaignId} with config ${i + 1}`);
                        }
                        return response;
                    } else {
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`⚠️ Campaign ${campaignId} returned all zeros with config ${i + 1}:`, config);
                        }
                    }
                } else {
                    if (process.env.NODE_ENV === 'development') {
                        console.log(`⚠️ No data returned for campaign ${campaignId} with config ${i + 1}:`, config);
                    }
                }
                
            } catch (error) {
                lastError = error;
                
                // Only log errors in development mode or for the final attempt
                if (process.env.NODE_ENV === 'development' || i === dateConfigs.length - 1) {
                    console.warn(`❌ Failed to fetch insights for campaign ${campaignId} with config ${i + 1}:`, {
                        config,
                        error: error instanceof Error ? error.message : error,
                        errorType: error instanceof Error ? this.getErrorType(error) : 'UNKNOWN'
                    });
                }
                
                // If this is the last attempt, log the final error
                if (i === dateConfigs.length - 1) {
                    console.error(`💥 All configs failed for campaign ${campaignId}. Final error:`, {
                        error: lastError,
                        campaignId,
                        totalAttempts: dateConfigs.length
                    });
                }
                
                // Continue to next config
                continue;
            }
        }
        
        // If all configs failed, try a minimal request to see if the campaign exists
        try {
            if (process.env.NODE_ENV === 'development') {
                console.log(`🔍 Attempting minimal request for campaign ${campaignId} to check if it exists...`);
            }
            
            const minimalResponse = await this.makeRequest(`/${campaignId}`, {
                params: { fields: 'id,name,status' },
                accessToken,
            });
            
            if (minimalResponse.id) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`ℹ️ Campaign ${campaignId} exists but has no insights data. Campaign details:`, {
                        id: minimalResponse.id,
                        name: minimalResponse.name,
                        status: minimalResponse.status
                    });
                }
            }
        } catch (campaignError) {
            console.error(`💥 Failed to fetch basic campaign info for ${campaignId}:`, {
                error: campaignError,
                campaignId
            });
        }
        
        // If all attempts failed, return minimal data structure with error info
        if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ All configs failed for campaign ${campaignId}, returning minimal data structure`);
        }
        
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
                _error: 'No data available for this campaign',
                _note: 'Campaign may be new, paused, or not yet started',
                _lastError: lastError instanceof Error ? lastError.message : 'Unknown error'
            }],
            _warning: 'All date configs failed, returning minimal data',
            _campaignId: campaignId,
            _timestamp: new Date().toISOString()
        };
    }

    /**
     * Get campaign sub-entities (ad sets and ads)
     */
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

    /**
     * Upload photo to Facebook
     */
    static async uploadPhoto(
        pageId: string,
        imageData: File | Buffer,
        accessToken: string,
        options: {
            published?: boolean;
            caption?: string;
            targetId?: string;
        } = {}
    ) {
        const formData = new FormData();
        
        if (imageData instanceof File) {
            formData.append('source', imageData);
        } else {
            formData.append('source', new Blob([imageData]));
        }

        formData.append('published', String(options.published ?? false));
        
        if (options.caption) {
            formData.append('message', options.caption);
        }
        
        if (options.targetId) {
            formData.append('target_id', options.targetId);
        }

        return this.makeRequest(`/${pageId}/photos`, {
            method: 'POST',
            body: formData,
            accessToken,
        });
    }

    /**
     * Create post with comprehensive options
     */
    static async createPost(
        pageId: string,
        accessToken: string,
        options: {
            message?: string;
            link?: string;
            photoUrl?: string;
            published?: boolean;
            scheduledPublishTime?: Date;
        } = {}
    ) {
        const body: any = {};

        if (options.message) body.message = options.message;
        if (options.link) body.link = options.link;
        if (options.photoUrl) body.attached_media = [{ media_fbid: options.photoUrl }];
        if (options.published !== undefined) body.published = options.published;
        if (options.scheduledPublishTime) {
            body.scheduled_publish_time = Math.floor(options.scheduledPublishTime.getTime() / 1000);
        }

        return this.makeRequest(`/${pageId}/feed`, {
            method: 'POST',
            body,
            accessToken,
        });
    }

    /**
     * Create API error from Facebook error response
     */
    private static createApiError(error: any): Error {
        const message = `Facebook API Error (${error.code}): ${error.message}`;
        const apiError = new Error(message);
        apiError.name = 'FacebookApiError';
        return apiError;
    }

    /**
     * Determine if we should not retry based on error type
     */
    private static shouldNotRetry(error: Error): boolean {
        // Don't retry on authentication errors
        if (error.message.includes('190') || error.message.includes('OAuthException')) {
            return true;
        }

        // Don't retry on invalid requests
        if (error.message.includes('100') || error.message.includes('Invalid parameter')) {
            return true;
        }

        // Don't retry on permission errors
        if (error.message.includes('200') || error.message.includes('Permission denied')) {
            return true;
        }

        // Don't retry on user request limit errors (these need time to reset)
        if (error.message.includes('4') || error.message.includes('User request limit reached')) {
            return true;
        }

        // Don't retry on app level rate limiting
        if (error.message.includes('17') || error.message.includes('Application request limit reached')) {
            return true;
        }

        return false;
    }

    /**
     * Get error type for logging and categorization
     */
    private static getErrorType(error: Error): string {
        if (error.message.includes('190') || error.message.includes('OAuthException')) {
            return 'AUTHENTICATION_ERROR';
        }
        if (error.message.includes('100') || error.message.includes('Invalid parameter')) {
            return 'INVALID_REQUEST_ERROR';
        }
        if (error.message.includes('200') || error.message.includes('Permission denied')) {
            return 'PERMISSION_ERROR';
        }
        if (error.message.includes('4') || error.message.includes('User request limit reached')) {
            return 'USER_RATE_LIMIT_ERROR';
        }
        if (error.message.includes('17') || error.message.includes('Application request limit reached')) {
            return 'APP_RATE_LIMIT_ERROR';
        }
        if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
            return 'TIMEOUT_ERROR';
        }
        if (error.message.includes('network') || error.message.includes('NETWORK')) {
            return 'NETWORK_ERROR';
        }
        return 'UNKNOWN_ERROR';
    }

    /**
     * Sleep utility for retry delays
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

interface UseFacebookApiProps {
    fbAccessToken: string | null;
    onTokenError: () => void;
    showNotification?: (type: 'success' | 'error' | 'partial', message: string) => void;
    saveDataToFirestore?: (data: { [key: string]: any }) => Promise<void>;
}

export const useFacebookApi = ({ fbAccessToken, onTokenError, showNotification, saveDataToFirestore }: UseFacebookApiProps) => {
    const makeRequestWithRetry = useCallback(async (url: string, accessToken: string): Promise<any> => {
        return FacebookApiHelper.makeRequest(url.includes('https://') ? url.replace('https://graph.facebook.com/' + FacebookApiHelper['API_VERSION'], '') : url, { accessToken });
    }, []);

    const fetchAdCampaigns = useCallback(async (managedTarget: any, showNotification: (type: 'success' | 'error' | 'partial', message: string) => void, fetchWithPagination: (path: string, accessToken?: string) => Promise<any[]>) => {
        if (!fbAccessToken) {
            showNotification('error', 'رمز وصول المستخدم مفقود.');
            return [];
        }

        showNotification('partial', 'جاري جلب جميع الحملات للتحقق من ارتباطها بالصفحة...');
        const validCampaigns = new Map<string, any>();

        try {
            // Step 1: Use professional API helper to get ALL ad accounts.
            const adAccounts = await FacebookApiHelper.getAdAccounts('me', fbAccessToken, ['id', 'name']);

            if (!adAccounts || adAccounts.length === 0) {
                showNotification('error', 'لم يتم العثور على أي حسابات إعلانية متاحة لك.');
                return [];
            }

            showNotification('partial', `تم العثور على ${adAccounts.length} حساب إعلاني. جاري فحص الحملات...`);

            // Step 2: For each ad account, fetch its campaigns and their associated ad creatives.
            const campaignPromises = adAccounts.map(adAccount => {
                // Use basic fields for API call
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

            console.log(`Total campaigns fetched across all accounts for client-side checking: ${allCampaigns.length}`);

            // Step 3: Process the results client-side to find campaigns linked to the page.
            // Since we simplified the fields, we need to fetch ads data separately for each campaign
            for (const campaign of allCampaigns) {
                try {
                    // Fetch ads data for this campaign
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
                            if (ad.creative) {
                                const creative = ad.creative;
                                
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
                    }
                } catch (error) {
                    console.warn(`Could not fetch ads for campaign ${campaign.name} (${campaign.id}):`, error);
                    // Continue processing other campaigns even if this one fails
                }
            }
        
            const finalCampaigns = Array.from(validCampaigns.values());

            if (finalCampaigns.length > 0) {
                // Fetch insights data for campaigns with optimized rate limiting
                const campaignsWithInsights = await RateLimiter.executeBatch(
                    finalCampaigns.map((campaign) => async () => {
                        try {
                            const insights = await FacebookApiHelper.getCampaignInsights(campaign.id, fbAccessToken);
                            
                            // Handle the case where insights might be empty or structured differently
                            const insightsData = insights.data && insights.data.length > 0 ? insights.data[0] : {};
                            
                            // Try to extract spend from different possible sources
                            let spend = insightsData.spend || '0';
                            
                            // If spend is 0, try to calculate from other metrics
                            if (spend === '0' || spend === 0) {
                                const costPerResult = parseFloat(insightsData.cost_per_result || '0');
                                const actions = parseInt(insightsData.actions || '0');
                                const clicks = parseInt(insightsData.clicks || '0');
                                const cpc = parseFloat(insightsData.cpc || '0');
                                
                                // Try to calculate spend from cost_per_result * actions
                                if (costPerResult > 0 && actions > 0) {
                                    spend = (costPerResult * actions).toString();
                                }
                                // Try to calculate spend from cpc * clicks
                                else if (cpc > 0 && clicks > 0) {
                                    spend = (cpc * clicks).toString();
                                }
                            }
                            
                            // Convert spend to number for proper display
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
                    { maxConcurrent: 5, delay: 300 } // Process 5 campaigns at a time with 300ms delay
                );

                // Save campaigns to Firestore
                if (saveDataToFirestore) {
                    await saveDataToFirestore({ adCampaigns: campaignsWithInsights });
                }

                showNotification('success', `تم جلب ${campaignsWithInsights.length} حملة/حملات مرتبطة بهذه الصفحة.`);
                return campaignsWithInsights;
            } else {
                showNotification('error', 'لم يتم العثور على أي حملات إعلانية مرتبطة بهذه الصفحة في جميع حساباتك المتاحة.');
                return [];
            }

        } catch (error: any) {
            console.error('An error occurred while fetching ad accounts or campaigns:', error);
            if (error instanceof FacebookTokenError) {
                onTokenError();
            } else {
                showNotification('error', `فشل البحث عن الحملات: ${error.message}`);
            }
            return [];
        }
    }, [fbAccessToken, onTokenError]);

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

    const handleUploadPhoto = useCallback(async (pageId: string, imageData: File | Buffer, options: { published?: boolean; caption?: string; targetId?: string; } = {}, showNotification: (type: 'success' | 'error' | 'partial', message: string) => void) => {
        if (!fbAccessToken) {
            showNotification('error', 'رمز الوصول مفقود');
            return null;
        }

        try {
            const result = await FacebookApiHelper.uploadPhoto(pageId, imageData, fbAccessToken, options);
            showNotification('success', 'تم رفع الصورة بنجاح');
            return result;
        } catch (error: any) {
            console.error('Error uploading photo:', error);
            if (error instanceof FacebookTokenError) {
                onTokenError();
            } else {
                showNotification('error', `فشل رفع الصورة: ${error.message}`);
            }
            return null;
        }
    }, [fbAccessToken, onTokenError]);

    const publishPost = useCallback(async (
    target: any, 
    message: string, 
    image?: File | null, 
    isScheduled: boolean = false, 
    scheduleDate?: Date | string, 
    includeInstagram: boolean = false, 
    instagramTarget?: any
  ) => {
        if (!fbAccessToken) {
            return null;
        }

        try {
            const options: any = { message };
            
            // Handle image upload if provided
            if (image) {
                const photoResult = await FacebookApiHelper.uploadPhoto(target.id, image, fbAccessToken, {
                    published: !isScheduled,
                    caption: message
                });
                
                if (photoResult?.id) {
                    options.photoUrl = photoResult.id;
                }
            }

            // Handle scheduling
            if (isScheduled && scheduleDate) {
                options.published = false;
                // Convert string to Date if needed
                const scheduledDate = typeof scheduleDate === 'string' ? new Date(scheduleDate) : scheduleDate;
                options.scheduledPublishTime = scheduledDate;
            }

            const result = await FacebookApiHelper.createPost(target.id, fbAccessToken, options);
            return result;
        } catch (error: any) {
            console.error('Error publishing post:', error);
            if (error instanceof FacebookTokenError) {
                onTokenError();
            }
            return null;
        }
    }, [fbAccessToken, onTokenError]);

    return {
        makeRequestWithRetry,
        fetchAdCampaigns,
        handleUpdateCampaignStatus,
        handleUploadPhoto,
        publishPost,
        fetchCampaignSubEntities: (campaignId: string) => fbAccessToken ? FacebookApiHelper.getCampaignSubEntities(campaignId, fbAccessToken) : Promise.resolve({ adSets: [], ads: [] }),
    };
};