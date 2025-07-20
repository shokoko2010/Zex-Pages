import React from 'react';
import Button from './ui/Button';
import SettingsIcon from './icons/SettingsIcon';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

interface HeaderProps {
  onLogout: () => void;
  pageName?: string;
  onChangePage?: () => void;
  onSettingsClick?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, pageName, onChangePage, onSettingsClick, theme, onToggleTheme }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center relative">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 shrink-0">
          zex-pages
        </h1>
        {pageName && (
          <div className="flex items-center gap-3 overflow-hidden">
             <span className="text-gray-300 dark:text-gray-600">|</span>
             <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={pageName}>
                {pageName}
             </p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onChangePage && (
          <Button onClick={onChangePage} variant="secondary">
            تغيير الصفحة
          </Button>
        )}
        {onSettingsClick && (
          <Button onClick={onSettingsClick} variant="secondary" className="!p-2" aria-label="الإعدادات">
            <SettingsIcon className="w-5 h-5"/>
          </Button>
        )}
        <Button onClick={onToggleTheme} variant="secondary" className="!p-2" aria-label="تغيير المظهر">
            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
        </Button>
        <Button onClick={onLogout} variant="secondary">
          تسجيل الخروج
        </Button>
      </div>
    </header>
  );
};

export default Header;
