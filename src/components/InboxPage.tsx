import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InboxItem, AutoResponderSettings, Plan, Role, Target } from '../types';
import Button from './ui/Button';
import SmartReplies from './SmartReplies';
import AiIcon from './icons/AiIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import ThumbUpIcon from './icons/ThumbUpIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import EyeIcon from './icons/EyeIcon';
import QuestionMarkCircleIcon from './icons/QuestionMarkCircleIcon';
import Tooltip from './ui/Tooltip';
import ArrowPathIcon from './icons/ArrowPathIcon';
import { GoogleGenAI } from '@google/genai';
import AutoResponderSettingsModal, { AutoResponderSettingsModalProps } from './AutoResponderSettingsModal';
import { Search, Filter, MoreVertical, Phone, Mail, MessageCircle, Clock, CheckCheck, Circle, CircleDot } from 'lucide-react';

interface InboxPageProps {
    items: InboxItem[];
    isLoading: boolean;
    onReply: (item: InboxItem, message: string) => Promise<boolean>;
    onMarkAsDone: (itemId: string) => Promise<void>;
    onLike: (itemId: string) => Promise<void>;
    onFetchMessageHistory: (conversationId: string) => Promise<void>;
    autoResponderSettings: AutoResponderSettings;
    onAutoResponderSettingsChange: (settings: AutoResponderSettings) => void;
    onSync: () => Promise<void>;
    isSyncing: boolean;
    aiClient: GoogleGenAI | null;
    role: Role;
    repliedUsersPerPost?: { [postId: string]: string[] };
    currentUserRole: Role;
    selectedTarget: Target;
    userPlan: Plan | null;
}

