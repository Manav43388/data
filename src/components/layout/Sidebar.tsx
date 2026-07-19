import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  BarChart, 
  Settings 
} from 'lucide-react';
import { cn } from '../ui/Button';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Products', path: '/products', icon: ShoppingBag },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Payments', path: '/payments', icon: CreditCard },
  { name: 'Shipping', path: '/shipping', icon: Truck },
  { name: 'Reports', path: '/reports', icon: BarChart },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-primary">AOMS</h1>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
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
