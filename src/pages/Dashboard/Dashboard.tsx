import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { IndianRupee, Package, AlertTriangle, TrendingUp, Clock, CheckCircle, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDocuments, restockProduct } from '../../services/db';
import type { Order, Product } from '../../types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Restock state
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(50);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [ordData, prodData] = await Promise.all([
        getDocuments('orders'),
        getDocuments('products')
      ]);
      setOrders(ordData as Order[]);
      setProducts(prodData as Product[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayRevenue = 0;
  let weeklyRevenue = 0;
  let monthlyRevenue = 0;
  let todayOrdersCount = 0;

  orders.forEach(o => {
    const orderTime = o.orderDate?.seconds ? o.orderDate.seconds * 1000 : new Date(o.orderDate).getTime();
    const amount = o.totalAmount || 0;

    if (orderTime >= startOfToday) {
      todayRevenue += amount;
      todayOrdersCount += 1;
    }
    if (orderTime >= startOfWeek) {
      weeklyRevenue += amount;
    }
    if (orderTime >= startOfMonth) {
      monthlyRevenue += amount;
    }
  });

  const pendingPaymentsCount = orders.filter(o => o.paymentStatus === 'Pending Payment').length;
  const pendingShipmentsCount = orders.filter(o => o.orderStatus === 'Confirmed' || o.orderStatus === 'Packed').length;
  const lowStockProducts = products.filter(p => p.stock <= (p.minStockThreshold || 10));

  const handleRestockSubmit = async () => {
    if (!restockModalProduct?.id || restockQty <= 0) return;
    try {
      await restockProduct(restockModalProduct.id, restockQty);
      showToast(`Restocked +${restockQty} units of ${restockModalProduct.name}!`);
      setRestockModalProduct(null);
      fetchDashboardData();
    } catch (e) {
      showToast('Failed to restock', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Seller Dashboard Overview</h1>
          <p className="text-sm text-gray-500">Real-time parcel management analytics & inventory alerts for Asmita Gruh Udhyog.</p>
        </div>
        <Button onClick={() => navigate('/orders/new')} className="font-bold">
          + Create New Order
        </Button>
      </div>
      
      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Today's Revenue</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">₹{todayRevenue.toFixed(2)}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold">{todayOrdersCount} Orders Today</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Weekly Revenue</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">₹{weeklyRevenue.toFixed(2)}</h3>
              <p className="text-[11px] text-blue-600 font-semibold">Monthly: ₹{monthlyRevenue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Pending Payments</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{pendingPaymentsCount}</h3>
              <p className="text-[11px] text-amber-600 font-semibold">Awaiting Verification</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Pending Shipments</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">{pendingShipmentsCount}</h3>
              <p className="text-[11px] text-purple-600 font-semibold">Ready to Pack / Dispatch</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Low Stock Alert Table & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Warning Alert Panel */}
        <Card className="lg:col-span-1 border-amber-200 dark:border-amber-900/40">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" /> Low Stock Alerts ({lowStockProducts.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-xs text-emerald-600 font-semibold flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> All inventory stock levels healthy!
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-gray-900 dark:text-white">{p.name}</p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        Stock: <strong className="text-red-600 font-bold">{p.stock} units</strong> (Min: {p.minStockThreshold || 10})
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                      onClick={() => {
                        setRestockModalProduct(p);
                        setRestockQty(50);
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Restock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Recent Orders</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => navigate('/orders')}>
                View All Orders ➔
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="p-4 text-center text-xs text-gray-500">Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="p-4 text-center text-xs text-gray-500">No orders created yet.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800 uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2.5">Order ID</th>
                      <th className="px-3 py-2.5">Customer</th>
                      <th className="px-3 py-2.5">Amount</th>
                      <th className="px-3 py-2.5">Payment</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 6).map((ord) => (
                      <tr key={ord.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2.5 font-bold text-primary">{ord.orderId}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200">{ord.customerName}</td>
                        <td className="px-3 py-2.5 font-bold">₹{ord.totalAmount?.toFixed(2)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.paymentStatus === 'Payment Verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            {ord.orderStatus}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigate(`/orders/${ord.id}`)}>
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Restock Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Restock Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{restockModalProduct.name}</p>
                <p className="text-sm text-gray-500">Current Stock: {restockModalProduct.stock} units</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Quantity to Restock</label>
                <input 
                  type="number" 
                  min="1" 
                  className="w-full h-10 px-3 border rounded-md dark:bg-slate-800 dark:border-gray-700"
                  value={restockQty} 
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRestockModalProduct(null)}>Cancel</Button>
                <Button onClick={handleRestockSubmit}>
                  Confirm Restock (+{restockQty})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
