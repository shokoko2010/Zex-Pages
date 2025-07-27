import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { InboxItem, AutoResponderSettings, Plan, Role, Target } from '../types';
import Button from './ui/Button';
import SmartReplies from './SmartReplies'; // Assuming this path is correct
import AutoResponderSettingsModal from './AutoResponderSettingsModal'; // Assuming this path is correct
import AiIcon from './icons/AiIcon'; // Assuming this path is correct
import UserCircleIcon from './icons/UserCircleIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import ThumbUpIcon from './icons/ThumbUpIcon'; // Assuming this path is correct
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import EyeIcon from './icons/EyeIcon';
import QuestionMarkCircleIcon from './icons/QuestionMarkCircleIcon'; // Assuming this path is correct
import Tooltip from './ui/Tooltip'; // Assuming this path is correct
import ArrowPathIcon from './icons/ArrowPathIcon'; // Assuming this path is correct
import { GoogleGenAI } from '@google/genai';

// Temporary interface for casting AutoResponderSettingsModal props if it doesn't export its own
// **Ideally, you should fix AutoResponderSettingsModal.tsx to export its props interface.**
interface AutoResponderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings: AutoResponderSettings; // <--- Expected 'initialSettings'
  onSave: (settings: AutoResponderSettings) => void;
  aiClient: GoogleGenAI | null;
}


