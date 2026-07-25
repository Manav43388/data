import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Search, 
  Eye, 
  Calendar
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getDocuments } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { formatKolkataDateTime, isKolkataToday, getKolkataDate } from '../../utils/dateUtils';
import type { Order } from '../../types';

export const DeliveredOrders: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Filters
  const [timeFilter, setTimeFilter] = useState<'today' | 'this_week' | 'this_month' | 'all'>('all');
  const [courierFilter, setCourierFilter] = useState<string>('all');

  const fetchDeliveredOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getDocuments('orders') as Order[];
      const delivered = allOrders.filter(
        (o) => o.fulfilmentStatus === 'Delivered' || 
               o.orderStatus === 'Delivered' || 
               o.shippingStatus === 'Delivered'
      );
      setOrders(delivered);
    } catch (e) {
      console.error('Error fetching delivered orders', e);
      addToast('Failed to load delivered orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveredOrders();
  }, []);

  // Time filter calculations
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (
      o.orderId.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerMobile.includes(q) ||
      (o.trackingId && o.trackingId.toLowerCase().includes(q)) ||
      (o.courierCompany && o.courierCompany.toLowerCase().includes(q))
    );

    if (!matchesSearch) return false;

    if (courierFilter !== 'all' && o.courierCompany !== courierFilter) {
      return false;
    }

    const delTime = o.deliveredAt || o.deliveredDate;
    if (!delTime && timeFilter !== 'all') return false;

    const delDate = getKolkataDate(delTime);

    if (timeFilter === 'today') {
      return isKolkataToday(delTime);
    } else if (timeFilter === 'this_week') {
      return delDate >= startOfWeek;
    } else if (timeFilter === 'this_month') {
      return delDate >= startOfMonth;
    }

    return true;
  });

  const totalDeliveredRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Stage 5 — Delivered Archive
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            Delivered Orders History
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            Complete historical record of all verified payments, packed parcels, tracking IDs, and successful deliveries.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
          <div className="text-center border-r border-white/10 pr-4">
            <p className="text-2xl font-black text-emerald-400">{filteredOrders.length}</p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Delivered</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-amber-400">₹{totalDeliveredRevenue.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider">Filtered Revenue</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                timeFilter === 'today'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Delivered Today
            </button>

            <button
              onClick={() => setTimeFilter('this_week')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                timeFilter === 'this_week'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              This Week
            </button>

            <button
              onClick={() => setTimeFilter('this_month')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                timeFilter === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              This Month
            </button>

            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                timeFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              All Time
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="h-9 px-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold"
            >
              <option value="all">All Couriers</option>
              <option value="Shree Tirupati Courier">Shree Tirupati Courier</option>
              <option value="India Post">India Post</option>
              <option value="DTDC">DTDC</option>
              <option value="Delhivery">Delhivery</option>
              <option value="Blue Dart">Blue Dart</option>
              <option value="Xpressbees">Xpressbees</option>
              <option value="Shadowfax">Shadowfax</option>
              <option value="Other">Other</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ID, Name, Phone..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table List */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold text-sm">
          Loading delivered orders archive...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">No Delivered Orders Matching Filter</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Orders marked as delivered will remain permanently archived here. Try clearing your date or courier filters.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 uppercase font-extrabold tracking-wider border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Courier</th>
                  <th className="p-4">Tracking ID</th>
                  <th className="p-4">Delivery Timestamp</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {filteredOrders.map((order) => {
                  const delDateObj = order.deliveredAt || order.deliveredDate;
                  const formattedDelDate = formatKolkataDateTime(delDateObj);

                  return (
                    <tr key={order.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 font-black text-emerald-700 dark:text-emerald-400 text-sm">
                        {order.orderId}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-gray-900 dark:text-white">{order.customerName}</p>
                        <p className="text-[11px] text-gray-500">📱 {order.customerMobile}</p>
                      </td>
                      <td className="p-4 font-black text-gray-900 dark:text-white text-sm">
                        ₹{order.totalAmount?.toFixed(2)}
                      </td>
                      <td className="p-4 text-purple-700 dark:text-purple-400 font-bold">
                        {order.courierCompany || 'Courier'}
                      </td>
                      <td className="p-4 font-mono text-gray-700 dark:text-gray-300">
                        {order.trackingId || 'N/A'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{formattedDelDate}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="rounded-xl text-xs font-bold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Full Order
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
