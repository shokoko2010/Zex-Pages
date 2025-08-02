import React from 'react';
import Button from './ui/Button';
import SettingsIcon from './icons/SettingsIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import UserCircleIcon from './icons/UserCircleIcon';

interface HeaderProps {
  onLogout: () => void;
  pageName?: string;
  onChangePage?: () => void;
  onSettingsClick?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user?: any;
}

const Header: React.FC<HeaderProps> = ({ 
  onLogout, 
  pageName, 
  onChangePage, 
  onSettingsClick, 
  theme, 
  onToggleTheme,
  user 
}) => {
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Logo and Page Name */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Z</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              zex-pages
            </h1>
          </div>
          
          {pageName && (
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-gray-300 dark:text-gray-600 text-sm">|</span>
              <p className="font-medium text-gray-700 dark:text-gray-200 truncate text-sm sm:text-base" title={pageName}>
                {pageName}
              </p>
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onChangePage && (
            <Button 
              onClick={onChangePage} 
              variant="outline" 
              size="sm"
              className="hidden sm:flex"
            >
              تغيير الصفحة
            </Button>
          )}
          
          {onSettingsClick && (
            <Button 
              onClick={onSettingsClick} 
              variant="ghost" 
              size="sm"
              className="!p-2"
              aria-label="الإعدادات"
            >
              <SettingsIcon className="w-5 h-5"/>
            </Button>
          )}
          
          <Button 
            onClick={onToggleTheme} 
            variant="ghost" 
            size="sm"
            className="!p-2"
            aria-label="تغيير المظهر"
          >
            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
          </Button>
          
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <UserCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[100px]">
                {user.displayName || user.email || 'User'}
              </span>
            </div>
          )}
          
          <Button 
            onClick={onLogout} 
            variant="outline" 
            size="sm"
            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
