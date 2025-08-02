import React, { useState } from 'react';
import { ScheduledPost, Role, Target, Plan } from '../types';
import PhotoIcon from './icons/PhotoIcon';
import BellIcon from './icons/BellIcon';
import TrashIcon from './icons/TrashIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PencilSquareIcon from './icons/PencilSquareIcon';
import Button from './ui/Button';
import ArrowPathIcon from './icons/ArrowPathIcon';
import CloudIcon from './icons/CloudIcon';
import ClockIcon from './icons/CalendarIcon';
import XCircleIcon from './icons/XCircleIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import CalendarIcon from './icons/CalendarIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import FilterIcon from './icons/QueueListIcon';
import PlusIcon from './icons/PlusIcon';
import EyeIcon from './icons/EyeIcon';
import ArrowDownTrayIcon from './icons/ArrowDownTrayIcon';

interface ContentCalendarProps {
    posts: ScheduledPost[];
    onDelete: (postId: string) => void;
    onEdit: (postId: string) => void;
    onSync: () => void;
    isSyncing: boolean;
    role: Role;
    onApprove: (postId: string) => void;
    onReject: (postId: string) => void;
    managedTarget: Target;
    userPlan: Plan | null;
    onCreatePost: () => void;
}

type CalendarView = 'month' | 'week' | 'day';

