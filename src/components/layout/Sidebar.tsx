import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Users, 
  ShoppingCart, 
  Box, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  ShoppingBag, 
  BarChart3, 
  Settings, 
  Trash2,
  Flame,
  X
} from 'lucide-react';
import { cn } from '../ui/Button';
import { getDocuments } from '../../services/db';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  badgeKey?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'ORDER MANAGEMENT',
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'New Order', path: '/orders/new', icon: PlusCircle },
      { name: 'Customer Information', path: '/customers', icon: Users },
      { name: 'Orders', path: '/orders', icon: ShoppingCart },
    ]
  },
  {
    title: 'FULFILMENT',
    items: [
      { name: 'Packaging', path: '/packaging', icon: Box, badgeKey: 'packaging' },
      { name: 'Ready to Ship', path: '/ready-to-ship', icon: PackageCheck, badgeKey: 'readyToShip' },
      { name: 'Shipping', path: '/shipment-process', icon: Truck, badgeKey: 'shipping' },
      { name: 'Delivered', path: '/delivered-orders', icon: CheckCircle2, badgeKey: 'delivered' },
    ]
  },
  {
    title: 'BUSINESS MANAGEMENT',
    items: [
      { name: 'Products', path: '/products', icon: ShoppingBag },
      { name: 'Reports', path: '/reports', icon: BarChart3 },
      { name: 'Settings', path: '/settings', icon: Settings },
      { name: 'Trash', path: '/trash', icon: Trash2 },
    ]
  }
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [counts, setCounts] = useState<{ packaging: number; readyToShip: number; shipping: number; delivered: number }>({
    packaging: 0,
    readyToShip: 0,
    shipping: 0,
    delivered: 0,
  });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const orders = await getDocuments('orders');
        
        const pkg = orders.filter((o: any) => 
          o.fulfilmentStatus === 'Packaging Pending' || 
          o.fulfilmentStatus === 'Packaging In Progress' ||
          o.orderStatus === 'Payment Verified' ||
          o.orderStatus === 'Packing'
        ).length;

        const rts = orders.filter((o: any) => 
          o.fulfilmentStatus === 'Ready to Ship' || 
          (o.orderStatus === 'Ready To Ship' && o.fulfilmentStatus !== 'Shipped')
        ).length;

        const shp = orders.filter((o: any) => 
          o.fulfilmentStatus === 'Shipped' || 
          o.orderStatus === 'Shipment Process' || 
          o.shippingStatus === 'In Transit'
        ).length;

        const del = orders.filter((o: any) => 
          o.fulfilmentStatus === 'Delivered' || 
          o.orderStatus === 'Delivered'
        ).length;

        setCounts({ packaging: pkg, readyToShip: rts, shipping: shp, delivered: del });
      } catch (e) {
        console.error('Error fetching sidebar counts', e);
      }
    };
    fetchCounts();
  }, []);

  return (
    <aside 
      className={cn(
        "w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex-col transition-all duration-300 z-40 select-none",
        isOpen 
          ? "fixed inset-y-0 left-0 flex shadow-2xl md:static md:shadow-none" 
          : "hidden md:flex"
      )}
    >
      {/* Sidebar Top Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200 dark:border-gray-800 bg-emerald-950/5 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-600/20">
            <Flame className="w-5 h-5 fill-amber-300 text-amber-300" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white leading-tight tracking-tight">
              Asmita Gruh Udhyog
            </h1>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider uppercase">
              SELLER SYSTEM
            </p>
          </div>
        </div>

        {isOpen && (
          <button 
            onClick={onClose} 
            className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Sidebar Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-2">
              {section.title}
            </div>
            {section.items.map((item) => {
              const badgeCount = item.badgeKey ? (counts as any)[item.badgeKey] : 0;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group",
                      isActive
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        : "text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-slate-800/80 hover:text-emerald-700 dark:hover:text-emerald-400"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon 
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-white" : "text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                          )} 
                        />
                        <span>{item.name}</span>
                      </div>

                      {badgeCount > 0 && (
                        <span 
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-extrabold rounded-full transition-colors",
                            isActive
                              ? "bg-white/20 text-white"
                              : item.badgeKey === 'packaging'
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : item.badgeKey === 'readyToShip'
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          )}
                        >
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 m-3 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-500/20 text-center">
        <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300">⚡ Internal Seller App</p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Asmita Gruh Udhyog</p>
      </div>
    </aside>
  );
};