const InboxPage: React.FC<InboxPageProps> = ({
    items, isLoading, onReply, onMarkAsDone, onLike, onFetchMessageHistory,
    autoResponderSettings, onAutoResponderSettingsChange, onSync, isSyncing,
    aiClient, role, repliedUsersPerPost, currentUserRole, userPlan, selectedTarget
}) => {
    const [activeItem, setActiveItem] = useState<InboxItem | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [showAutoResponderSettings, setShowAutoResponderSettings] = useState(false);
    const [smartReplies, setSmartReplies] = useState<string[]>([]);
    const [isGeneratingSmartReplies, setIsGeneratingSmartReplies] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'replied' | 'done'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'comment' | 'message'>('all');
    const [isMobileView, setIsMobileView] = useState(false);
    const [showConversationView, setShowConversationView] = useState(false);
    
    const conversationEndRef = useRef<HTMLDivElement>(null);

    // Check mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobileView(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setShowConversationView(false);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Reset active item when items prop changes
    useEffect(() => {
        if (activeItem) {
            const updatedActiveItem = items.find(item => item.id === activeItem.id);
            if (updatedActiveItem) {
                setActiveItem(updatedActiveItem);
            } else {
                setActiveItem(null);
                setShowConversationView(false);
            }
        }
    }, [items, activeItem]);

    const handleItemClick = (item: InboxItem) => {
        setActiveItem(item);
        setReplyText('');
        setSmartReplies([]);
        
        if (isMobileView) {
            setShowConversationView(true);
        }
        
        if (item.type === 'message' && item.conversationId && !item.messages) {
            onFetchMessageHistory(item.conversationId);
        }
    };

    const handleSendReply = async () => {
        if (!activeItem || !replyText.trim()) return;
        
        setIsSendingReply(true);
        try {
            const success = await onReply(activeItem, replyText);
            if (success) {
                setReplyText('');
                setSmartReplies([]);
            }
        } finally {
            setIsSendingReply(false);
        }
    };

    const handleGenerateSmartReplies = useCallback(async () => {
        if (!aiClient || !activeItem?.text.trim()) return;
        
        setIsGeneratingSmartReplies(true);
        try {
            const generatedReplies: string[] = await (aiClient as any).generateSmartReplies(
                `Generate three concise, professional replies in Arabic for this comment: "${activeItem.text}"`
            );
            setSmartReplies(generatedReplies.filter((reply: string) => reply.trim() !== ''));
        } catch (error) {
            console.error('Failed to generate smart replies:', error);
        } finally {
            setIsGeneratingSmartReplies(false);
        }
    }, [aiClient, activeItem?.text]);

    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeItem?.messages]);

    // Filter and search items
    const filteredItems = useMemo(() => {
        let filtered = items;

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(item => item.status === statusFilter);
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(item => item.type === typeFilter);
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                item.authorName.toLowerCase().includes(query) ||
                item.text.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [items, statusFilter, typeFilter, searchQuery]);

    // Separate comments and messages
    const messages = useMemo(() => filteredItems.filter(item => item.type === 'message'), [filteredItems]);
    const comments = useMemo(() => filteredItems.filter(item => item.type === 'comment'), [filteredItems]);

    const getStatusIcon = (status: string, type: string) => {
        switch (status) {
            case 'new':
                return <CircleDot className="w-3 h-3 text-blue-500 flex-shrink-0" />;
            case 'replied':
                return <CheckCheck className="w-4 h-4 text-green-500 flex-shrink-0" />;
            case 'done':
                return <ArchiveBoxIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />;
            default:
                return <Circle className="w-3 h-3 text-gray-400 flex-shrink-0" />;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'message':
                return <Mail className="w-4 h-4 text-blue-500" />;
            case 'comment':
                return <MessageCircle className="w-4 h-4 text-green-500" />;
            default:
                return <MessageCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) return 'الآن';
        if (diffInHours < 24) return `منذ ${diffInHours} س`;
        if (diffInHours < 48) return 'أمس';
        return date.toLocaleDateString('ar-EG');
    };

    const InboxItemCard: React.FC<{ item: InboxItem }> = ({ item }) => (
        <div
            className={`flex items-center gap-3 p-4 border-b dark:border-gray-700/50 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                activeItem?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500' : ''
            }`}
            onClick={() => handleItemClick(item)}
        >
            <img 
                src={item.authorPictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.authorName)}&background=random`} 
                alt={item.authorName} 
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {item.authorName}
                    </h4>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {getTypeIcon(item.type)}
                        {getStatusIcon(item.status, item.type)}
                    </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                    {item.text}
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(item.timestamp)}
                    </span>
                    {item.type === 'comment' && item.post && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                            على منشور
                        </span>
                    )}
                </div>
            </div>
        </div>
    );

    if (isMobileView && showConversationView && activeItem) {
        return (
            <div className="flex flex-col h-full bg-white dark:bg-gray-800">
                {/* Mobile Conversation Header */}
                <div className="p-4 border-b dark:border-gray-700/50 flex items-center gap-3">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowConversationView(false)}
                    >
                        ←
                    </Button>
                    <img 
                        src={activeItem.authorPictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeItem.authorName)}&background=random`} 
                        alt={activeItem.authorName} 
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-grow">
                        <h3 className="font-semibold text-lg">{activeItem.authorName}</h3>
                        {activeItem.type === 'comment' && activeItem.post && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                على منشور: "{activeItem.post.message ? activeItem.post.message.substring(0, 30) + '...' : 'منشور بدون نص'}"
                            </p>
                        )}
                    </div>
                </div>

                {/* Mobile Conversation Content */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                    <div className={`flex ${activeItem.type === 'comment' ? 'justify-start' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-[80%] ${activeItem.type === 'comment' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'bg-blue-500 text-white'}`}>
                            <p className="text-sm">{activeItem.text}</p>
                            <span className="block text-xs text-right mt-1 opacity-75">
                                {new Date(activeItem.timestamp).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {activeItem.messages && activeItem.messages.map((msg, index) => (
                        <div key={msg.id || index} className={`flex ${msg.from === 'page' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-[80%] ${msg.from === 'page' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                                <p className="text-sm">{msg.text}</p>
                                <span className="block text-xs text-right mt-1 opacity-75">
                                    {new Date(msg.timestamp).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    ))}
                    <div ref={conversationEndRef} />
                </div>

                {/* Mobile Reply Area */}
                <div className="p-4 border-t dark:border-gray-700/50">
                    {smartReplies.length > 0 && (
                        <SmartReplies replies={smartReplies} onSelectReply={(reply: string) => setReplyText(reply)} />
                    )}
                    
                    <div className="flex items-center gap-2">
                        {aiClient && activeItem.type === 'comment' && (
                            <Tooltip content="توليد ردود ذكية">
                                <Button
                                    onClick={handleGenerateSmartReplies}
                                    isLoading={isGeneratingSmartReplies}
                                    variant="secondary"
                                    size="sm"
                                    disabled={isGeneratingSmartReplies || currentUserRole === 'viewer'}
                                >
                                    <AiIcon className={`w-5 h-5 ${isGeneratingSmartReplies ? 'animate-pulse' : ''}`} />
                                </Button>
                            </Tooltip>
                        )}

                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="اكتب ردك هنا..."
                            className="flex-grow px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                            disabled={currentUserRole === 'viewer'}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
                        />
                        <Button 
                            onClick={handleSendReply} 
                            isLoading={isSendingReply} 
                            disabled={!replyText.trim() || isSendingReply || currentUserRole === 'viewer'}
                            size="sm"
                        >
                            <PaperAirplaneIcon className="w-5 h-5 rotate-90" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Sidebar - List of Inbox Items */}
            <div className={`${isMobileView ? 'w-full' : 'w-1/3'} border-r dark:border-gray-700/50 flex flex-col ${isMobileView && showConversationView ? 'hidden' : 'flex'}`}>
                {/* Header */}
                <div className="p-4 border-b dark:border-gray-700/50 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Mail className="w-5 h-5 text-blue-500" />
                            صندوق الوارد
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                                ({filteredItems.length})
                            </span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <Tooltip content={isSyncing ? 'جاري المزامنة...' : 'مزامنة صندوق الوارد'}>
                                <Button 
                                    onClick={onSync} 
                                    isLoading={isSyncing} 
                                    variant="secondary" 
                                    size="sm" 
                                    disabled={isSyncing || currentUserRole === 'viewer'}
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                </Button>
                            </Tooltip>

                            {userPlan?.limits?.autoResponder && (role === 'owner' || role === 'admin') && (
                                <Tooltip content="إعدادات الرد التلقائي">
                                    <Button 
                                        onClick={() => setShowAutoResponderSettings(true)} 
                                        variant="secondary" 
                                        size="sm"
                                    >
                                        <AiIcon className="w-4 h-4" />
                                    </Button>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="بحث في الرسائل والتعليقات..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                            />
                        </div>

                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="all">كل الحالات</option>
                                <option value="new">جديد</option>
                                <option value="replied">تم الرد</option>
                                <option value="done">مكتمل</option>
                            </select>

                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as any)}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                                <option value="all">كل الأنواع</option>
                                <option value="message">رسائل</option>
                                <option value="comment">تعليقات</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items List */}
                <div className="flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            جاري التحميل...
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <h3 className="text-lg font-semibold mb-2">لا توجد رسائل أو تعليقات</h3>
                            <p className="text-sm">
                                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                                    ? 'جرب تغيير_filters أو البحث'
                                    : 'سيظهر هنا الرسائل والتعليقات الجديدة'
                                }
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Messages Section */}
                            {messages.length > 0 && (
                                <div className="border-b dark:border-gray-700/50 pb-2 mb-2">
                                    <h3 className="text-md font-semibold px-3 mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        الرسائل الخاصة ({messages.length})
                                    </h3>
                                    {messages.map(item => (
                                        <InboxItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            )}

                            {/* Comments Section */}
                            {comments.length > 0 && (
                                <div>
                                    <h3 className="text-md font-semibold px-3 mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <MessageCircle className="w-4 h-4" />
                                        تعليقات المنشورات ({comments.length})
                                    </h3>
                                    {comments.map(item => (
                                        <InboxItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Area - Conversation/Comment Thread */}
            <div className={`${isMobileView ? 'hidden' : 'w-2/3'} flex flex-col ${!activeItem ? 'items-center justify-center' : ''}`}>
                {activeItem ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b dark:border-gray-700/50 flex items-center gap-3">
                            <img 
                                src={activeItem.authorPictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeItem.authorName)}&background=random`} 
                                alt={activeItem.authorName} 
                                className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="flex-grow">
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">{activeItem.authorName}</h3>
                                {activeItem.type === 'comment' && activeItem.post && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        على منشور: "{activeItem.post.message ? activeItem.post.message.substring(0, 50) + '...' : 'منشور بدون نص'}"
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Like Button */}
                                {activeItem.type === 'comment' && (
                                    <Tooltip content="إعجاب بالتعليق">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => onLike(activeItem.id)} 
                                            disabled={currentUserRole === 'viewer'}
                                        >
                                            <ThumbUpIcon className="w-4 h-4" />
                                        </Button>
                                    </Tooltip>
                                )}
                                
                                {/* Mark as Done Button */}
                                {activeItem.status !== 'done' && (
                                    <Tooltip content="وضع علامة كمكتملة">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            onClick={() => onMarkAsDone(activeItem.id)} 
                                            disabled={currentUserRole === 'viewer'}
                                        >
                                            <CheckCircleIcon className="w-4 h-4" />
                                        </Button>
                                    </Tooltip>
                                )}
                                
                                {/* View Post Link */}
                                {activeItem.type === 'comment' && activeItem.link && (
                                    <Tooltip content="عرض المنشور">
                                        <a 
                                            href={activeItem.link} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <EyeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </a>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        {/* Conversation Thread */}
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {/* Initial Message */}
                            <div className={`flex ${activeItem.type === 'comment' ? 'justify-start' : 'justify-start'}`}>
                                <div className={`p-4 rounded-2xl max-w-[80%] ${activeItem.type === 'comment' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'bg-blue-500 text-white'}`}>
                                    <p className="text-sm leading-relaxed">{activeItem.text}</p>
                                    <span className="block text-xs text-right mt-2 opacity-75">
                                        {new Date(activeItem.timestamp).toLocaleString('ar-EG')}
                                    </span>
                                </div>
                            </div>

                            {/* Message History */}
                            {activeItem.messages && activeItem.messages.map((msg, index) => (
                                <div key={msg.id || index} className={`flex ${msg.from === 'page' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-4 rounded-2xl max-w-[80%] ${msg.from === 'page' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'}`}>
                                        <p className="text-sm leading-relaxed">{msg.text}</p>
                                        <span className="block text-xs text-right mt-2 opacity-75">
                                            {new Date(msg.timestamp).toLocaleString('ar-EG')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={conversationEndRef} />
                        </div>

                        {/* Reply Area */}
                        <div className="p-4 border-t dark:border-gray-700/50 space-y-3">
                            {/* Smart Replies */}
                            {smartReplies.length > 0 && (
                                <SmartReplies replies={smartReplies} onSelectReply={(reply: string) => setReplyText(reply)} />
                            )}

                            <div className="flex items-end gap-2">
                                {aiClient && activeItem.type === 'comment' && (
                                    <Tooltip content="توليد ردود ذكية بالذكاء الاصطناعي">
                                        <Button
                                            onClick={handleGenerateSmartReplies}
                                            isLoading={isGeneratingSmartReplies}
                                            variant="secondary"
                                            size="sm"
                                            disabled={isGeneratingSmartReplies || currentUserRole === 'viewer'}
                                            className="mb-2"
                                        >
                                            <AiIcon className={`w-5 h-5 ${isGeneratingSmartReplies ? 'animate-pulse' : ''}`} />
                                        </Button>
                                    </Tooltip>
                                )}

                                <div className="flex-grow">
                                    <textarea
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="اكتب ردك هنا..."
                                        rows={2}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        disabled={currentUserRole === 'viewer'}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendReply();
                                            }
                                        }}
                                    />
                                </div>
                                
                                <Button 
                                    onClick={handleSendReply} 
                                    isLoading={isSendingReply} 
                                    disabled={!replyText.trim() || isSendingReply || currentUserRole === 'viewer'}
                                    size="sm"
                                    className="mb-2"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5 rotate-90" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                        <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-semibold mb-2">صندوق الوارد</h3>
                        <p className="mb-4">اختر رسالة أو تعليق لعرض التفاصيل والرد</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto text-sm">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <MessageCircle className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                                <p>تعليقات المنشورات</p>
                            </div>
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <Mail className="w-6 h-6 mx-auto mb-2 text-green-500" />
                                <p>الرسائل الخاصة</p>
                            </div>
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                <AiIcon className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                                <p>ردود ذكية</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Auto Responder Settings Modal */}
            {showAutoResponderSettings && userPlan?.limits?.autoResponder && (currentUserRole === 'owner' || currentUserRole === 'admin') && (
                <AutoResponderSettingsModal
                    isOpen={showAutoResponderSettings}
                    onClose={() => setShowAutoResponderSettings(false)}
                    initialSettings={autoResponderSettings}
                    onSave={onAutoResponderSettingsChange}
                    aiClient={aiClient}
                />
            )}
        </div>
    );
};

export default InboxPage;