const ContentCalendar: React.FC<ContentCalendarProps> = ({ posts, onDelete, onEdit, onSync, isSyncing, role, onApprove, onReject, managedTarget, userPlan, onCreatePost }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarView, setCalendarView] = useState<CalendarView>('month');
    const [showFilters, setShowFilters] = useState(false);
    const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'published' | 'pending'>('all');
    const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

    const isOwner = role === 'owner';
    const isViewer = role === 'viewer';
    const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getPostsForDay = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return posts
            .filter(post => {
                const postDate = new Date(post.scheduledAt);
                const dateMatches = postDate.getFullYear() === date.getFullYear() &&
                                  postDate.getMonth() === date.getMonth() &&
                                  postDate.getDate() === date.getDate();
                
                if (!dateMatches) return false;
                
                // Apply status filter
                if (filterStatus === 'all') return true;
                if (filterStatus === 'scheduled') return !post.publishedAt && post.status === 'scheduled';
                if (filterStatus === 'published') return !!post.publishedAt;
                if (filterStatus === 'pending') return post.status === 'pending';
                
                return true;
            })
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date for accurate comparison

    const isToday = (day: number) => {
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        checkDate.setHours(0,0,0,0);
        return checkDate.getTime() === today.getTime();
    };

    // Calendar statistics
    const getCalendarStats = () => {
        const currentMonthPosts = posts.filter(post => {
            const postDate = new Date(post.scheduledAt);
            return postDate.getFullYear() === currentDate.getFullYear() &&
                   postDate.getMonth() === currentDate.getMonth();
        });

        const publishedCount = currentMonthPosts.filter(post => post.publishedAt).length;
        const scheduledCount = currentMonthPosts.filter(post => !post.publishedAt && post.status === 'scheduled').length;
        const pendingCount = currentMonthPosts.filter(post => post.status === 'pending').length;

        return {
            total: currentMonthPosts.length,
            published: publishedCount,
            scheduled: scheduledCount,
            pending: pendingCount
        };
    };

    const stats = getCalendarStats();

    const handleExportCalendar = () => {
        const csvContent = [
            ['التاريخ', 'الوقت', 'النص', 'الحالة', 'النوع'].join(','),
            ...posts.map(post => [
                new Date(post.scheduledAt).toLocaleDateString('ar-EG'),
                new Date(post.scheduledAt).toLocaleTimeString('ar-EG'),
                `"${post.text || 'منشور بصورة'}"`,
                post.publishedAt ? 'منشور' : post.status === 'pending' ? 'قيد المراجعة' : 'مجدول',
                post.isReminder ? 'تذكير' : 'منشور'
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `calendar-${currentDate.toLocaleDateString('ar-EG')}.csv`;
        link.click();
    };

    const renderCalendarGrid = () => (
        <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border rounded-lg border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/20"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, day) => {
                const currentDay = day + 1;
                const postsForDay = getPostsForDay(currentDay);
                const dateForThisDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDay);
                dateForThisDay.setHours(23, 59, 59, 999); // Set to end of day for past check
                const isPastDay = dateForThisDay < new Date() && !isToday(currentDay);

                return (
                    <div
                        key={currentDay}
                        className={`p-2 border rounded-lg min-h-[120px] transition-colors duration-200 ${
                            isToday(currentDay) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 
                            isPastDay ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50' :
                            'border-gray-200 dark:border-gray-700/50'
                        } ${postsForDay.length > 0 && !isPastDay ? 'bg-gray-50 dark:bg-gray-900/20' : ''}`}
                    >
                        <div className={`font-bold ${
                            isToday(currentDay) ? 'text-blue-600 dark:text-blue-400' : 
                            isPastDay ? 'text-gray-400 dark:text-gray-500' :
                            'text-gray-700 dark:text-gray-300'
                        }`}>
                            {currentDay}
                        </div>
                        <div className="mt-1 space-y-2">
                            {postsForDay.map(post => {
                                const postDate = new Date(post.scheduledAt);
                                const hasBeenPublished = post.publishedAt || (post.isSynced && !post.isReminder && postDate < new Date());
                                const displayDate = post.publishedAt ? new Date(post.publishedAt) : postDate;
                                const isPending = post.status === 'pending';
                                
                                return (
                                    <div key={post.id} className="group relative">
                                       <div className={`p-3 rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                                            isPending
                                                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                                : hasBeenPublished 
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 opacity-80 hover:opacity-100' 
                                                    : post.isReminder 
                                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30' 
                                                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                        }`}
                                        onClick={() => setSelectedPost(post)}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium ${hasBeenPublished ? 'text-gray-600 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'} truncate`}>
                                                        {post.text || 'منشور بصورة'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <span className="font-semibold">{hasBeenPublished ? `نُشر:` : ''} {displayDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <div className="flex items-center gap-1">
                                                            {isPending && <span title="قيد المراجعة"><ClockIcon className="w-3 h-3 text-yellow-500" /></span>}
                                                            {post.isSynced && !hasBeenPublished && !isPending && <span title="تمت المزامنة مع فيسبوك"><CloudIcon className="w-3 h-3 text-blue-400" /></span>}
                                                            {hasBeenPublished && <span title="تم النشر"><CheckCircleIcon className="w-3 h-3 text-green-500" /></span>}
                                                            {post.isReminder && !hasBeenPublished && <span title="تذكير لنشر انستجرام"><BellIcon className="w-3 h-3 text-purple-500" /></span>}
                                                            {(post.imageUrl || post.hasImage) && <PhotoIcon className="w-3 h-3" />}
                                                            {post.targetInfo && <img className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-gray-700" src={post.targetInfo.avatarUrl} alt={post.targetInfo.name}/>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <EyeIcon className="w-3 h-3 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                            <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                {isOwner && isPending && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); onApprove(post.id); }} className="p-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors" title="الموافقة"><CheckCircleIcon className="w-3 h-3" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); onReject(post.id); }} className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="الرفض"><XCircleIcon className="w-3 h-3" /></button>
                                                    </>
                                                )}
                                                {!hasBeenPublished && !post.isReminder && !isPending && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEdit(post.id); }}
                                                        className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <PencilSquareIcon className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(post.postId || post.id); }}
                                                    className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                                                    aria-label="حذف"
                                                    title="حذف"
                                                >
                                                    <TrashIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);
        
        const weekDays = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });

        return (
            <div className="grid grid-cols-7 gap-4">
                {weekDays.map((date, index) => {
                    const postsForDay = posts.filter(post => {
                        const postDate = new Date(post.scheduledAt);
                        return postDate.toDateString() === date.toDateString();
                    }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

                    const isToday = date.toDateString() === today.toDateString();

                    return (
                        <div
                            key={index}
                            className={`p-4 border rounded-lg min-h-[400px] ${
                                isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 
                                'border-gray-200 dark:border-gray-700/50'
                            }`}
                        >
                            <div className={`font-bold mb-2 ${
                                isToday ? 'text-blue-600 dark:text-blue-400' : 
                                'text-gray-700 dark:text-gray-300'
                            }`}>
                                {daysOfWeek[index]}
                                <div className="text-sm font-normal">{date.getDate()}</div>
                            </div>
                            <div className="space-y-2">
                                {postsForDay.map(post => {
                                    const postDate = new Date(post.scheduledAt);
                                    const hasBeenPublished = post.publishedAt || (post.isSynced && !post.isReminder && postDate < new Date());
                                    const displayDate = post.publishedAt ? new Date(post.publishedAt) : postDate;
                                    const isPending = post.status === 'pending';
                                    
                                    return (
                                        <div key={post.id} className="group relative">
                                            <div className={`p-3 rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                                                isPending
                                                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                                    : hasBeenPublished 
                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 opacity-80 hover:opacity-100' 
                                                        : post.isReminder 
                                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30' 
                                                            : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                            }`}
                                            onClick={() => setSelectedPost(post)}>
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-medium ${hasBeenPublished ? 'text-gray-600 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'} truncate`}>
                                                            {post.text || 'منشور بصورة'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <span className="font-semibold">{hasBeenPublished ? `نُشر:` : ''} {displayDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <div className="flex items-center gap-1">
                                                                {isPending && <span title="قيد المراجعة"><ClockIcon className="w-3 h-3 text-yellow-500" /></span>}
                                                                {post.isSynced && !hasBeenPublished && !isPending && <span title="تمت المزامنة مع فيسبوك"><CloudIcon className="w-3 h-3 text-blue-400" /></span>}
                                                                {hasBeenPublished && <span title="تم النشر"><CheckCircleIcon className="w-3 h-3 text-green-500" /></span>}
                                                                {post.isReminder && !hasBeenPublished && <span title="تذكير لنشر انستجرام"><BellIcon className="w-3 h-3 text-purple-500" /></span>}
                                                                {(post.imageUrl || post.hasImage) && <PhotoIcon className="w-3 h-3" />}
                                                                {post.targetInfo && <img className="inline-block h-4 w-4 rounded-full ring-1 ring-white dark:ring-gray-700" src={post.targetInfo.avatarUrl} alt={post.targetInfo.name}/>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <EyeIcon className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                            {!isViewer && (
                                                <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    {isOwner && isPending && (
                                                        <>
                                                            <button onClick={(e) => { e.stopPropagation(); onApprove(post.id); }} className="p-1 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors" title="الموافقة"><CheckCircleIcon className="w-3 h-3" /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); onReject(post.id); }} className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="الرفض"><XCircleIcon className="w-3 h-3" /></button>
                                                        </>
                                                    )}
                                                    {!hasBeenPublished && !post.isReminder && !isPending && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onEdit(post.id); }}
                                                            className="p-1 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                                            title="تعديل"
                                                        >
                                                            <PencilSquareIcon className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDelete(post.postId || post.id); }}
                                                        className="p-1 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                                                        aria-label="حذف"
                                                        title="حذف"
                                                    >
                                                        <TrashIcon className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const postsForDay = posts.filter(post => {
            const postDate = new Date(post.scheduledAt);
            return postDate.toDateString() === currentDate.toDateString();
        }).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        const isToday = currentDate.toDateString() === today.toDateString();

        return (
            <div className="space-y-4">
                <div className={`p-6 border rounded-lg ${
                    isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 
                    'border-gray-200 dark:border-gray-700/50'
                }`}>
                    <div className={`font-bold text-lg mb-4 ${
                        isToday ? 'text-blue-600 dark:text-blue-400' : 
                        'text-gray-700 dark:text-gray-300'
                    }`}>
                        {currentDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    
                    {postsForDay.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>لا توجد منشورات مجدولة لهذا اليوم</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {postsForDay.map(post => {
                                const postDate = new Date(post.scheduledAt);
                                const hasBeenPublished = post.publishedAt || (post.isSynced && !post.isReminder && postDate < new Date());
                                const displayDate = post.publishedAt ? new Date(post.publishedAt) : postDate;
                                const isPending = post.status === 'pending';
                                
                                return (
                                    <div key={post.id} className="group relative">
                                        <div className={`p-4 rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
                                            isPending
                                                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                                : hasBeenPublished 
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 opacity-80 hover:opacity-100' 
                                                    : post.isReminder 
                                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30' 
                                                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                        }`}
                                        onClick={() => setSelectedPost(post)}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-base font-medium ${hasBeenPublished ? 'text-gray-600 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-100'} mb-2`}>
                                                        {post.text || 'منشور بصورة'}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                        <span className="font-semibold">{hasBeenPublished ? `نُشر:` : 'الوقت:'} {displayDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <div className="flex items-center gap-2">
                                                            {isPending && <span title="قيد المراجعة" className="flex items-center gap-1"><ClockIcon className="w-4 h-4 text-yellow-500" /> قيد المراجعة</span>}
                                                            {post.isSynced && !hasBeenPublished && !isPending && <span title="تمت المزامنة مع فيسبوك" className="flex items-center gap-1"><CloudIcon className="w-4 h-4 text-blue-400" /> تمت المزامنة</span>}
                                                            {hasBeenPublished && <span title="تم النشر" className="flex items-center gap-1"><CheckCircleIcon className="w-4 h-4 text-green-500" /> منشور</span>}
                                                            {post.isReminder && !hasBeenPublished && <span title="تذكير لنشر انستجرام" className="flex items-center gap-1"><BellIcon className="w-4 h-4 text-purple-500" /> تذكير</span>}
                                                            {(post.imageUrl || post.hasImage) && <span title="يحتوي على صورة" className="flex items-center gap-1"><PhotoIcon className="w-4 h-4" /> صورة</span>}
                                                            {post.targetInfo && <img className="inline-block h-5 w-5 rounded-full ring-1 ring-white dark:ring-gray-700" src={post.targetInfo.avatarUrl} alt={post.targetInfo.name}/>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <EyeIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                {isOwner && isPending && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); onApprove(post.id); }} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors" title="الموافقة"><CheckCircleIcon className="w-4 h-4" /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); onReject(post.id); }} className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors" title="الرفض"><XCircleIcon className="w-4 h-4" /></button>
                                                    </>
                                                )}
                                                {!hasBeenPublished && !post.isReminder && !isPending && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEdit(post.id); }}
                                                        className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                                        title="تعديل"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDelete(post.postId || post.id); }}
                                                    className="p-1.5 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
                                                    aria-label="حذف"
                                                    title="حذف"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg fade-in">
            {/* Header Section */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            التقويم
                        </h2>
                        <div className="flex items-center gap-2">
                            <button onClick={goToPreviousMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <ArrowPathIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
                            </button>
                            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 min-w-[150px] text-center">
                                {currentDate.toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={goToNextMonth} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <ArrowPathIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setCalendarView('month')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                    calendarView === 'month' 
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <CalendarIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCalendarView('week')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                    calendarView === 'week' 
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <ListBulletIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setCalendarView('day')}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                    calendarView === 'day' 
                                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                }`}
                            >
                                <CalendarDaysIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setShowFilters(!showFilters)}
                                variant="secondary"
                                size="sm"
                                className="relative"
                            >
                                <FilterIcon className="w-4 h-4 ml-2" />
                                فلترة
                                {filterStatus !== 'all' && (
                                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                            </Button>
                            
                            <Button
                                onClick={handleExportCalendar}
                                variant="secondary"
                                size="sm"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4 ml-2" />
                                تصدير
                            </Button>
                            
                            <Button
                                onClick={onSync}
                                isLoading={isSyncing}
                                variant="secondary"
                                size="sm"
                                disabled={isViewer}
                            >
                                <ArrowPathIcon className="w-4 h-4 ml-2" />
                                مزامنة
                            </Button>
                            
                            {!isViewer && (
                                <Button
                                    onClick={onCreatePost}
                                    size="sm"
                                >
                                    <PlusIcon className="w-4 h-4 ml-2" />
                                    منشور جديد
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">الإجمالي</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
                            </div>
                            <CalendarIcon className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400 font-medium">منشور</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.published}</p>
                            </div>
                            <CheckCircleIcon className="w-8 h-8 text-green-500" />
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">مجدول</p>
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.scheduled}</p>
                            </div>
                            <ClockIcon className="w-8 h-8 text-blue-500" />
                        </div>
                    </div>
                    
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">قيد المراجعة</p>
                                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pending}</p>
                            </div>
                            <ClockIcon className="w-8 h-8 text-yellow-500" />
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">حالة المنشور:</span>
                            <div className="flex gap-2">
                                {(['all', 'scheduled', 'published', 'pending'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                            filterStatus === status
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                                        }`}
                                    >
                                        {status === 'all' && 'الكل'}
                                        {status === 'scheduled' && 'مجدول'}
                                        {status === 'published' && 'منشور'}
                                        {status === 'pending' && 'قيد المراجعة'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
                {calendarView === 'month' && (
                    <>
                        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 dark:text-gray-300 mb-4">
                            {daysOfWeek.map(day => (
                                <div key={day} className="py-2 text-sm">{day}</div>
                            ))}
                        </div>
                        {renderCalendarGrid()}
                    </>
                )}
                {calendarView === 'week' && renderWeekView()}
                {calendarView === 'day' && renderDayView()}
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">تفاصيل المنشور</h3>
                            <button
                                onClick={() => setSelectedPost(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <XCircleIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">النص</label>
                                <p className="text-gray-800 dark:text-gray-200 mt-1">{selectedPost.text || 'منشور بصورة'}</p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">التاريخ والوقت</label>
                                <p className="text-gray-800 dark:text-gray-200 mt-1">
                                    {new Date(selectedPost.scheduledAt).toLocaleString('ar-EG')}
                                </p>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">الحالة</label>
                                <p className="text-gray-800 dark:text-gray-200 mt-1">
                                    {selectedPost.publishedAt ? 'منشور' : 
                                     selectedPost.status === 'pending' ? 'قيد المراجعة' : 'مجدول'}
                                </p>
                            </div>
                            
                            <div className="flex gap-2 pt-4">
                                {!isViewer && !selectedPost.publishedAt && !selectedPost.isReminder && selectedPost.status !== 'pending' && (
                                    <Button
                                        onClick={() => {
                                            onEdit(selectedPost.id);
                                            setSelectedPost(null);
                                        }}
                                        size="sm"
                                    >
                                        تعديل
                                    </Button>
                                )}
                                {!isViewer && (
                                    <Button
                                        onClick={() => {
                                            onDelete(selectedPost.postId || selectedPost.id);
                                            setSelectedPost(null);
                                        }}
                                        variant="destructive"
                                        size="sm"
                                    >
                                        حذف
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentCalendar;