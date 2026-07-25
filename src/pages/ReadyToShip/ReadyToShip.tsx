import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PackageCheck, 
  Search, 
  Eye, 
  Printer, 
  Truck, 
  Clock, 
  User, 
  Phone, 
  Tag, 
  CheckCircle2, 
  X,
  Copy,
  ArrowLeft,
  MapPin
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getDocuments, updateDocument, getDefaultTrackingUrl, getStoreSettings } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { formatKolkataDateTime } from '../../utils/dateUtils';
import type { Order, CourierCompany, StoreSettings } from '../../types';

const COURIER_OPTIONS: CourierCompany[] = [
  'Shree Tirupati Courier',
  'India Post',
  'DTDC',
  'Delhivery',
  'Blue Dart',
  'Xpressbees',
  'Shadowfax',
  'Other'
];

export const ReadyToShip: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Modals state
  const [shipmentModalOrder, setShipmentModalOrder] = useState<Order | null>(null);
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState<Order | null>(null);
  const [printPackingSlipOrder, setPrintPackingSlipOrder] = useState<Order | null>(null);
  const [printShippingLabelOrder, setPrintShippingLabelOrder] = useState<Order | null>(null);

  // Shipment Form inputs
  const [courierCompany, setCourierCompany] = useState<CourierCompany>('Shree Tirupati Courier');
  const [trackingId, setTrackingId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [shippingDate, setShippingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [savingShipment, setSavingShipment] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [allOrders, storeSettings] = await Promise.all([
        getDocuments('orders'),
        getStoreSettings()
      ]);
      setSettings(storeSettings);
      
      // Filter ONLY packed orders where tracking ID has not yet been saved / not yet shipped
      const rtsOrders = (allOrders as Order[]).filter(
        (o) => (o.fulfilmentStatus === 'Ready to Ship' || o.orderStatus === 'Ready To Ship') &&
               o.fulfilmentStatus !== 'Shipped' &&
               o.fulfilmentStatus !== 'Delivered'
      );
      setOrders(rtsOrders);
    } catch (e) {
      console.error('Error loading ready to ship orders', e);
      addToast('Failed to load Ready To Ship orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopyAddress = (order: Order) => {
    const addressStr = typeof order.shippingAddress === 'string'
      ? order.shippingAddress
      : `${order.shippingAddress.houseNo}, ${order.shippingAddress.building}, ${order.shippingAddress.street}, ${order.shippingAddress.area}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pinCode}`;
    
    const formatted = `${order.customerName}\nPhone: ${order.customerMobile}\n${addressStr}`;
    navigator.clipboard.writeText(formatted);
    addToast('Customer address copied to clipboard!', 'success');
  };

  const handleReturnToPackaging = async (order: Order) => {
    if (!order.id) return;
    try {
      const now = new Date();
      const updatedTimeline = [
        ...(order.timeline || []),
        { status: 'Returned to Packaging', timestamp: now, note: 'Order sent back for packaging verification' }
      ];

      await updateDocument('orders', order.id, {
        fulfilmentStatus: 'Packaging In Progress',
        packagingStatus: 'In Progress',
        orderStatus: 'Packing',
        timeline: updatedTimeline
      });

      addToast(`Order ${order.orderId} returned to Packaging Processing`, 'success');
      fetchOrders();
    } catch (e) {
      console.error('Error returning order to packaging', e);
      addToast('Failed to return order to packaging', 'error');
    }
  };

  const handleTrackingIdChange = (id: string) => {
    setTrackingId(id);
    const autoUrl = getDefaultTrackingUrl(courierCompany, id);
    setTrackingUrl(autoUrl);
  };

  const handleCourierChange = (company: CourierCompany) => {
    setCourierCompany(company);
    if (trackingId) {
      setTrackingUrl(getDefaultTrackingUrl(company, trackingId));
    }
  };

  const openConfirmShipmentModal = (order: Order) => {
    setShipmentModalOrder(order);
    setCourierCompany((order.courierCompany as CourierCompany) || 'Shree Tirupati Courier');
    setTrackingId(order.trackingId || '');
    setTrackingUrl(order.trackingUrl || getDefaultTrackingUrl('Shree Tirupati Courier', order.trackingId || ''));
    setShippingDate(order.shippingDate ? new Date(order.shippingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setShippingNotes(order.shippingNotes || '');
    
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 4);
    setExpectedDeliveryDate(expDate.toISOString().split('T')[0]);
  };

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentModalOrder || !shipmentModalOrder.id) return;

    if (!courierCompany) {
      addToast('Courier Company is required', 'error');
      return;
    }

    if (!trackingId.trim()) {
      addToast('Tracking ID is required before marking as shipped', 'error');
      return;
    }

    try {
      setSavingShipment(true);
      const now = new Date();
      const finalTrackingUrl = trackingUrl.trim() || getDefaultTrackingUrl(courierCompany, trackingId);
      
      const timelineStep = {
        status: 'Handed to Courier',
        timestamp: now,
        note: `Handed over to ${courierCompany}. Tracking ID: ${trackingId.trim()}`
      };

      await updateDocument('orders', shipmentModalOrder.id, {
        courierCompany,
        trackingId: trackingId.trim(),
        trackingUrl: finalTrackingUrl,
        shippingDate: new Date(shippingDate),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        shippingNotes: shippingNotes.trim(),
        shippedAt: now,
        fulfilmentStatus: 'Shipped',
        orderStatus: 'Confirmed',
        shippingStatus: 'In Transit',
        timeline: [...(shipmentModalOrder.timeline || []), timelineStep]
      });

      addToast(`Order ${shipmentModalOrder.orderId} marked as SHIPPED! Moved to Shipping menu. 🚀`, 'success');
      setShipmentModalOrder(null);
      fetchOrders();
    } catch (e) {
      console.error('Error saving shipment', e);
      addToast('Failed to save shipment details', 'error');
    } finally {
      setSavingShipment(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.toLowerCase();
    const addressStr = typeof o.shippingAddress === 'string' 
      ? o.shippingAddress 
      : `${o.shippingAddress.city} ${o.shippingAddress.state} ${o.shippingAddress.pinCode}`;
    return (
      o.orderId.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerMobile.includes(q) ||
      addressStr.toLowerCase().includes(q) ||
      o.items.some(i => i.productName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-amber-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Stage 3 — Physical Parcels Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <PackageCheck className="w-8 h-8 text-amber-300" />
            Ready To Ship
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Sealed parcels with attached address labels waiting for courier handover. Click Add Shipping Details to enter Tracking ID.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-xs text-emerald-200 font-medium">Ready Parcels</p>
            <p className="text-xl font-black text-amber-300">{orders.length} Parcels</p>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Order ID, Customer, Mobile, Address..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Showing <span className="font-bold text-gray-900 dark:text-white">{filteredOrders.length}</span> packed parcels
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold text-sm">
          Loading Ready to Ship parcels...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-gray-900 dark:text-white">No Parcels Waiting for Courier</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            When you complete packaging and click "Mark as Packed" in Stage 2, orders will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const packedTimeStr = formatKolkataDateTime(order.packagingCompletedAt || order.packedAt || order.updatedAt);
            const addressText = typeof order.shippingAddress === 'string' 
              ? order.shippingAddress 
              : `${order.shippingAddress.houseNo}, ${order.shippingAddress.building}, ${order.shippingAddress.street}, ${order.shippingAddress.area}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pinCode}`;

            return (
              <div 
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 p-5 shadow-xs hover:shadow-md transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-500/20">
                      {order.orderId}
                    </span>
                    <span className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready to Ship
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      Packed: <span className="font-bold text-gray-800 dark:text-gray-200">{packedTimeStr}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Total Amount:</span>
                    <span className="text-xl font-black text-gray-900 dark:text-white">₹{order.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Grid Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Customer & Address */}
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                    <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-emerald-600" /> Customer & Full Address
                    </div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{order.customerName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> {order.customerMobile}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 font-medium leading-relaxed">
                      <MapPin className="w-3 h-3 inline mr-1 text-emerald-600" />
                      {addressText}
                    </p>
                  </div>

                  {/* Items list */}
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 md:col-span-2 space-y-2">
                    <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-amber-600" /> Items Sealed in Parcel ({order.items?.length || 0})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {order.items?.map((it, idx) => (
                        <span 
                          key={idx}
                          className="bg-white dark:bg-slate-900 text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"
                        >
                          {it.productName} {it.fragrance ? `(${it.fragrance})` : ''} × <strong className="text-emerald-700 dark:text-emerald-400">{it.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="rounded-xl text-xs font-bold"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Full Order
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCopyAddress(order)}
                      className="rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Copy Address
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPrintInvoiceOrder(order)}
                      className="rounded-xl text-xs font-bold text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Print Invoice
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPrintPackingSlipOrder(order)}
                      className="rounded-xl text-xs font-bold text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900 font-bold"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Print Slip
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPrintShippingLabelOrder(order)}
                      className="rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900"
                    >
                      <Tag className="w-3.5 h-3.5 mr-1" /> Print Label
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReturnToPackaging(order)}
                      className="rounded-xl text-xs font-bold text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Return to Packaging
                    </Button>
                  </div>

                  <Button
                    onClick={() => openConfirmShipmentModal(order)}
                    className="bg-gradient-to-r from-emerald-600 to-amber-600 hover:from-emerald-700 hover:to-amber-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    ADD SHIPPING DETAILS
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD SHIPPING DETAILS MODAL */}
      {shipmentModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Stage 4 — Add Shipping Details</h3>
                  <p className="text-xs text-gray-500">Order ID: <span className="font-bold text-emerald-600">{shipmentModalOrder.orderId}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setShipmentModalOrder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShipment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Courier Company *
                </label>
                <select
                  value={courierCompany}
                  onChange={(e) => handleCourierChange(e.target.value as CourierCompany)}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  required
                >
                  {COURIER_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Courier Tracking ID (AWB Number) *
                </label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => handleTrackingIdChange(e.target.value)}
                  placeholder="e.g. TPC12345678 or DEL987654"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Tracking URL
                </label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="Auto-generated or custom website tracking URL"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Shipping Date
                  </label>
                  <input
                    type="date"
                    value={shippingDate}
                    onChange={(e) => setShippingDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Shipping Notes (Optional)
                </label>
                <input
                  type="text"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="e.g. Handed over at depot #2"
                  className="w-full px-3.5 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                🚀 Clicking <strong>Mark as Shipped</strong> will move <strong>{shipmentModalOrder.orderId}</strong> into the <strong>Shipping</strong> menu and enable WhatsApp tracking link dispatch!
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShipmentModalOrder(null)}
                  className="rounded-xl text-xs font-bold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={savingShipment}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md"
                >
                  {savingShipment ? 'Saving...' : 'Mark as Shipped'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT PACKING SLIP MODAL */}
      {printPackingSlipOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-gray-900 space-y-4">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-black text-base">WAREHOUSE PACKING SLIP</h3>
                <p className="text-xs text-gray-500">Order ID: {printPackingSlipOrder.orderId}</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded">PACKED ✅</span>
            </div>

            <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-xl">
              <p><strong>Customer:</strong> {printPackingSlipOrder.customerName}</p>
              <p><strong>Phone:</strong> {printPackingSlipOrder.customerMobile}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-gray-500">Items:</p>
              <div className="space-y-1 text-xs">
                {printPackingSlipOrder.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b pb-1">
                    <span>{item.productName}</span>
                    <span className="font-bold text-emerald-700">{item.quantity} Pkts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setPrintPackingSlipOrder(null)} className="rounded-xl text-xs">Close</Button>
              <Button onClick={() => window.print()} className="bg-purple-600 text-white rounded-xl text-xs font-bold">
                <Printer className="w-4 h-4 mr-1" /> Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SHIPPING LABEL MODAL */}
      {printShippingLabelOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl text-gray-900 space-y-4 border-4 border-dashed border-gray-300">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-lg text-emerald-800">ASMITA GRUH UDHYOG</h3>
                <p className="text-[10px] text-gray-500 font-bold">PARCEL SHIPPING LABEL</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-gray-900">{printShippingLabelOrder.orderId}</span>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-xl border border-gray-300">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">DELIVER TO:</p>
              <p className="text-base font-black text-gray-900">{printShippingLabelOrder.customerName}</p>
              <p className="text-xs font-bold text-gray-800">Phone: {printShippingLabelOrder.customerMobile}</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">
                {typeof printShippingLabelOrder.shippingAddress === 'string' 
                  ? printShippingLabelOrder.shippingAddress 
                  : `${printShippingLabelOrder.shippingAddress.houseNo}, ${printShippingLabelOrder.shippingAddress.building}, ${printShippingLabelOrder.shippingAddress.street}, ${printShippingLabelOrder.shippingAddress.area}, ${printShippingLabelOrder.shippingAddress.city}, ${printShippingLabelOrder.shippingAddress.state} - ${printShippingLabelOrder.shippingAddress.pinCode}`}
              </p>
            </div>

            <div className="text-[11px] text-gray-600 pt-2 border-t">
              <p className="font-bold text-gray-900">FROM: {settings?.businessName || 'Asmita Gruh Udhyog'}</p>
              <p>{settings?.businessAddress}, {settings?.city}, {settings?.state} - {settings?.pinCode}</p>
              <p>Ph: {settings?.phone}</p>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => setPrintShippingLabelOrder(null)} className="rounded-xl text-xs">Close</Button>
              <Button onClick={() => window.print()} className="bg-amber-600 text-white rounded-xl text-xs font-bold">
                <Printer className="w-4 h-4 mr-1" /> Print Label
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* PRINT INVOICE MODAL */}
      {printInvoiceOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl text-gray-900 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-black text-base text-emerald-800">{settings?.businessName || 'Asmita Gruh Udhyog'}</h3>
                <p className="text-xs text-gray-500">Tax Invoice — Order {printInvoiceOrder.orderId}</p>
              </div>
              <span className="text-xs font-bold text-gray-500">Date: {new Date().toLocaleDateString('en-IN')}</span>
            </div>

            <div className="text-xs space-y-1 bg-gray-50 p-3 rounded-xl border">
              <p><strong>Customer:</strong> {printInvoiceOrder.customerName}</p>
              <p><strong>Mobile:</strong> {printInvoiceOrder.customerMobile}</p>
              <p><strong>Address:</strong> {typeof printInvoiceOrder.shippingAddress === 'string' ? printInvoiceOrder.shippingAddress : `${printInvoiceOrder.shippingAddress.houseNo}, ${printInvoiceOrder.shippingAddress.building}, ${printInvoiceOrder.shippingAddress.street}, ${printInvoiceOrder.shippingAddress.area}, ${printInvoiceOrder.shippingAddress.city}, ${printInvoiceOrder.shippingAddress.state} - ${printShippingLabelOrder?.shippingAddress ? '' : printInvoiceOrder.shippingAddress.pinCode}`}</p>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-emerald-600 text-white font-bold">
                  <th className="p-2">Item</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Price</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {printInvoiceOrder.items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-bold">{it.productName}</td>
                    <td className="p-2 text-center">{it.quantity}</td>
                    <td className="p-2 text-right">₹{it.price}</td>
                    <td className="p-2 text-right font-bold">₹{it.quantity * it.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center pt-2 font-bold text-sm">
              <span>Grand Total Amount</span>
              <span className="text-emerald-700">₹{printInvoiceOrder.totalAmount?.toFixed(2)}</span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => setPrintInvoiceOrder(null)} className="rounded-xl text-xs font-bold">Close</Button>
              <Button onClick={() => window.print()} className="bg-blue-600 text-white rounded-xl text-xs font-bold">
                <Printer className="w-4 h-4 mr-1" /> Print Invoice
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
