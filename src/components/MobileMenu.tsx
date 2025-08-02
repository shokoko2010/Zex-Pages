import React, { useState } from 'react';
import { Target, Role, InboxItem } from '../types';
import Button from './ui/Button';

// Icons
import PencilSquareIcon from './icons/PencilSquareIcon';
import QueueListIcon from './icons/QueueListIcon';
import BrainCircuitIcon from './icons/BrainCircuitIcon';
import CalendarIcon from './icons/CalendarIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import InboxArrowDownIcon from './icons/InboxArrowDownIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import BriefcaseIcon from './icons/BriefcaseIcon';
import UserCircleIcon from './icons/UserCircleIcon';
import XMarkIcon from './icons/XMarkIcon';
import Bars3Icon from './icons/Bars3Icon';

type DashboardView = 'composer' | 'calendar' | 'drafts' | 'analytics' | 'bulk' | 'planner' | 'inbox' | 'profile' | 'ads';

interface MobileMenuProps {
    currentView: DashboardView;
    onViewChange: (view: DashboardView) => void;
    managedTarget: Target;
    currentUserRole: Role;
    inboxItems: InboxItem[];
    isSyncing: boolean;
    onSync: () => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
    currentView,
    onViewChange,
    managedTarget,
    currentUserRole,
    inboxItems,
    isSyncing,
    onSync
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const newInboxCount = inboxItems.filter(i => i.status === 'new').length;

    const navigationItems = [
        {
            view: 'composer' as DashboardView,
            icon: <PencilSquareIcon className="w-5 h-5" />,
            label: "إنشاء منشور",
            badge: "AI"
        },
        {
            view: 'bulk' as DashboardView,
            icon: <QueueListIcon className="w-5 h-5" />,
            label: "الجدولة المجمعة",
            disabled: currentUserRole === 'viewer'
        },
        {
            view: 'planner' as DashboardView,
            icon: <BrainCircuitIcon className="w-5 h-5" />,
            label: "استراتيجيات المحتوى",
            badge: "AI",
            disabled: currentUserRole === 'viewer'
        },
        {
            view: 'calendar' as DashboardView,
            icon: <CalendarIcon className="w-5 h-5" />,
            label: "تقويم المحتوى"
        },
        {
            view: 'drafts' as DashboardView,
            icon: <ArchiveBoxIcon className="w-5 h-5" />,
            label: "المسودات"
        },
        {
            view: 'inbox' as DashboardView,
            icon: <InboxArrowDownIcon className="w-5 h-5" />,
            label: "صندوق الوارد",
            notificationCount: newInboxCount
        },
        {
            view: 'analytics' as DashboardView,
            icon: <ChartBarIcon className="w-5 h-5" />,
            label: "التحليلات"
        },
        {
            view: 'ads' as DashboardView,
            icon: <BriefcaseIcon className="w-5 h-5" />,
            label: "مدير الإعلانات"
        },
        {
            view: 'profile' as DashboardView,
            icon: <UserCircleIcon className="w-5 h-5" />,
            label: "ملف الصفحة"
        }
    ];

    return (
        <>
            {/* Mobile Menu Button */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
                <Button
                    onClick={() => setIsOpen(true)}
                    variant="primary"
                    size="lg"
                    className="rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                    <Bars3Icon className="w-6 h-6" />
                </Button>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
                        onClick={() => setIsOpen(false)}
                    />
                    
                    {/* Menu Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 translate-x-0">
                        {/* Menu Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">Z</span>
                                </div>
                                <div>
                                    <h2 className="font-semibold text-gray-900 dark:text-white">القائمة</h2>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{managedTarget.name}</p>
                                </div>
                            </div>
                            <Button
                                onClick={() => setIsOpen(false)}
                                variant="ghost"
                                size="sm"
                                className="!p-2"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </Button>
                        </div>
                        
                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto">
                            <nav className="p-4 space-y-2">
                                {navigationItems.map((item) => (
                                    <button
                                        key={item.view}
                                        onClick={() => {
                                            onViewChange(item.view);
                                            setIsOpen(false);
                                        }}
                                        disabled={item.disabled}
                                        className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-right relative overflow-hidden ${currentView === item.view ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                                    >
                                        {/* Active indicator */}
                                        {currentView === item.view && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-r-full"></div>
                                        )}
                                        
                                        {/* Icon */}
                                        <div className={`flex-shrink-0 ${currentView === item.view ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
                                            {item.icon}
                                        </div>
                                        
                                        {/* Label */}
                                        <span className="flex-grow font-medium">{item.label}</span>
                                        
                                        {/* Badge or Notification */}
                                        {item.badge && (
                                            <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                        
                                        {item.notificationCount && item.notificationCount > 0 ? (
                                            <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                                                {item.notificationCount > 99 ? '99+' : item.notificationCount}
                                            </span>
                                        ) : null}
                                    </button>
                                ))}
                            </nav>
                            
                            {/* Sync Button */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <Button 
                                    onClick={() => {
                                        onSync();
                                        setIsOpen(false);
                                    }} 
                                    isLoading={isSyncing} 
                                    variant="outline" 
                                    className="w-full justify-center"
                                    disabled={currentUserRole === 'viewer'}
                                >
                                    {isSyncing ? 'جاري المزامنة...' : 'مزامنة بيانات فيسبوك'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MobileMenu;