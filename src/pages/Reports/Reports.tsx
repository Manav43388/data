import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  Download, 
  Flame, 
  Package, 
  CheckCircle2 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getDocuments, exportAllData } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import type { Order, Product } from '../../types';

export const Reports: React.FC = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersData, productsData] = await Promise.all([
          getDocuments('orders'),
          getDocuments('products'),
        ]);
        setOrders(ordersData as Order[]);
        setProducts(productsData as Product[]);
      } catch (e) {
        console.error('Error fetching analytics report data', e);
      }
    };
    fetchData();
  }, []);

  const handleExportData = async () => {
    try {
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Asmita_Gruh_Udhyog_Data_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Backup export downloaded successfully! 📊', 'success');
    } catch (e) {
      console.error('Export failed', e);
      addToast('Failed to export data', 'error');
    }
  };

  // Metrics calculation
  const totalOrdersCount = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const deliveredCount = orders.filter((o) => o.orderStatus === 'Delivered').length;
  const inTransitCount = orders.filter((o) => o.orderStatus === 'Shipment Process').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-emerald-900 via-amber-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Business Intelligence & Analytics
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 mt-1">
            <BarChart3 className="w-8 h-8 text-amber-400" />
            Seller Reports & Analytics
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Comprehensive business performance insights and raw data export for Asmita Gruh Udhyog.
          </p>
        </div>

        <Button
          onClick={handleExportData}
          className="bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export JSON Data Backup
        </Button>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Sales Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
              ₹
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Across {totalOrdersCount} lifetime orders
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Deliveries</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{deliveredCount}</p>
          <p className="text-xs text-gray-500 mt-1">
            {totalOrdersCount > 0 ? Math.round((deliveredCount / totalOrdersCount) * 100) : 0}% fulfillment success rate
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">In Transit</span>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{inTransitCount}</p>
          <p className="text-xs text-blue-600 font-semibold mt-1">Parcels with active courier tracking</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Catalog</span>
            <ShoppingBag className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-gray-900 dark:text-white">{products.length}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">Agarbatti product varieties</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
        <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500 fill-amber-400" />
          Agarbatti Product Inventory Summary
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 uppercase font-extrabold tracking-wider">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">Fragrance</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-center">Stock Available</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-gray-900 dark:text-white">{prod.name}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{prod.fragrance}</td>
                  <td className="p-3 text-right font-bold text-amber-600">₹{prod.price}</td>
                  <td className="p-3 text-center font-bold">{prod.stock} pkts</td>
                  <td className="p-3 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        prod.stock <= (prod.minStockThreshold || 10)
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {prod.stock <= (prod.minStockThreshold || 10) ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