interface InboxPageProps {
    items: InboxItem[];
    isLoading: boolean;
    onReply: (item: InboxItem, message: string) => Promise<boolean>; // Expects boolean return
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
    aiClient, role, repliedUsersPerPost, currentUserRole, userPlan
}) => {
    const [activeItem, setActiveItem] = useState<InboxItem | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSendingReply, setIsSendingReply] = useState(false);
    const [showAutoResponderSettings, setShowAutoResponderSettings] = useState(false);
    const [smartReplies, setSmartReplies] = useState<string[]>([]);
    const [isGeneratingSmartReplies, setIsGeneratingSmartReplies] = useState(false);
    const conversationEndRef = useRef<HTMLDivElement>(null);


    // Reset active item when items prop changes (e.g., after sync)
    useEffect(() => {
        if (activeItem) {
            const updatedActiveItem = items.find(item => item.id === activeItem.id);
            if (updatedActiveItem) {
                setActiveItem(updatedActiveItem);
            } else {
                setActiveItem(null);
            }
        }
    }, [items, activeItem]);


    const handleItemClick = (item: InboxItem) => {
        setActiveItem(item);
        setReplyText(''); // Clear reply text on new item select
        setSmartReplies([]); // Clear smart replies
        if (item.type === 'message' && item.conversationId && !item.messages) {
            onFetchMessageHistory(item.conversationId);
        }
    };

    const handleSendReply = async () => {
        if (!activeItem || !replyText.trim()) return;
        setIsSendingReply(true);
        const success = await onReply(activeItem, replyText); // Call onReply, which now returns boolean
        if (success) { // Check the boolean result
            setReplyText('');
            setSmartReplies([]); // Clear smart replies after sending
            // The onReply in DashboardPage updates inboxItems, which triggers the useEffect above
            // to refresh the activeItem state.
        }
        setIsSendingReply(false);
    };

    const handleGenerateSmartReplies = useCallback(async () => {
        if (!aiClient || !activeItem?.text.trim()) return;
        setIsGeneratingSmartReplies(true);
        try {
             const generatedReplies: string[] = await (aiClient as any).generateHashtags(`Generate three concise replies for this comment: "${activeItem.text}"`); // Adjust method as per your AI client
             setSmartReplies(generatedReplies.filter((reply: string) => reply.trim() !== ''));
             console.log('Smart replies generated:', generatedReplies); // Log for debugging
        } catch (error) {
             console.error('Failed to generate smart replies:', error); // Log error for debugging
        } finally {
             setIsGeneratingSmartReplies(false);
        }
    }, [aiClient, activeItem?.text]);

    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeItem?.messages]);


    // Separate comments and messages for display
    const messages = useMemo(() => items.filter(item => item.type === 'message'), [items]);
    const comments = useMemo(() => items.filter(item => item.type === 'comment'), [items]);

    return (
        <div className="flex h-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Sidebar - List of Inbox Items */}
            <div className="w-1/3 border-r dark:border-gray-700/50 flex flex-col">
                <div className="p-4 border-b dark:border-gray-700/50 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">صندوق الوارد</h2>
                    <div className="flex items-center space-x-2">
                        <Tooltip content={isSyncing ? 'جاري المزامنة...' : 'مزامنة صندوق الوارد'}>
                             <Button onClick={onSync} isLoading={isSyncing} variant="secondary" size="sm" disabled={isSyncing || currentUserRole === 'viewer'}>
                                <ArrowPathIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                        </Tooltip>

                        {/* Auto Responder Settings (Optional, based on user plan/role) */}
{userPlan?.limits?.autoResponder && (role === 'owner' || role === 'admin') && (
     <AutoResponderSettingsModal
         isOpen={showAutoResponderSettings}
         onClose={() => setShowAutoResponderSettings(false)}
         initialSettings={autoResponderSettings} // Changed from 'settings' to 'initialSettings' previously
         onSave={onAutoResponderSettingsChange}
         aiClient={aiClient} // Add this line to pass the aiClient prop
     />
 )}

                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">جاري التحميل...</div>
                    ) : items.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">لا توجد عناصر في صندوق الوارد.</div>
                    ) : (
                         items.map(item => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-3 p-3 border-b dark:border-gray-700/50 cursor-pointer ${activeItem?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                                onClick={() => handleItemClick(item)}
                            >
                                 <img src={item.authorPictureUrl || 'https://via.placeholder.com/40?text=User'} alt="Avatar" className="w-10 h-10 rounded-full" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.authorName}</p>
                                     <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{item.text}</p>
                                </div>
                                {item.status === 'new' && <span className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></span>}
                                {item.status === 'replied' && <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                {item.status === 'done' && <ArchiveBoxIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Area - Conversation/Comment Thread */}
            <div className="w-2/3 flex flex-col">
                {activeItem ? (
                    <>
                         {/* Header of Active Item */}
                         <div className="p-4 border-b dark:border-gray-700/50 flex items-center gap-3">
                            <img src={activeItem.authorPictureUrl || 'https://via.placeholder.com/40?text=User'} alt="Avatar" className="w-10 h-10 rounded-full" />
                            <div className="flex-grow">
                                <h3 className="font-semibold text-lg">{activeItem.authorName}</h3>
                                {/* Display post preview for comments */}
                                {activeItem.type === 'comment' && activeItem.post && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        على منشور: "{activeItem.post.message ? activeItem.post.message.substring(0, 50) + '...' : 'منشور بدون نص'}"
                                    </p>
                                )}
                            </div>
                            <div className="flex space-x-2">
                                {/* Like Button for Comments */}
                                {activeItem.type === 'comment' && (
                                     <Tooltip content="إعجاب بالتعليق">
                                        <Button variant="secondary" size="sm" onClick={() => onLike(activeItem.id)} disabled={currentUserRole === 'viewer'}>
                                            <ThumbUpIcon className="w-4 h-4" />
                                        </Button>
                                     </Tooltip>
                                )}
                                {/* Mark as Done Button */}
                                {activeItem.status !== 'done' && (
                                    <Tooltip content="وضع علامة كمكتملة">
                                        <Button variant="secondary" size="sm" onClick={() => onMarkAsDone(activeItem.id)} disabled={currentUserRole === 'viewer'}>
                                            <CheckCircleIcon className="w-4 h-4" />
                                        </Button>
                                     </Tooltip>
                                )}
                                {/* View Post Link for Comments */}
                                {activeItem.type === 'comment' && activeItem.link && (
                                     <Tooltip content="عرض المنشور">
                                         <a href={activeItem.link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">
                                            <EyeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </a>
                                    </Tooltip>
                                )}
                            </div>
                        </div>

                        {/* Conversation/Comment Thread */}
                         <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {/* Display the initial item (comment or first message) */}
                             <div className={`flex ${activeItem.type === 'comment' ? 'justify-start' : 'justify-start'}`}>
                                <div className={`p-3 rounded-lg max-w-[80%] ${activeItem.type === 'comment' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100' : 'bg-blue-500 text-white'}`}>
                                     <p className="text-sm">{activeItem.text}</p>
                                    <span className="block text-xs text-right mt-1 opacity-75">
                                        {new Date(activeItem.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Display message history if available */}
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
                            <div ref={conversationEndRef} /> {/* Scroll helper */}
                        </div>


                        {/* Reply Area */}
                        <div className="p-4 border-t dark:border-gray-700/50 flex flex-col gap-2">
                            {/* Smart Replies */}
                            {smartReplies.length > 0 && (
                                 <SmartReplies replies={smartReplies} onSelectReply={(reply: string) => setReplyText(reply)} />
                            )}

                            <div className="flex items-center gap-2">
                                 {aiClient && (activeItem.type === 'comment') && ( // Only show smart replies for comments
                                     <Tooltip content="توليد ردود ذكية بالذكاء الاصطناعي">
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
                                    className="flex-grow px-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100"
                                     disabled={currentUserRole === 'viewer'}
                                />
                                 <Button onClick={handleSendReply} isLoading={isSendingReply} disabled={!replyText.trim() || isSendingReply || currentUserRole === 'viewer'}>
                                     <PaperAirplaneIcon className="w-5 h-5 rotate-90" />
                                    إرسال الرد
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        اختر عنصرًا من صندوق الوارد لعرض التفاصيل والرد.
                    </div>
                )}
            </div>

            {/* Auto Responder Settings Modal */}
            {userPlan?.limits?.autoResponder && (role === 'owner' || role === 'admin') && (
                 <AutoResponderSettingsModal
                     isOpen={showAutoResponderSettings}
                     onClose={() => setShowAutoResponderSettings(false)}
                     initialSettings={autoResponderSettings} // Ensure this is also 'initialSettings'
                     onSave={onAutoResponderSettingsChange}
                     aiClient={aiClient} // Make sure aiClient is also passed here
                 />
             )}

        </div>
    );
};

export default InboxPage;
