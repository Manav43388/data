import React from 'react';
import { Menu, Moon, Sun, User as UserIcon, LogOut, Flame } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onMenuClick: () => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, toggleTheme, isDark }) => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 z-10">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onMenuClick} className="md:hidden mr-1">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 md:hidden" onClick={() => navigate('/dashboard')}>
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <span className="text-base font-black text-emerald-700 dark:text-emerald-400">Asmita Udhyog</span>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <Button variant="ghost" size="sm" onClick={toggleTheme} className="rounded-full w-9 h-9 p-0">
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <div className="flex items-center space-x-2 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-800">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold leading-none">{currentUser?.email || 'Admin'}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Store Admin</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
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
