import React, { useEffect, useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  XCircle, 
  Users, 
  ShoppingCart, 
  ShoppingBag, 
  Search 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getTrashDocuments, restoreDocument, permanentDeleteDocument } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';

export const Trash: React.FC = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'products'>('orders');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const collectionName = activeTab;
      const data = await getTrashDocuments(collectionName);
      setItems(data);
    } catch (e) {
      console.error(`Error loading trash for ${activeTab}`, e);
      addToast(`Failed to load ${activeTab} trash`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [activeTab]);

  const handleRestore = async (id: string) => {
    try {
      setActionId(id);
      await restoreDocument(activeTab, id);
      addToast(`Successfully restored item! 🔄`, 'success');
      fetchTrash();
    } catch (e) {
      console.error('Error restoring document', e);
      addToast('Failed to restore item', 'error');
    } finally {
      setActionId(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this item? This action CANNOT be undone!')) {
      return;
    }

    try {
      setActionId(id);
      await permanentDeleteDocument(activeTab, id);
      addToast('Item permanently deleted from database', 'info');
      fetchTrash();
    } catch (e) {
      console.error('Error permanently deleting document', e);
      addToast('Failed to permanently delete item', 'error');
    } finally {
      setActionId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchTerm.toLowerCase();
    if (activeTab === 'orders') {
      return (
        item.orderId?.toLowerCase().includes(q) ||
        item.customerName?.toLowerCase().includes(q) ||
        item.customerMobile?.includes(q)
      );
    } else if (activeTab === 'customers') {
      return item.name?.toLowerCase().includes(q) || item.mobileNumber?.includes(q);
    } else {
      return item.name?.toLowerCase().includes(q) || item.fragrance?.toLowerCase().includes(q);
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-red-950 via-slate-900 to-slate-950 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Recycle Bin
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 mt-1">
            <Trash2 className="w-8 h-8 text-red-400" />
            Trash & Soft Deleted Items
          </h1>
          <p className="text-red-100 text-xs sm:text-sm mt-1 max-w-xl">
            Safely review deleted orders, customer records, and products. Restore items back to active status or purge them permanently.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> Deleted Orders
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'customers'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Deleted Customers
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'products'
              ? 'bg-red-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Deleted Products
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search deleted ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:outline-none"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Showing <span className="font-bold text-gray-900 dark:text-white">{filteredItems.length}</span> deleted items
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-gray-200 dark:border-gray-800">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Loading trash bin...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-400 mx-auto">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Trash is Empty</h3>
          <p className="text-xs text-gray-500">No deleted {activeTab} found in the recycle bin.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase font-extrabold tracking-wider border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-4">Item Details</th>
                  <th className="p-4">Primary Info</th>
                  <th className="p-4">Deletion Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {filteredItems.map((item) => {
                  const deletedDateStr = item.deletedAt
                    ? new Date(item.deletedAt.seconds ? item.deletedAt.seconds * 1000 : item.deletedAt).toLocaleDateString('en-IN')
                    : 'N/A';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/50">
                      <td className="p-4">
                        {activeTab === 'orders' && (
                          <div>
                            <p className="font-bold text-red-600 dark:text-red-400">{item.orderId}</p>
                            <p className="text-[11px] text-gray-500">Customer: {item.customerName}</p>
                          </div>
                        )}
                        {activeTab === 'customers' && (
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-[11px] text-gray-500">Mobile: {item.mobileNumber}</p>
                          </div>
                        )}
                        {activeTab === 'products' && (
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-[11px] text-gray-500">Fragrance: {item.fragrance}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">
                        {activeTab === 'orders' && `Total: ₹${item.totalAmount} (${item.orderStatus})`}
                        {activeTab === 'customers' && `Address: ${item.city}, ${item.state}`}
                        {activeTab === 'products' && `Price: ₹${item.price} • Stock: ${item.stock}`}
                      </td>
                      <td className="p-4 text-gray-500 font-mono">
                        {deletedDateStr}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button
                          size="sm"
                          onClick={() => handleRestore(item.id)}
                          disabled={actionId === item.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePermanentDelete(item.id)}
                          disabled={actionId === item.id}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-xl text-xs font-bold"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Delete Permanently
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
