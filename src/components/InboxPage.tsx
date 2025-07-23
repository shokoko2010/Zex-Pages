import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InboxItem, AutoResponderSettings, InboxMessage, Role, Target } from '../types';
import Button from './ui/Button';
import SparklesIcon from './icons/SparklesIcon';
import InboxArrowDownIcon from './icons/InboxArrowDownIcon';
import ChatBubbleOvalLeftEllipsisIcon from './icons/ChatBubbleOvalLeftEllipsisIcon';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon'; // أيقونة جديدة للرسائل
import HandThumbUpIcon from './icons/HandThumbUpIcon'; // أيقونة للإعجاب
import CheckBadgeIcon from './icons/CheckBadgeIcon';
import AutoResponderSettingsModal from './AutoResponderSettingsModal';
import { GoogleGenAI } from '@google/genai';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';

interface InboxPageProps {
  items: InboxItem[];
  isLoading: boolean;
  onReply: (item: InboxItem, message: string) => Promise<boolean>;
  onMarkAsDone: (itemId: string) => void;
  onLike: (itemId: string) => Promise<void>; // <-- جديد: دالة الإعجاب
  onGenerateSmartReplies: (commentText: string) => Promise<string[]>;
  onFetchMessageHistory: (conversationId: string) => void;
  autoResponderSettings: AutoResponderSettings;
  onAutoResponderSettingsChange: (settings: AutoResponderSettings) => void;
  onSync: (targetId: string) => void; // تحديث ليشمل ID
  isSyncing: boolean;
  aiClient: GoogleGenAI | null;
  role: Role;
  repliedUsersPerPost: Record<string, string[]>;
  currentUserRole: Role;
  selectedTarget: Target | null; // إضافة الهدف المحدد
}

// ... (دالة timeSince تبقى كما هي)
const timeSince = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `منذ ${Math.floor(interval)} سنة`;
    interval = seconds / 2592000;
    if (interval > 1) return `منذ ${Math.floor(interval)} شهر`;
    interval = seconds / 86400;
    if (interval > 1) return `منذ ${Math.floor(interval)} يوم`;
    interval = seconds / 3600;
    if (interval > 1) return `منذ ${Math.floor(interval)} ساعة`;
    interval = seconds / 60;
    if (interval > 1) return `منذ ${Math.floor(interval)} دقيقة`;
    return `منذ بضع ثوانٍ`;
}


const FilterButton: React.FC<{label: string, active: boolean, onClick: () => void}> = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
      {label}
    </button>
);

