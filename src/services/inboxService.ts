import { Target, InboxItem, InboxMessage } from '../types';

export interface InboxServiceConfig {
    target: Target;
    accessToken: string;
}

export class InboxService {
    private config: InboxServiceConfig;

    constructor(config: InboxServiceConfig) {
        this.config = config;
    }

    /**
     * Fetch comments from Facebook posts
     */
    async fetchComments(limit: number = 50): Promise<InboxItem[]> {
        try {
            // First get posts
            const postsResponse = await fetch(
                `https://graph.facebook.com/v19.0/${this.config.target.id}/posts?fields=id,message,created_time,permalink_url&limit=${limit}&access_token=${this.config.accessToken}`
            );
            
            if (!postsResponse.ok) {
                throw new Error('Failed to fetch posts');
            }
            
            const postsData = await postsResponse.json();
            
            if (postsData.error) {
                throw new Error(postsData.error.message);
            }

            const comments: InboxItem[] = [];
            
            // Fetch comments for each post
            for (const post of postsData.data) {
                const commentsResponse = await fetch(
                    `https://graph.facebook.com/v19.0/${post.id}/comments?fields=id,from,message,created_time,permalink_url&limit=${limit}&access_token=${this.config.accessToken}`
                );
                
                if (commentsResponse.ok) {
                    const commentsData = await commentsResponse.json();
                    
                    if (commentsData.data && !commentsData.error) {
                        for (const comment of commentsData.data) {
                            comments.push({
                                id: comment.id,
                                type: 'comment',
                                from: {
                                    id: comment.from.id,
                                    name: comment.from.name,
                                    profilePictureUrl: `https://graph.facebook.com/v19.0/${comment.from.id}/picture?type=small`
                                },
                                text: comment.message,
                                timestamp: comment.created_time,
                                status: 'new',
                                context: 'post_comment',
                                link: comment.permalink_url || post.permalink_url,
                                messages: [],
                                conversationId: comment.id,
                                isReplied: false,
                                authorName: comment.from.name,
                                authorPictureUrl: `https://graph.facebook.com/v19.0/${comment.from.id}/picture?type=small`,
                                post: {
                                    id: post.id,
                                    message: post.message || ''
                                }
                            });
                        }
                    }
                }
            }

            return comments;
        } catch (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }
    }

    /**
     * Fetch private messages/conversations
     */
    async fetchMessages(limit: number = 50): Promise<InboxItem[]> {
        try {
            const conversationsResponse = await fetch(
                `https://graph.facebook.com/v19.0/${this.config.target.id}/conversations?fields=id,participants,messages.limit(${limit}){from,message,created_time}&access_token=${this.config.accessToken}`
            );
            
            if (!conversationsResponse.ok) {
                throw new Error('Failed to fetch conversations');
            }
            
            const conversationsData = await conversationsResponse.json();
            
            if (conversationsData.error) {
                throw new Error(conversationsData.error.message);
            }

            const messages: InboxItem[] = [];
            
            if (conversationsData.data && !conversationsData.error) {
                for (const conversation of conversationsData.data) {
                    // Find the other participant (not the page)
                    const otherParticipant = conversation.participants?.data?.find(
                        (p: any) => p.id !== this.config.target.id
                    );
                    
                    if (!otherParticipant) continue;

                    // Get the last message
                    const lastMessage = conversation.messages?.data?.[0];
                    
                    if (lastMessage && lastMessage.from.id !== this.config.target.id) {
                        messages.push({
                            id: conversation.id,
                            type: 'message',
                            from: {
                                id: otherParticipant.id,
                                name: otherParticipant.name,
                                profilePictureUrl: `https://graph.facebook.com/v19.0/${otherParticipant.id}/picture?type=small`
                            },
                            text: lastMessage.message,
                            timestamp: lastMessage.created_time,
                            status: 'new',
                            context: 'private_message',
                            link: null,
                            messages: conversation.messages?.data?.map((msg: any) => ({
                                id: msg.id,
                                text: msg.message,
                                from: msg.from.id === this.config.target.id ? 'page' : 'user',
                                timestamp: msg.created_time
                            })) || [],
                            conversationId: conversation.id,
                            isReplied: false,
                            authorName: otherParticipant.name,
                            authorPictureUrl: `https://graph.facebook.com/v19.0/${otherParticipant.id}/picture?type=small`
                        });
                    }
                }
            }

            return messages;
        } catch (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }
    }

