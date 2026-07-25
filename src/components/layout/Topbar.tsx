import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Moon, 
  Sun, 
  User as UserIcon, 
  LogOut, 
  Flame, 
  Search, 
  Bell, 
  X, 
  Package, 
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useSearch } from '../../contexts/SearchContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onMenuClick: () => void;
  toggleTheme: () => void;
  isDark: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, toggleTheme, isDark }) => {
  const { logout, currentUser } = useAuth();
  const { searchQuery, setSearchQuery, results, loading } = useSearch();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalResults = results.orders.length + results.customers.length + results.products.length;

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-xs">
      {/* Left side: Hamburger menu & Logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger Menu (3 lines) */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onMenuClick} 
          className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          title="Toggle Navigation Sidebar"
        >
          <Menu className="w-6 h-6" />
        </Button>

        {/* Company Logo */}
        <div 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-amber-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform duration-200">
            <Flame className="w-5 h-5 fill-amber-300 text-amber-300" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-gray-900 dark:text-white tracking-tight leading-none">
                Asmita Gruh Udhyog
              </span>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
                SELLER
              </span>
            </div>
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-widest uppercase mt-0.5">
              Agarbatti Management
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Global Search Bar */}
      <div className="flex-1 max-w-xl mx-4 sm:mx-8 relative" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search Order ID, Customer Name, Mobile, Tracking ID, Product..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50 dark:bg-slate-800/80 text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown Overlay */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[80vh] overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Searching database...
              </div>
            ) : totalResults === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No results found for "{searchQuery}"</p>
                <p className="text-xs text-gray-400 mt-1">Try searching by Customer Name, Mobile Number, Order ID (AG2026...), Tracking ID, or Agarbatti Fragrance.</p>
              </div>
            ) : (
              <>
                {/* Orders Results */}
                {results.orders.length > 0 && (
                  <div className="p-3">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      Orders ({results.orders.length})
                    </div>
                    <div className="space-y-1">
                      {results.orders.map((order) => (
                        <div
                          key={order.id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/orders/${order.id}`);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors group"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">{order.orderId}</span>
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">{order.customerName}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                                {order.orderStatus}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                              <span>📱 {order.customerMobile}</span>
                              {order.trackingId && <span className="font-mono text-emerald-600 dark:text-emerald-400">🚚 Track: {order.trackingId}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">₹{order.totalAmount}</span>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 ml-auto mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customers Results */}
                {results.customers.length > 0 && (
                  <div className="p-3">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                      Customers ({results.customers.length})
                    </div>
                    <div className="space-y-1">
                      {results.customers.map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate(`/customers/${cust.id}`);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors group"
                        >
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{cust.name}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              📞 {cust.mobileNumber} • 📍 {cust.city}, {cust.state}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Results */}
                {results.products.length > 0 && (
                  <div className="p-3">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-2 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                      Products ({results.products.length})
                    </div>
                    <div className="space-y-1">
                      {results.products.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            setIsSearchFocused(false);
                            navigate('/products');
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer transition-colors group"
                        >
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{prod.name}</span>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Fragrance: {prod.fragrance} • Stock: <span className="font-bold">{prod.stock} pkts</span>
                            </div>
                          </div>
                          <span className="font-bold text-amber-600 text-sm">₹{prod.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Side Icons: Theme, Notifications, User Profile */}
      <div className="flex items-center space-x-2">
        {/* Theme Toggle */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={toggleTheme} 
          className="rounded-full w-9 h-9 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          title="Toggle Light/Dark Theme"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
        </Button>

        {/* Notification Icon */}
        <div className="relative" ref={notificationRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotifications(!showNotifications)}
            className="rounded-full w-9 h-9 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 relative"
            title="System Alerts & Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
          </Button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 z-50">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Seller Notifications</h4>
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>
              <div className="space-y-3">
                <div 
                  onClick={() => { setShowNotifications(false); navigate('/ready-to-ship'); }}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Package className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Ready for Courier Pickup</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Check Ready to Ship tab for pending courier dispatches.</p>
                  </div>
                </div>

                <div 
                  onClick={() => { setShowNotifications(false); navigate('/products'); }}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">Stock Level Monitoring</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Keep your agarbatti inventory updated to prevent backorders.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative pl-2 border-l border-gray-200 dark:border-gray-800" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-amber-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              {currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                {currentUser?.email || 'Seller Owner'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Store Admin
              </span>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-2 z-50">
              <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                <p className="text-xs font-bold text-gray-900 dark:text-white">{currentUser?.email || 'Admin User'}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Asmita Gruh Udhyog Owner</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Store Settings
                </button>
              </div>
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