const InboxPage: React.FC<InboxPageProps> = ({
  items,
  isLoading,
  onReply,
  onMarkAsDone,
  onLike,
  onGenerateSmartReplies,
  onFetchMessageHistory,
  autoResponderSettings,
  onAutoResponderSettingsChange,
  onSync,
  isSyncing,
  aiClient,
  role,
  repliedUsersPerPost,
  currentUserRole,
  selectedTarget
}) => {
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [viewFilter, setViewFilter] = useState<'all' | 'messages' | 'comments'>('all');
  const [visibleCount, setVisibleCount] = useState(30);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [replyDisabledReason, setReplyDisabledReason] = useState<string | null>(null);

  const isViewer = role === 'viewer';


  const filteredItems = useMemo(() => {
    if (viewFilter === 'all') return items;
    const typeFilter = viewFilter === 'messages' ? 'message' : 'comment';
    return items.filter(i => i.type === typeFilter);
  }, [items, viewFilter]);

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const hasMore = visibleCount < filteredItems.length;

  useEffect(() => {
    setVisibleCount(30);
  }, [viewFilter]);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback((node: HTMLElement | null) => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasMore) {
        setVisibleCount(prev => prev + 20);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);


  useEffect(() => {
    const currentSelectionIsValid = selectedItem && filteredItems.some(item => item.id === selectedItem.id);
    if (!currentSelectionIsValid && filteredItems.length > 0) {
      setSelectedItem(filteredItems[0]);
    } else if (filteredItems.length === 0) {
      setSelectedItem(null);
    }
  }, [filteredItems, selectedItem]);
  

  useEffect(() => {
    if (selectedItem?.type === 'message' && !selectedItem.messages?.length && selectedItem.conversationId) {
        onFetchMessageHistory(selectedItem.conversationId);
    }
    // ... (بقية المنطق)
  }, [selectedItem, onFetchMessageHistory]);


  const handleItemSelect = (item: InboxItem) => {
    setSelectedItem(item);
    setReplyText('');
    setSmartReplies([]);
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !selectedItem) return;
    setIsReplying(true);
    const success = await onReply(selectedItem, replyText);
    if(success) {
        setReplyText('');
        setSmartReplies([]);
        if (selectedItem.type === 'message' && selectedItem.conversationId) {
          onFetchMessageHistory(selectedItem.conversationId); // إعادة تحميل المحادثة
        }
        // تحديث العنصر المحدد ليعكس حالة الرد
        setSelectedItem(prev => prev ? {...prev, isReplied: true} : null);
    }
    setIsReplying(false);
  };

  const handleLikeClick = async () => {
    if (!selectedItem || selectedItem.type !== 'comment') return;
    await onLike(selectedItem.id);
  };

  // ... (بقية الدوال المساعدة)
  const handleSmartReplyClick = async () => {
    if(!selectedItem || !aiClient) return;
    setIsGeneratingReplies(true);
    try {
      const replies = await onGenerateSmartReplies(selectedItem.text);
      setSmartReplies(replies);
    } catch(e) {
        console.error("Failed to generate smart replies:", e);
    } finally {
      setIsGeneratingReplies(false);
    }
  };

  const renderList = () => {
    if (isLoading && items.length === 0) return <div className="p-4 text-center text-gray-500">جاري تحميل البريد الوارد...</div>;
    if (!selectedTarget) return <div className="p-4 text-center text-gray-500">الرجاء اختيار صفحة أولاً.</div>;
    if (filteredItems.length === 0 && !isLoading) return <div className="p-4 text-center text-gray-500">صندوق الوارد فارغ. كل شيء تم! 🎉</div>;

    return (
        <>
            {visibleItems.map(item => {
                const Icon = item.type === 'message' ? ChatBubbleLeftRightIcon : ChatBubbleOvalLeftEllipsisIcon;
                return (
                    <button key={item.id} onClick={() => handleItemSelect(item)} className={`w-full text-right p-3 border-b dark:border-gray-700 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${selectedItem?.id === item.id ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-white dark:bg-gray-800'}`}>
                        {/* ... (نفس الكود السابق مع تعديل الأيقونة) */}
                        <div className={`relative flex-shrink-0`}>
                            <img src={item.authorPictureUrl} alt={item.authorName} className="w-10 h-10 rounded-full" />
                            <Icon className={`absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-gray-700 rounded-full p-0.5 ${item.type === 'message' ? 'text-purple-500' : 'text-blue-500'}`} />
                        </div>
                        {/* ... */}
                    </button>
                )
            })}
            <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
                {/* ... */}
            </div>
        </>
    );
  }

  const renderDetail = () => {
    if(!selectedItem) return <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-800/50"><InboxArrowDownIcon className="w-16 h-16 mb-4 text-gray-400" /><p>اختر محادثة من القائمة لعرضها والرد عليها.</p></div>;

    const renderReplyArea = () => (
      <div className="mt-auto pt-4 border-t dark:border-gray-700 space-y-3 bg-white dark:bg-gray-800 p-4">
          {/* ... (منطق تعطيل الرد يبقى كما هو) */}
          <div className="relative">
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="اكتب ردك هنا..." className="w-full h-24 p-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700" disabled={!!replyDisabledReason}/>
            <Button onClick={handleReplySubmit} isLoading={isReplying} disabled={!replyText.trim() || !!replyDisabledReason} className="!absolute left-2 top-1/2 -translate-y-1/2 !p-2">
                <PaperAirplaneIcon className="w-5 h-5"/>
            </Button>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                  <Button onClick={handleSmartReplyClick} isLoading={isGeneratingReplies} variant="secondary" disabled={!aiClient || isGeneratingReplies || !!replyDisabledReason}>
                      <SparklesIcon className="w-5 h-5 ml-2" /> اقتراح ردود
                  </Button>
                   {selectedItem.type === 'comment' && (
                        <Button onClick={handleLikeClick} variant="secondary" disabled={isViewer}>
                            <HandThumbUpIcon className="w-5 h-5 ml-2" /> إعجاب
                        </Button>
                    )}
                  {!selectedItem.isReplied &&
                    <Button onClick={() => onMarkAsDone(selectedItem.id)} variant="secondary" disabled={isViewer}>
                        <CheckBadgeIcon className="w-5 h-5 ml-2" /> تمييز كمكتمل
                    </Button>
                  }
              </div>
          </div>
      </div>
    );

    // ... (عرض تفاصيل الرسالة والتعليق يبقى كما هو مع تحسينات طفيفة)
    // For Comments - تحسين عرض المنشور الأصلي
    if (selectedItem.type === 'comment') {
        return (
            <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50">
                <div className="p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                    {/* ... */}
                </div>
    
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  <p className="font-semibold text-gray-500 dark:text-gray-400 mb-2">في الرد على:</p>
                  {selectedItem.post ? (
                    <a href={selectedItem.link} target="_blank" rel="noopener noreferrer" className="block p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                         {selectedItem.post.picture && <img src={selectedItem.post.picture} alt="Post thumbnail" className="w-16 h-16 rounded-md object-cover flex-shrink-0" />}
                         <p className="text-gray-700 dark:text-gray-300 line-clamp-3">{selectedItem.post.message || "منشور بصورة فقط"}</p>
                        </div>
                    </a>
                   ) : (
                    <p className="text-gray-400">سياق المنشور غير متوفر.</p>
                   )}
                </div>
                {renderReplyArea()}
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800">
            <div className="p-4 border-b dark:border-gray-700 flex items-center gap-3 bg-white dark:bg-gray-800 flex-shrink-0">
                {/* ... */}
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                {/* ... */}
            </div>
            {renderReplyArea()}
        </div>
    );
  }

  return (
    <>
    <div className="flex flex-col lg:flex-row h-full max-h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="w-full lg:w-[380px] border-r dark:border-gray-700 flex flex-col flex-shrink-0">
          <div className="p-3 border-b dark:border-gray-700 flex-shrink-0">
             <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {/* ... */}
                </div>
                 <div className="flex items-center gap-2">
                    <Button onClick={() => selectedTarget && onSync(selectedTarget.id)} isLoading={isSyncing} disabled={isSyncing || isViewer || !selectedTarget} variant="secondary" className="!p-2" title="تحديث البريد الوارد">
                      <svg className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-11.667-11.667l3.181 3.183a8.25 8.25 0 010 11.667l-3.181 3.183" /></svg>
                    </Button>
                </div>
            </div>
          </div>
          <div className="overflow-y-auto">
            {renderList()}
          </div>
           {/* ... */}
        </div>
        <div className="w-full lg:w-2/3 flex flex-col">
          {renderDetail()}
        </div>
    </div>
    {/* ... (Modal remains the same) */}
    </>
  );
};

export default InboxPage;