    /**
     * Fetch message history for a conversation
     */
    async fetchMessageHistory(conversationId: string, limit: number = 50): Promise<InboxMessage[]> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${conversationId}/messages?fields=id,from,message,created_time&limit=${limit}&access_token=${this.config.accessToken}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch message history');
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error.message);
            }

            return (data.data || []).map((msg: any) => ({
                id: msg.id,
                text: msg.message,
                from: msg.from.id === this.config.target.id ? 'page' : 'user',
                timestamp: msg.created_time
            }));
        } catch (error) {
            console.error('Error fetching message history:', error);
            throw error;
        }
    }

    /**
     * Reply to a comment
     */
    async replyToComment(commentId: string, message: string): Promise<boolean> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${commentId}/comments`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        access_token: this.config.accessToken,
                    }),
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to reply to comment');
            }
            
            return true;
        } catch (error) {
            console.error('Error replying to comment:', error);
            throw error;
        }
    }

    /**
     * Send a private message
     */
    async sendPrivateMessage(conversationId: string, message: string): Promise<boolean> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${conversationId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        access_token: this.config.accessToken,
                    }),
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to send message');
            }
            
            return true;
        } catch (error) {
            console.error('Error sending private message:', error);
            throw error;
        }
    }

    /**
     * Like a comment
     */
    async likeComment(commentId: string): Promise<boolean> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${commentId}/likes`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: this.config.accessToken,
                    }),
                }
            );
            
            return response.ok;
        } catch (error) {
            console.error('Error liking comment:', error);
            throw error;
        }
    }

    /**
     * Fetch all inbox items (comments + messages)
     */
    async fetchAllInboxItems(limit: number = 50): Promise<InboxItem[]> {
        try {
            const [comments, messages] = await Promise.all([
                this.fetchComments(limit),
                this.fetchMessages(limit)
            ]);

            // Combine and sort by timestamp
            const allItems = [...comments, ...messages].sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            return allItems;
        } catch (error) {
            console.error('Error fetching inbox items:', error);
            throw error;
        }
    }

    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        try {
            const items = await this.fetchAllInboxItems(100); // Fetch more for accurate count
            return items.filter(item => item.status === 'new').length;
        } catch (error) {
            console.error('Error getting unread count:', error);
            return 0;
        }
    }

    /**
     * Mark items as read/bulk update
     */
    async markItemsAsRead(itemIds: string[]): Promise<void> {
        // This would typically update your local database
        // Facebook API doesn't have a direct "mark as read" for comments/messages
        console.log('Marking items as read:', itemIds);
    }

    /**
     * Delete a comment or message
     */
    async deleteItem(itemId: string, type: 'comment' | 'message'): Promise<boolean> {
        try {
            const response = await fetch(
                `https://graph.facebook.com/v19.0/${itemId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: this.config.accessToken,
                    }),
                }
            );
            
            return response.ok;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }
}

// Factory function to create inbox service
export const createInboxService = (config: InboxServiceConfig): InboxService => {
    return new InboxService(config);
};

// Utility functions
export const inboxUtils = {
    /**
     * Format timestamp for display
     */
    formatTimestamp: (timestamp: string): string => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMinutes < 1) return 'الآن';
        if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
        if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
        if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
        
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Extract mentions from text
     */
    extractMentions: (text: string): string[] => {
        const mentionRegex = /@([a-zA-Z0-9.]+)/g;
        const mentions = [];
        let match;
        
        while ((match = mentionRegex.exec(text)) !== null) {
            mentions.push(match[1]);
        }
        
        return mentions;
    },

    /**
     * Extract hashtags from text
     */
    extractHashtags: (text: string): string[] => {
        const hashtagRegex = /#([a-zA-Z0-9\u0621-\u064A]+)/g;
        const hashtags = [];
        let match;
        
        while ((match = hashtagRegex.exec(text)) !== null) {
            hashtags.push(match[1]);
        }
        
        return hashtags;
    },

    /**
     * Truncate text with ellipsis
     */
    truncateText: (text: string, maxLength: number): string => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    },

    /**
     * Generate avatar URL
     */
    getAvatarUrl: (userId: string, name?: string): string => {
        return `https://graph.facebook.com/v19.0/${userId}/picture?type=small`;
    },

    /**
     * Validate message content
     */
    validateMessage: (message: string): { isValid: boolean; error?: string } => {
        if (!message.trim()) {
            return { isValid: false, error: 'الرسالة لا يمكن أن تكون فارغة' };
        }
        
        if (message.length > 2000) {
            return { isValid: false, error: 'الرسالة طويلة جداً (الحد الأقصى 2000 حرف)' };
        }
        
        if (message.includes('<script>') || message.includes('javascript:')) {
            return { isValid: false, error: 'الرسالة تحتوي على محتوى غير مسموح به' };
        }
        
        return { isValid: true };
    }
};