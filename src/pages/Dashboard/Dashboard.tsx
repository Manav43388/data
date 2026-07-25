import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ShoppingCart, 
  PackageCheck, 
  Truck, 
  Flame, 
  ArrowRight,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Box
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getDocuments, restockProduct } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { 
  getKolkataTodayKey, 
  getKolkataDateKey, 
  displayDateFromKey, 
  offsetDateKey
} from '../../utils/dateUtils';
import type { Order, Product } from '../../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [, setLoading] = useState(true);

  // Date Navigation State
  const todayKey = getKolkataTodayKey();
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);

  // Quick Restock state
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(50);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordData, prodData] = await Promise.all([
        getDocuments('orders'),
        getDocuments('products')
      ]);
      setOrders(ordData as Order[]);
      setProducts(prodData as Product[]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      addToast('Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isTodaySelected = selectedDateKey === todayKey;
  const isFutureDateKey = selectedDateKey > todayKey;

  // Filter orders by selected date
  const selectedDateOrders = orders.filter(o => {
    const key = o.orderDateKey || getKolkataDateKey(o.orderDate || o.createdAt);
    return key === selectedDateKey;
  });

  // KPI Calculations
  const ordersReceivedCount = selectedDateOrders.length;
  
  const paymentConfirmedCount = selectedDateOrders.filter(o => 
    o.paymentStatus === 'Verified' || o.paymentStatus === 'Payment Verified' || o.orderStatus === 'Confirmed'
  ).length;

  const todayRevenue = selectedDateOrders
    .filter(o => (o.paymentStatus === 'Verified' || o.paymentStatus === 'Payment Verified' || o.orderStatus === 'Confirmed') && o.orderStatus !== 'Cancelled')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const packedCount = orders.filter(o => {
    const pDate = o.packagingCompletedAt || o.packedAt;
    return pDate && getKolkataDateKey(pDate) === selectedDateKey;
  }).length;

  const shippedCount = orders.filter(o => {
    const sDate = o.shippedAt || o.shippingDate;
    return sDate && getKolkataDateKey(sDate) === selectedDateKey;
  }).length;

  const deliveredCount = orders.filter(o => {
    const dDate = o.deliveredAt || o.deliveredDate;
    return dDate && getKolkataDateKey(dDate) === selectedDateKey;
  }).length;

  // PENDING WORK CARDS (Include ALL unfinished orders across all dates!)
  const packagingPendingAll = orders.filter(o => 
    (o.fulfilmentStatus === 'Packaging Pending' || o.packagingStatus === 'Not Started' || o.orderStatus === 'Payment Verified') &&
    o.fulfilmentStatus !== 'Ready to Ship' &&
    o.fulfilmentStatus !== 'Shipped' &&
    o.fulfilmentStatus !== 'Delivered' &&
    o.orderStatus !== 'Cancelled'
  );

  const packagingInProgressAll = orders.filter(o => 
    (o.fulfilmentStatus === 'Packaging In Progress' || o.packagingStatus === 'In Progress') &&
    o.fulfilmentStatus !== 'Ready to Ship' &&
    o.fulfilmentStatus !== 'Shipped' &&
    o.fulfilmentStatus !== 'Delivered' &&
    o.orderStatus !== 'Cancelled'
  );

  const readyToShipAll = orders.filter(o => 
    (o.fulfilmentStatus === 'Ready to Ship' || o.orderStatus === 'Ready To Ship') &&
    o.fulfilmentStatus !== 'Shipped' &&
    o.fulfilmentStatus !== 'Delivered' &&
    o.orderStatus !== 'Cancelled'
  );

  // Overdue / Previous-Day Pending Work Warnings
  const previousDaysPackagingPending = packagingPendingAll.filter(o => {
    const k = o.orderDateKey || getKolkataDateKey(o.orderDate || o.createdAt);
    return k < todayKey;
  });

  const previousDaysReadyToShip = readyToShipAll.filter(o => {
    const k = o.orderDateKey || getKolkataDateKey(o.orderDate || o.createdAt);
    return k < todayKey;
  });

  const lowStockProducts = products.filter(p => p.stock <= (p.minStockThreshold || 10));

  const handleRestockSubmit = async () => {
    if (!restockModalProduct?.id || restockQty <= 0) return;
    try {
      await restockProduct(restockModalProduct.id, restockQty);
      addToast(`Restocked +${restockQty} units of ${restockModalProduct.name}!`, 'success');
      setRestockModalProduct(null);
      fetchDashboardData();
    } catch (e) {
      addToast('Failed to restock', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-gradient-to-r from-emerald-900 via-emerald-800 to-amber-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Asmita Gruh Udhyog Seller Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Flame className="w-8 h-8 text-amber-400 fill-amber-300" />
            Seller Command Dashboard
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl">
            Real-time daily operations control tower for order confirmation, packaging queue, shipping dispatch, and live revenues.
          </p>
        </div>

        {/* Date Selector Controls */}
        <div className="relative z-10 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row items-center gap-3">
          <div className="text-left sm:text-right mr-2">
            <span className="text-[10px] font-extrabold text-amber-300 uppercase tracking-widest block">Operational Date</span>
            <span className="text-base font-black text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-300" />
              {isTodaySelected ? `Today — ${displayDateFromKey(selectedDateKey)}` : displayDateFromKey(selectedDateKey)}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1.5 rounded-xl border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDateKey(prev => offsetDateKey(prev, -1))}
              className="h-8 px-2.5 text-xs text-white hover:bg-white/20 font-bold rounded-lg"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDateKey(todayKey)}
              disabled={isTodaySelected}
              className={`h-8 px-3 text-xs font-black rounded-lg ${isTodaySelected ? 'bg-amber-500 text-white shadow-xs' : 'text-white hover:bg-white/20'}`}
            >
              Today
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDateKey(prev => offsetDateKey(prev, 1))}
              disabled={isFutureDateKey || isTodaySelected}
              className="h-8 px-2.5 text-xs text-white hover:bg-white/20 font-bold rounded-lg disabled:opacity-30"
              title="Next Day"
            >
              Next <ChevronRight className="w-4 h-4 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* OVERDUE PENDING WORK ALERT BANNER */}
      {(previousDaysPackagingPending.length > 0 || previousDaysReadyToShip.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-2xl dark:bg-amber-950/40 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-amber-900 dark:text-amber-300">
                Pending Work from Previous Dates Detected!
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-400 mt-0.5">
                {previousDaysPackagingPending.length > 0 && `${previousDaysPackagingPending.length} order(s) from previous dates are waiting for packaging. `}
                {previousDaysReadyToShip.length > 0 && `${previousDaysReadyToShip.length} packed parcel(s) are waiting for shipping details.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {previousDaysPackagingPending.length > 0 && (
              <Button size="sm" onClick={() => navigate('/packaging')} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl">
                Go to Packaging ➔
              </Button>
            )}
            {previousDaysReadyToShip.length > 0 && (
              <Button size="sm" onClick={() => navigate('/ready-to-ship')} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">
                Ready to Ship ➔
              </Button>
            )}
          </div>
        </div>
      )}

      {/* KPI METRICS GRID: THE EXACT REQUESTED DAILY CARDS */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Daily Operational Cards — {displayDateFromKey(selectedDateKey)}
          </h2>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Asia/Kolkata Timezone
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {/* Card 1: Orders Received */}
          <div 
            onClick={() => navigate('/orders')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-emerald-600 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">1. Orders Received</span>
              <ShoppingCart className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{ordersReceivedCount}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              Orders created on {selectedDateKey} <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 2: Payment Confirmed */}
          <div 
            onClick={() => navigate('/orders')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-blue-600 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">2. Payment Confirmed</span>
              <ShieldAlert className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{paymentConfirmedCount}</p>
            <p className="text-xs font-semibold text-blue-600 mt-1 flex items-center gap-1">
              Verified online payments <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 3: Packaging Pending (Includes all unfulfilled pending!) */}
          <div 
            onClick={() => navigate('/packaging')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-amber-500 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">3. Packaging Pending</span>
              <Clock className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{packagingPendingAll.length}</p>
            <p className="text-xs font-semibold text-amber-600 mt-1 flex items-center gap-1">
              Awaiting packaging commencement <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 4: Packaging In Progress */}
          <div 
            onClick={() => navigate('/packaging')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-orange-500 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">4. Packaging In Progress</span>
              <Box className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{packagingInProgressAll.length}</p>
            <p className="text-xs font-semibold text-orange-600 mt-1 flex items-center gap-1">
              Currently on packing checklist <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 5: Packed Today */}
          <div 
            onClick={() => navigate('/packaging')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-emerald-500 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">5. Packed Today</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{packedCount}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              Parcels sealed on selected date <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 6: Ready to Ship (All packed unshipped!) */}
          <div 
            onClick={() => navigate('/ready-to-ship')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-emerald-600 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">6. Ready to Ship</span>
              <PackageCheck className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{readyToShipAll.length}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              Waiting for AWB & courier handover <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 7: Shipped Today */}
          <div 
            onClick={() => navigate('/shipment-process')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-purple-600 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">7. Shipped Today</span>
              <Truck className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{shippedCount}</p>
            <p className="text-xs font-semibold text-purple-600 mt-1 flex items-center gap-1">
              Handed over to courier service <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 8: Delivered Today */}
          <div 
            onClick={() => navigate('/delivered-orders')}
            className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs hover:shadow-md cursor-pointer transition-all border-l-4 border-l-teal-600 group"
          >
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">8. Delivered Today</span>
              <CheckCircle2 className="w-5 h-5 text-teal-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{deliveredCount}</p>
            <p className="text-xs font-semibold text-teal-600 mt-1 flex items-center gap-1">
              Completed customer deliveries <ArrowRight className="w-3.5 h-3.5" />
            </p>
          </div>

          {/* Card 9: Today's Revenue */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs border-l-4 border-l-emerald-600">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">9. Today's Revenue</span>
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">
                ₹
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">₹{todayRevenue.toLocaleString('en-IN')}</p>
            <p className="text-xs font-semibold text-emerald-600 mt-1">Verified payments for {selectedDateKey}</p>
          </div>
        </div>
      </div>

      {/* Grid Section: Packaging Queue & Ready to Ship Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Packaging Queue Panel */}
        <Card className="rounded-3xl border border-amber-200 dark:border-amber-900/40">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <Box className="w-5 h-5" /> Packaging Processing Queue ({packagingPendingAll.length + packagingInProgressAll.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-amber-600 font-bold" onClick={() => navigate('/packaging')}>
                Packaging Menu ➔
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {packagingPendingAll.length + packagingInProgressAll.length === 0 ? (
              <div className="p-8 text-center text-xs text-emerald-600 font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> All confirmed orders have completed packaging!
              </div>
            ) : (
              <div className="space-y-3">
                {[...packagingInProgressAll, ...packagingPendingAll].slice(0, 5).map(ord => (
                  <div key={ord.id} className="p-3.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-emerald-700 dark:text-emerald-400">{ord.orderId}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{ord.customerName}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Items: {ord.items?.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/packaging')}
                      className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
                    >
                      Process ➔
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ready to Ship Queue Panel */}
        <Card className="rounded-3xl border border-emerald-200 dark:border-emerald-900/40">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <PackageCheck className="w-5 h-5" /> Ready To Ship Queue ({readyToShipAll.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-600 font-bold" onClick={() => navigate('/ready-to-ship')}>
                Ready to Ship ➔
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {readyToShipAll.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 font-bold">
                No packed parcels waiting for courier handover.
              </div>
            ) : (
              <div className="space-y-3">
                {readyToShipAll.slice(0, 5).map(ord => (
                  <div key={ord.id} className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-emerald-700 dark:text-emerald-400">{ord.orderId}</span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">{ord.customerName}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Amount: ₹{ord.totalAmount?.toFixed(2)} | Mobile: {ord.customerMobile}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => navigate('/ready-to-ship')}
                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    >
                      Add Shipping ➔
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts Panel */}
      {lowStockProducts.length > 0 && (
        <Card className="rounded-3xl border border-amber-300 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-extrabold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Low Stock Agarbatti Inventory Alerts ({lowStockProducts.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-amber-700 dark:text-amber-300 font-bold" onClick={() => navigate('/products')}>
                Manage Products ➔
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-xs text-gray-900 dark:text-white">{p.name}</p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                      Stock: <strong className="text-red-600 font-bold">{p.stock} units</strong>
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 px-2.5 text-[11px] border-emerald-500 text-emerald-600 font-bold rounded-lg"
                    onClick={() => {
                      setRestockModalProduct(p);
                      setRestockQty(50);
                    }}
                  >
                    Restock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restock Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h3 className="font-black text-lg text-gray-900 dark:text-white">Restock Agarbatti Inventory</h3>
            <div>
              <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{restockModalProduct.name}</p>
              <p className="text-xs text-gray-500">Current Available Stock: <strong>{restockModalProduct.stock} packets</strong></p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Add Quantity to Restock</label>
              <input 
                type="number" 
                min="1" 
                className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-slate-800 font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                value={restockQty} 
                onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRestockModalProduct(null)} className="rounded-xl text-xs font-bold">Cancel</Button>
              <Button onClick={handleRestockSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 py-2.5">
                Confirm Restock (+{restockQty})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
