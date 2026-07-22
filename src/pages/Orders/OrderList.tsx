import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Download, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Order } from '../../types';
import { getDocuments, getTrashDocuments, softDeleteDocument, restoreDocument, exportAllData } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';

export const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('All');
  const [showTrash, setShowTrash] = useState(false);

  const STATUS_TABS = ['All', 'Pending Payment', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

  useEffect(() => {
    fetchOrders();
  }, [showTrash]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = showTrash 
        ? await getTrashDocuments('orders')
        : await getDocuments('orders');
      setOrders(data as Order[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
      showToast('Error loading orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (id: string, orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Move order "${orderId}" to Trash?`)) {
      try {
        await softDeleteDocument('orders', id);
        showToast(`Order ${orderId} moved to trash`);
        fetchOrders();
      } catch (error) {
        showToast('Failed to delete order', 'error');
      }
    }
  };

  const handleRestore = async (id: string, orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await restoreDocument('orders', id);
      showToast(`Order ${orderId} restored!`);
      fetchOrders();
    } catch (error) {
      showToast('Failed to restore order', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const backupData = await exportAllData();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AsmitaGruhUdhyog_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showToast('Full system backup downloaded successfully!');
    } catch (error) {
      showToast('Backup failed', 'error');
    }
  };

  const filteredOrders = orders.filter(order => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      order.orderId?.toLowerCase().includes(q) ||
      order.customerName?.toLowerCase().includes(q) ||
      order.customerMobile?.includes(q) ||
      (order.trackingId && order.trackingId.toLowerCase().includes(q)) ||
      (order.courierCompany && order.courierCompany.toLowerCase().includes(q));

    const matchesStatus = activeStatusFilter === 'All' || order.orderStatus === activeStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Order Processing Center</h1>
          <p className="text-sm text-gray-500">Seller Panel — Manage orders, shipping statuses, and tracking IDs.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportBackup} title="1-Click System Backup">
            <Download className="w-4 h-4 mr-2" />
            1-Click Backup
          </Button>
          <Button variant="outline" onClick={() => setShowTrash(!showTrash)}>
            <Trash2 className="w-4 h-4 mr-2" />
            {showTrash ? 'Active Orders' : 'Trash'}
          </Button>
          {!showTrash && (
            <Button className="w-full sm:w-auto font-bold bg-primary" onClick={() => navigate('/orders/new')}>
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 border-b pb-3 dark:border-gray-700">
              {STATUS_TABS.map((st) => {
                const count = orders.filter(o => st === 'All' || o.orderStatus === st).length;
                const isActive = activeStatusFilter === st;

                return (
                  <button
                    key={st}
                    onClick={() => setActiveStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <span>{st}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="flex justify-between items-center gap-4">
              <CardTitle className="text-base">{showTrash ? 'Trashed Orders' : `${activeStatusFilter} Orders`}</CardTitle>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input 
                  className="pl-9" 
                  placeholder="Search by Order ID, Customer, Phone, Tracking ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-400 border-b dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Courier & Tracking</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading orders...</td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {showTrash ? 'No trashed orders.' : 'No orders found.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <td className="px-4 py-3 font-bold text-primary">
                        {order.orderId}
                        <p className="text-[11px] font-normal text-gray-400">
                          {new Date(order.orderDate?.seconds ? order.orderDate.seconds * 1000 : order.orderDate).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 dark:text-white">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.customerMobile}</p>
                      </td>

                      <td className="px-4 py-3 font-extrabold text-gray-900 dark:text-white">
                        ₹{order.totalAmount?.toFixed(2)}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          order.paymentStatus === 'Payment Verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {order.trackingId ? (
                          <div>
                            <p className="font-bold text-xs text-gray-800 dark:text-gray-200">{order.courierCompany || 'Courier'}</p>
                            <p className="text-xs text-primary font-mono">{order.trackingId}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No Tracking ID yet</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          order.orderStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' :
                          order.orderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' :
                          order.orderStatus === 'Confirmed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {showTrash ? (
                          <Button variant="outline" size="sm" onClick={(e) => handleRestore(order.id!, order.orderId, e)}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                          </Button>
                        ) : (
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Command Center" onClick={() => navigate(`/orders/${order.id}`)}>
                              <Eye className="h-4 w-4 text-purple-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete Order" onClick={(e) => handleSoftDelete(order.id!, order.orderId, e)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
