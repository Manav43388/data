import React from 'react';
import { Bell, Menu, Moon, Sun, User as UserIcon, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarProps {
  onMenuClick: () => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, toggleTheme, isDark }) => {
  const { logout, currentUser } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 z-10">
      <div className="flex items-center">
        <Button variant="ghost" size="sm" onClick={onMenuClick} className="md:hidden mr-2">
          <Menu className="w-5 h-5" />
        </Button>
        <span className="text-lg font-semibold md:hidden text-primary">AOMS</span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-9 h-9 p-0">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        
        <Button variant="ghost" size="sm" className="rounded-full w-9 h-9 p-0 relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>

        <div className="flex items-center space-x-2 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-800">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium leading-none">{currentUser?.email || 'Admin'}</span>
            <span className="text-xs text-gray-500">Administrator</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
            <UserIcon className="w-4 h-4" />
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="ml-2 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
            <LogOut className="w-4 h-4 mr-1 hidden sm:inline" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
