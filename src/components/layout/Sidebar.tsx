import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  ShoppingCart, 
  Settings,
  Flame,
  X
} from 'lucide-react';
import { cn } from '../ui/Button';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Order Processing', path: '/orders', icon: ShoppingCart },
  { name: 'Customer Directory', path: '/customers', icon: Users },
  { name: 'Products & Stock', path: '/products', icon: ShoppingBag },
  { name: 'Store Settings', path: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <aside 
      className={cn(
        "w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex-col transition-all duration-300 z-30",
        isOpen 
          ? "fixed inset-y-0 left-0 flex shadow-2xl md:static md:shadow-none" 
          : "hidden md:flex"
      )}
    >
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow">
            <Flame className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 dark:text-white leading-tight">Asmita Udhyog</h1>
            <p className="text-[10px] font-semibold text-emerald-600 tracking-wider uppercase">Seller Central</p>
          </div>
        </div>

        {isOpen && (
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};
