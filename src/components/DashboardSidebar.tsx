import React from 'react';
import { Target, Role, InboxItem, DashboardView } from '../types';
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
import ArrowPathIcon from './icons/ArrowPathIcon';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    notificationCount?: number;
    disabled?: boolean;
    badge?: string;
}

const NavItem: React.FC<NavItemProps> = ({ 
    icon, 
    label, 
    active, 
    onClick, 
    notificationCount, 
    disabled = false,
    badge
}) => (
    <button 
        onClick={onClick} 
        className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-right relative overflow-hidden ${active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-100'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`} 
        disabled={disabled}
    >
        {/* Active indicator */}
        {active && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-r-full"></div>
        )}
        
        {/* Icon */}
        <div className={`flex-shrink-0 ${active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
            {icon}
        </div>
        
        {/* Label */}
        <span className="flex-grow font-medium">{label}</span>
        
        {/* Badge or Notification */}
        {badge && (
            <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {badge}
            </span>
        )}
        
        {notificationCount && notificationCount > 0 ? (
            <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                {notificationCount > 99 ? '99+' : notificationCount}
            </span>
        ) : null}
    </button>
);

interface DashboardSidebarProps {
    currentView: DashboardView;
    onViewChange: (view: DashboardView) => void;
    managedTarget: Target;
    currentUserRole: Role;
    inboxItems: InboxItem[];
    isSyncing: boolean;
    onSync: () => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
    currentView,
    onViewChange,
    managedTarget,
    currentUserRole,
    inboxItems,
    isSyncing,
    onSync
}) => {
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
        <aside className="w-full md:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Z</span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">اللوحة الرئيسية</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{managedTarget.name}</p>
                    </div>
                </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navigationItems.map((item) => (
                    <NavItem 
                        key={item.view}
                        icon={item.icon}
                        label={item.label}
                        active={currentView === item.view}
                        onClick={() => onViewChange(item.view)}
                        notificationCount={item.notificationCount}
                        disabled={item.disabled}
                        badge={item.badge}
                    />
                ))}
            </nav>
            
            {/* Sync Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                    onClick={onSync} 
                    isLoading={isSyncing} 
                    variant="outline" 
                    className="w-full justify-center"
                    disabled={currentUserRole === 'viewer'}
                    leftIcon={<ArrowPathIcon className="w-4 h-4" />}
                >
                    {isSyncing ? 'جاري المزامنة...' : 'مزامنة بيانات فيسبوك'}
                </Button>
            </div>
        </aside>
    );
};

export default DashboardSidebar;