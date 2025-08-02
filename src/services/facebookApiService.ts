interface FacebookApiError { code: number; message: string; type: string; subcode?: number; }
interface FacebookApiResponse<T = any> { data?: T; error?: FacebookApiError; paging?: { cursors?: { before: string; after: string; }; next?: string; }; }

class FacebookApiService {
    private config = { version: 'v19.0', maxRetries: 3, retryDelay: 1000, timeout: 30000 };

    async request<T = any>(endpoint: string, options: { method?: 'GET' | 'POST' | 'DELETE'; params?: Record<string, any>; body?: Record<string, any> | FormData; accessToken?: string; } = {}): Promise<FacebookApiResponse<T>> {
        const { method = 'GET', params = {}, body, accessToken } = options;
        if (!accessToken) throw new Error('Access token required');

        const baseUrl = `https://graph.facebook.com/${this.config.version}`;
        const url = new URL(`${baseUrl}${endpoint}`);
        url.searchParams.append('access_token', accessToken);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (Array.isArray(value)) url.searchParams.append(key, value.join(','));
                else url.searchParams.append(key, String(value));
            }
        });

        const fetchOptions: RequestInit = { method, headers: new Headers() };
        if (body) {
            if (body instanceof FormData) fetchOptions.body = body;
            else { (fetchOptions.headers as Headers).set('Content-Type', 'application/json'); fetchOptions.body = JSON.stringify(body); }
        }

        return this.executeWithRetry<T>(url.toString(), fetchOptions);
    }

    private async executeWithRetry<T>(url: string, options: RequestInit, attempt: number = 1): Promise<FacebookApiResponse<T>> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            if (data.error) throw this.createApiError(data.error);
            return data;
        } catch (error) {
            if (attempt >= this.config.maxRetries || (error instanceof Error && this.shouldNotRetry(error))) throw error;
            await this.sleep(this.config.retryDelay * Math.pow(2, attempt - 1));
            return this.executeWithRetry(url, options, attempt + 1);
        }
    }

    async getPaginatedData<T = any>(endpoint: string, params: Record<string, any>, accessToken: string, maxItems?: number): Promise<T[]> {
        const allData: T[] = [];
        let nextUrl: string | null = `${endpoint}?${new URLSearchParams(params).toString()}`;

        while (nextUrl && (!maxItems || allData.length < maxItems)) {
            const apiResponse: FacebookApiResponse<{ data: T[]; paging?: any }> = await this.request<{ data: T[]; paging?: any }>(
                nextUrl.includes('https://') ? nextUrl.replace('https://graph.facebook.com/' + this.config.version, '') : nextUrl,
                { accessToken }
            );

            if (apiResponse?.data) {
                const responseData = apiResponse.data;
                if (Array.isArray(responseData)) {
                    for (let i = 0; i < responseData.length; i++) {
                        allData.push(responseData[i]);
                    }
                }
            }
            if (apiResponse?.paging?.next) {
                nextUrl = apiResponse.paging.next;
            } else if (apiResponse?.paging?.cursors?.after) {
                const currentParams: URLSearchParams = new URLSearchParams(nextUrl.split('?')[1]);
                currentParams.set('after', apiResponse.paging.cursors.after);
                nextUrl = `${endpoint.split('?')[0]}?${currentParams.toString()}`;
            } else nextUrl = null;
        }

        return maxItems ? allData.slice(0, maxItems) : allData;
    }

    async getPagePosts(pageId: string, accessToken: string, options: { limit?: number; fields?: string[]; since?: string; until?: string; } = {}) {
        const { limit = 100, fields = [], since, until } = options;
        const defaultFields = ['id', 'message', 'created_time', 'full_picture', 'permalink_url', 'likes.summary(true)', 'comments.summary(true)', 'shares'];
        const selectedFields = fields.length > 0 ? fields : defaultFields;

        return this.getPaginatedData(`/${pageId}/posts`, { fields: selectedFields.join(','), limit, since, until }, accessToken, limit);
    }

    async getPostInsights(postId: string, accessToken: string, metrics: string[] = ['post_impressions', 'post_clicks']) {
        const validMetrics = ['post_impressions', 'post_clicks', 'post_engagements'];
        const filteredMetrics = metrics.filter(metric => validMetrics.includes(metric));
        if (filteredMetrics.length === 0) throw new Error('No valid metrics provided');

        return this.request(`/${postId}/insights`, { params: { metric: filteredMetrics.join(','), period: 'lifetime' }, accessToken });
    }

    async getPageInsights(pageId: string, accessToken: string, options: { metrics?: string[]; period?: 'day' | 'week' | 'month' | 'lifetime'; datePreset?: string; } = {}) {
        const { metrics = ['page_impressions', 'page_reach', 'page_engaged_users', 'page_fan_adds', 'page_fan_removes', 'page_views_total'], period = 'day', datePreset = 'today_30_days' } = options;
        return this.request(`/${pageId}/insights`, { params: { metric: metrics.join(','), period, date_preset: datePreset }, accessToken });
    }

    async getPageInfo(pageId: string, accessToken: string, fields: string[] = ['id', 'name', 'category', 'about', 'description', 'link', 'phone', 'location', 'website', 'picture', 'cover', 'fan_count', 'followers_count', 'rating_count']) {
        return this.request(`/${pageId}`, { params: { fields: fields.join(',') }, accessToken });
    }

    async getAdAccounts(userId: string, accessToken: string, fields: string[] = ['id', 'name', 'account_status', 'currency']) {
        return this.getPaginatedData(`/${userId}/adaccounts`, { fields: fields.join(',') }, accessToken);
    }

    async getCampaigns(adAccountId: string, accessToken: string, options: { fields?: string[]; status?: string[]; limit?: number; } = {}) {
        const { fields = ['id', 'name', 'status', 'objective', 'created_time', 'start_time', 'stop_time', 'daily_budget', 'lifetime_budget', 'spend', 'insights'], status = ['ACTIVE', 'PAUSED'], limit = 100 } = options;
        return this.getPaginatedData(`/${adAccountId}/campaigns`, { fields: fields.join(','), effective_status: status.join(','), limit }, accessToken, limit);
    }

    async updateCampaignStatus(campaignId: string, status: 'ACTIVE' | 'PAUSED', accessToken: string) {
        if (!['ACTIVE', 'PAUSED'].includes(status)) throw new Error('Invalid status. Must be ACTIVE or PAUSED');
        return this.request(`/${campaignId}`, { method: 'POST', body: { status }, accessToken });
    }

    async getUserAccounts(userId: string, accessToken: string, fields: string[] = ['id', 'name', 'access_token', 'picture{url}', 'category']) {
        return this.getPaginatedData(`/${userId}/accounts`, { fields: fields.join(',') }, accessToken);
    }

    async getInstagramAccounts(pageId: string, accessToken: string, fields: string[] = ['id', 'username', 'ig_id', 'profile_picture_url', 'followers_count']) {
        return this.request(`/${pageId}`, { params: { fields: `instagram_accounts{${fields.join(',')}}` }, accessToken });
    }

    async uploadPhoto(pageId: string, imageData: File | Buffer, accessToken: string, options: { published?: boolean; caption?: string; targetId?: string; } = {}) {
        const formData = new FormData();
        if (imageData instanceof File) formData.append('source', imageData);
        else formData.append('source', new Blob([imageData]));
        formData.append('published', String(options.published ?? false));
        if (options.caption) formData.append('message', options.caption);
        if (options.targetId) formData.append('target_id', options.targetId);
        return this.request(`/${pageId}/photos`, { method: 'POST', body: formData, accessToken });
    }

    async createPost(pageId: string, accessToken: string, options: { message?: string; link?: string; photoUrl?: string; published?: boolean; scheduledPublishTime?: Date; } = {}) {
        const body: any = {};
        if (options.message) body.message = options.message;
        if (options.link) body.link = options.link;
        if (options.photoUrl) body.attached_media = [{ media_fbid: options.photoUrl }];
        if (options.published !== undefined) body.published = options.published;
        if (options.scheduledPublishTime) body.scheduled_publish_time = Math.floor(options.scheduledPublishTime.getTime() / 1000);
        return this.request(`/${pageId}/feed`, { method: 'POST', body, accessToken });
    }

    async getConversations(pageId: string, accessToken: string, options: { limit?: number; fields?: string[]; } = {}) {
        const { limit = 25, fields = ['id', 'participants', 'messages.limit(10){from,message,created_time}'] } = options;
        return this.getPaginatedData(`/${pageId}/conversations`, { fields: fields.join(','), limit }, accessToken, limit);
    }

    private createApiError(error: FacebookApiError): Error {
        const message = `Facebook API Error (${error.code}): ${error.message}`;
        const apiError = new Error(message);
        apiError.name = 'FacebookApiError';
        return apiError;
    }

    private shouldNotRetry(error: Error): boolean {
        return error.message.includes('190') || error.message.includes('OAuthException') ||
               error.message.includes('100') || error.message.includes('Invalid parameter') ||
               error.message.includes('200') || error.message.includes('Permission denied');
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const facebookApiService = new FacebookApiService();
export { FacebookApiService };
export type { FacebookApiError, FacebookApiResponse };