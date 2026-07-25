import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, 
  Search, 
  Copy, 
  ExternalLink, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  User, 
  Check, 
  Eye,
  Clock,
  RotateCcw,
  Send,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getDocuments, updateDocument, generateWhatsAppMessage, generateWhatsAppLink } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { formatKolkataDate, formatKolkataDateTime, isKolkataToday } from '../../utils/dateUtils';
import type { Order } from '../../types';

export const ShipmentProcess: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'shipped_today' | 'in_transit' | 'delivery_pending' | 'returned' | 'all'>('shipped_today');

  const [copiedAddressId, setCopiedAddressId] = useState<string | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getDocuments('orders') as Order[];
      // Filter shipped / in transit / returned orders
      const shippedOrders = allOrders.filter(
        (o) => o.fulfilmentStatus === 'Shipped' || 
               o.orderStatus === 'Shipment Process' || 
               o.shippingStatus === 'In Transit' ||
               o.shippingStatus === 'Returned' ||
               o.fulfilmentStatus === 'Returned'
      );
      setOrders(shippedOrders);
    } catch (e) {
      console.error('Error fetching shipment process orders', e);
      addToast('Failed to load shipment orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopyAddress = (orderId: string, address: string | any) => {
    const fullAddress = typeof address === 'string'
      ? address
      : `${address.houseNo ? address.houseNo + ', ' : ''}${address.building ? address.building + ', ' : ''}${address.street ? address.street + ', ' : ''}${address.area ? address.area + ', ' : ''}${address.city}, ${address.state} - ${address.pinCode}`;
    
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddressId(orderId);
    addToast('Address copied to clipboard!', 'success');
    setTimeout(() => setCopiedAddressId(null), 2000);
  };

  const handleCopyTrackingId = (orderId: string, trackingId?: string) => {
    if (!trackingId) return;
    navigator.clipboard.writeText(trackingId);
    setCopiedTrackingId(orderId);
    addToast('Tracking ID copied to clipboard!', 'success');
    setTimeout(() => setCopiedTrackingId(null), 2000);
  };

  const handleOpenWhatsApp = async (order: Order) => {
    if (!order.id) return;
    const msg = generateWhatsAppMessage({
      customerName: order.customerName,
      orderId: order.orderId,
      courierCompany: order.courierCompany || 'Courier Service',
      trackingId: order.trackingId || 'N/A',
      trackingUrl: order.trackingUrl || 'N/A'
    });

    const link = generateWhatsAppLink(order.customerWhatsapp || order.customerMobile, msg);
    const now = new Date();

    // Log whatsappOpenedAt
    try {
      await updateDocument('orders', order.id, {
        whatsappOpenedAt: now,
        timeline: [
          ...(order.timeline || []),
          { status: 'WhatsApp Tracking Opened', timestamp: now, note: 'Opened WhatsApp with tracking message template' }
        ]
      });
    } catch (e) {
      console.error('Error logging WhatsApp timestamp', e);
    }

    window.open(link, '_blank');
  };

  const handleMarkWhatsAppSent = async (order: Order) => {
    if (!order.id) return;
    try {
      setUpdatingId(order.id);
      const now = new Date();
      await updateDocument('orders', order.id, {
        whatsappTrackingSent: true,
        whatsappTrackingSentAt: now,
        timeline: [
          ...(order.timeline || []),
          { status: 'Tracking Message Marked as Sent', timestamp: now }
        ]
      });

      addToast(`WhatsApp tracking status updated to SENT for Order ${order.orderId}`, 'success');
      fetchOrders();
    } catch (e) {
      console.error('Error marking WhatsApp sent', e);
      addToast('Failed to update WhatsApp status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkDelivered = async (order: Order) => {
    if (!order.id) return;
    try {
      setUpdatingId(order.id);
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      await updateDocument('orders', order.id, {
        orderStatus: 'Delivered',
        fulfilmentStatus: 'Delivered',
        shippingStatus: 'Delivered',
        deliveredDate: now,
        deliveredAt: now,
        deliveryTime: timeString,
        timeline: [
          ...(order.timeline || []),
          {
            status: 'Delivered',
            timestamp: now,
            note: `Delivered on ${formatKolkataDate(now)} at ${timeString}`
          }
        ]
      });

      addToast(`Order ${order.orderId} successfully marked as DELIVERED! Moved to Delivered menu. 🎉`, 'success');
      fetchOrders();
    } catch (e) {
      console.error('Error marking order as delivered', e);
      addToast('Failed to mark order as delivered', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleMarkReturned = async (order: Order) => {
    if (!order.id) return;
    try {
      setUpdatingId(order.id);
      const now = new Date();
      await updateDocument('orders', order.id, {
        fulfilmentStatus: 'Returned',
        shippingStatus: 'Returned',
        timeline: [
          ...(order.timeline || []),
          { status: 'Returned', timestamp: now, note: 'Parcel marked as returned by courier' }
        ]
      });

      addToast(`Order ${order.orderId} marked as RETURNED`, 'error');
      fetchOrders();
    } catch (e) {
      console.error('Error marking parcel returned', e);
      addToast('Failed to update status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter tabs logic
  const shippedTodayOrders = orders.filter(o => isKolkataToday(o.shippedAt || o.shippingDate));
  const inTransitOrders = orders.filter(o => o.shippingStatus !== 'Delivered' && o.shippingStatus !== 'Returned');
  const deliveryPendingOrders = orders.filter(o => o.shippingStatus === 'In Transit' || !o.deliveredAt);
  const returnedOrders = orders.filter(o => o.shippingStatus === 'Returned' || o.fulfilmentStatus === 'Returned');

  const displayedOrders = 
    activeTab === 'shipped_today' ? shippedTodayOrders :
    activeTab === 'in_transit' ? inTransitOrders :
    activeTab === 'delivery_pending' ? deliveryPendingOrders :
    activeTab === 'returned' ? returnedOrders :
    orders;

  const filteredOrders = displayedOrders.filter((o) => {
    const q = searchTerm.toLowerCase();
    const addressStr = typeof o.shippingAddress === 'string'
      ? o.shippingAddress
      : `${o.shippingAddress.city} ${o.shippingAddress.state} ${o.shippingAddress.pinCode}`;
    return (
      o.orderId.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerMobile.includes(q) ||
      (o.trackingId && o.trackingId.toLowerCase().includes(q)) ||
      (o.courierCompany && o.courierCompany.toLowerCase().includes(q)) ||
      addressStr.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-400/20 text-purple-300 border border-purple-400/30 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Stage 4 — Active Courier Logistics
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <Truck className="w-8 h-8 text-purple-300" />
            Shipping Management
          </h1>
          <p className="text-purple-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Track live courier dispatches, send pre-filled WhatsApp tracking messages, and update delivery completions.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-xs text-purple-200 font-medium">In Transit</p>
            <p className="text-xl font-black text-purple-300">{inTransitOrders.length} Shipments</p>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('shipped_today')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'shipped_today'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Shipped Today
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'shipped_today' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'}`}>
              {shippedTodayOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_transit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'in_transit'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            In Transit
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'in_transit' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'}`}>
              {inTransitOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('delivery_pending')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'delivery_pending'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Delivery Pending
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'delivery_pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
              {deliveryPendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('returned')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'returned'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Returned ({returnedOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            All Shipments ({orders.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Order ID, Customer, AWB..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Shipments Cards */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold text-sm">
          Loading shipments...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center text-purple-600 mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">No Shipments Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Add courier and tracking details in Ready to Ship (Stage 3) to populate active shipments here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const formattedShippingDate = formatKolkataDateTime(order.shippedAt || order.shippingDate);
            const isReturned = order.fulfilmentStatus === 'Returned' || order.shippingStatus === 'Returned';
            const isWhatsAppSent = order.whatsappTrackingSent;

            const fullAddrString = typeof order.shippingAddress === 'string'
              ? order.shippingAddress
              : `${order.shippingAddress.houseNo ? order.shippingAddress.houseNo + ', ' : ''}${order.shippingAddress.building ? order.shippingAddress.building + ', ' : ''}${order.shippingAddress.street ? order.shippingAddress.street + ', ' : ''}${order.shippingAddress.area ? order.shippingAddress.area + ', ' : ''}${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pinCode}`;

            return (
              <div
                key={order.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden ${
                  isReturned 
                    ? 'border-red-300 dark:border-red-900' 
                    : 'border-purple-200 dark:border-purple-900/50'
                }`}
              >
                <div className={`absolute top-0 left-0 w-2 h-full ${isReturned ? 'bg-red-500' : 'bg-purple-600'}`}></div>

                {/* Top Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-black text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-3 py-1 rounded-xl border border-purple-500/20">
                      {order.orderId}
                    </span>
                    
                    {isReturned ? (
                      <span className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                        <AlertTriangle className="w-3.5 h-3.5" /> RETURNED
                      </span>
                    ) : (
                      <span className="bg-purple-600 text-white font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                        <Truck className="w-3.5 h-3.5" /> SHIPPED
                      </span>
                    )}

                    {isWhatsAppSent ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Tracking Shared
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-300">
                        WhatsApp Pending
                      </span>
                    )}

                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      Shipped: <span className="font-bold text-gray-800 dark:text-gray-200">{formattedShippingDate}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Order Total:</span>
                    <span className="text-xl font-black text-gray-900 dark:text-white">₹{order.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Customer Info */}
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                    <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-purple-600" /> Customer Information
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{order.customerName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-bold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> {order.customerMobile}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 font-medium leading-relaxed truncate">
                      <MapPin className="w-3 h-3 inline mr-1 text-purple-600" />
                      {fullAddrString}
                    </p>
                  </div>

                  {/* Courier Details */}
                  <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-2xl border border-purple-100 dark:border-purple-900 space-y-1.5">
                    <div className="text-[10px] font-extrabold text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" /> Courier & AWB
                    </div>
                    <p className="text-xs text-gray-500">Courier Company:</p>
                    <p className="text-sm font-black text-purple-900 dark:text-purple-200">{order.courierCompany || 'Shree Tirupati Courier'}</p>
                    
                    <div className="pt-1.5 flex items-center justify-between border-t border-purple-200 dark:border-purple-800">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">Tracking ID:</p>
                        <p className="text-xs font-mono font-black text-gray-900 dark:text-white">{order.trackingId || 'N/A'}</p>
                      </div>
                      {order.trackingId && (
                        <button
                          onClick={() => handleCopyTrackingId(order.id!, order.trackingId)}
                          className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 shadow-2xs"
                        >
                          {copiedTrackingId === order.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedTrackingId === order.id ? 'Copied' : 'Copy AWB'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tracking Link & WhatsApp Status */}
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                        Tracking Link
                      </div>
                      {order.trackingUrl ? (
                        <a
                          href={order.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline truncate block flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{order.trackingUrl}</span>
                        </a>
                      ) : (
                        <p className="text-xs text-gray-400 font-medium">No tracking URL provided</p>
                      )}
                    </div>

                    <div className="pt-2 border-t dark:border-gray-700 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Expected Delivery:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {order.expectedDeliveryDate ? formatKolkataDate(order.expectedDeliveryDate) : '3-5 Days'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Toolbar Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* SEND TRACKING ON WHATSAPP Button */}
                    <Button
                      onClick={() => handleOpenWhatsApp(order)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4 fill-white text-emerald-600" />
                      SEND TRACKING ON WHATSAPP
                    </Button>

                    {!isWhatsAppSent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkWhatsAppSent(order)}
                        disabled={updatingId === order.id}
                        className="rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50"
                      >
                        <Send className="w-3.5 h-3.5 mr-1" /> Mark Message as Sent
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-xl text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Order
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyAddress(order.id!, order.shippingAddress)}
                      className="rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300"
                    >
                      {copiedAddressId === order.id ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copiedAddressId === order.id ? 'Address Copied!' : 'Copy Address'}
                    </Button>

                    {!isReturned && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkReturned(order)}
                        disabled={updatingId === order.id}
                        className="rounded-xl text-xs font-bold text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Mark Returned
                      </Button>
                    )}
                  </div>

                  <Button
                    onClick={() => handleMarkDelivered(order)}
                    disabled={updatingId === order.id}
                    className="bg-emerald-900 hover:bg-emerald-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    MARK AS DELIVERED
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
