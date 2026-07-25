import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  CheckSquare, 
  Clock, 
  Eye, 
  Play, 
  CheckCircle2, 
  User, 
  Phone, 
  Calendar, 
  Sparkles,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getDocuments, updateDocument } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import { formatKolkataDateTime, getTimeElapsedStr, isKolkataToday } from '../../utils/dateUtils';
import type { Order, PackagingChecklist } from '../../types';
import { DEFAULT_PACKAGING_CHECKLIST } from '../../types';

export const Packaging: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'in_progress' | 'packed_today' | 'all'>('pending');

  // Checklist modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checklist, setChecklist] = useState<PackagingChecklist>(DEFAULT_PACKAGING_CHECKLIST);
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const allOrders = await getDocuments('orders') as Order[];
      // Packaging includes orders that are confirmed/payment verified and not yet shipped or completed
      const packagingOrders = allOrders.filter(o => 
        o.orderStatus === 'Confirmed' || 
        o.orderStatus === 'Payment Verified' || 
        o.orderStatus === 'Packing' ||
        o.fulfilmentStatus === 'Packaging Pending' ||
        o.fulfilmentStatus === 'Packaging In Progress' ||
        o.packagingStatus === 'Packed'
      );
      setOrders(packagingOrders);
    } catch (e) {
      console.error('Error fetching packaging orders', e);
      addToast('Failed to load packaging orders', 'error');
    } fontFinally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStartPackaging = async (order: Order) => {
    if (!order.id) return;
    try {
      const now = new Date();
      const timelineStep = {
        status: 'Packaging Started',
        timestamp: now,
        note: 'Internal packaging commenced'
      };

      const updatedTimeline = [...(order.timeline || []), timelineStep];

      await updateDocument('orders', order.id, {
        packagingStatus: 'In Progress',
        fulfilmentStatus: 'Packaging In Progress',
        orderStatus: 'Packing',
        packagingStartedAt: now,
        timeline: updatedTimeline
      });

      addToast(`Packaging started for Order ${order.orderId}`, 'success');
      fetchOrders();
    } catch (e) {
      console.error('Error starting packaging', e);
      addToast('Failed to update packaging status', 'error');
    }
  };

  const handleOpenChecklistModal = (order: Order) => {
    setSelectedOrder(order);
    const existingChecklist = order.packagingChecklist || order.packingChecklist;
    setChecklist({
      productsCollected: existingChecklist?.productsCollected || false,
      quantitiesChecked: existingChecklist?.quantitiesChecked || false,
      productConditionChecked: existingChecklist?.productConditionChecked || false,
      placedInParcel: existingChecklist?.placedInParcel || false,
      freeSampleAdded: existingChecklist?.freeSampleAdded || false,
      invoiceAdded: existingChecklist?.invoiceAdded || false,
      parcelSealed: existingChecklist?.parcelSealed || false,
      addressLabelAttached: existingChecklist?.addressLabelAttached || false,
      mobileChecked: existingChecklist?.mobileChecked || false,
      qualityChecked: existingChecklist?.qualityChecked || false,
    });
  };

  const toggleChecklistItem = (key: keyof PackagingChecklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMarkAllChecked = () => {
    setChecklist({
      productsCollected: true,
      quantitiesChecked: true,
      productConditionChecked: true,
      placedInParcel: true,
      freeSampleAdded: true,
      invoiceAdded: true,
      parcelSealed: true,
      addressLabelAttached: true,
      mobileChecked: true,
      qualityChecked: true,
    });
  };

  const handleMarkAsPacked = async () => {
    if (!selectedOrder || !selectedOrder.id) return;

    // Check if critical items are checked
    const criticalKeys: Array<{ key: keyof PackagingChecklist; label: string }> = [
      { key: 'productsCollected', label: 'Correct products collected' },
      { key: 'quantitiesChecked', label: 'Correct quantities checked' },
      { key: 'placedInParcel', label: 'Products placed inside parcel' },
      { key: 'parcelSealed', label: 'Parcel properly sealed' },
      { key: 'addressLabelAttached', label: 'Customer address label attached' },
    ];

    const missing = criticalKeys.filter(item => !checklist[item.key]);
    if (missing.length > 0) {
      addToast(`Please check off: ${missing.map(m => m.label).join(', ')}`, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const timelineStep = {
        status: 'Packaging Completed',
        timestamp: now,
        note: 'Parcel sealed & address label attached. Moved to Ready to Ship.'
      };

      const updatedTimeline = [...(selectedOrder.timeline || []), timelineStep];

      await updateDocument('orders', selectedOrder.id, {
        packagingStatus: 'Packed',
        fulfilmentStatus: 'Ready to Ship',
        orderStatus: 'Ready To Ship',
        shippingStatus: 'Packed',
        packagingChecklist: checklist,
        packagingCompletedAt: now,
        packedAt: now,
        timeline: updatedTimeline
      });

      addToast(`Order ${selectedOrder.orderId} marked as PACKED and moved to Ready to Ship!`, 'success');
      setSelectedOrder(null);
      fetchOrders();
    } catch (e) {
      console.error('Error marking as packed', e);
      addToast('Failed to save packaging completion', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered lists
  const pendingOrders = orders.filter(o => 
    (!o.packagingStatus || o.packagingStatus === 'Not Started') && 
    o.fulfilmentStatus !== 'Ready to Ship' && 
    o.fulfilmentStatus !== 'Shipped' && 
    o.fulfilmentStatus !== 'Delivered'
  );

  const inProgressOrders = orders.filter(o => 
    o.packagingStatus === 'In Progress' && 
    o.fulfilmentStatus !== 'Ready to Ship' && 
    o.fulfilmentStatus !== 'Shipped' && 
    o.fulfilmentStatus !== 'Delivered'
  );

  const packedTodayOrders = orders.filter(o => 
    o.packagingStatus === 'Packed' && 
    (isKolkataToday(o.packagingCompletedAt) || isKolkataToday(o.packedAt))
  );

  const displayedOrders = 
    activeTab === 'pending' ? pendingOrders :
    activeTab === 'in_progress' ? inProgressOrders :
    activeTab === 'packed_today' ? packedTodayOrders :
    orders;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-emerald-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider">
              Stage 2 — Fulfilment Pipeline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-3 tracking-tight">
            <Box className="w-8 h-8 text-amber-300" />
            Internal Packaging Processing
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Prepare, verify, and seal confirmed orders. Packaging is required before generating shipping details.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15">
          <div className="text-right">
            <p className="text-xs text-amber-200 font-medium">Pending Work</p>
            <p className="text-xl font-black">{pendingOrders.length + inProgressOrders.length} Parcels</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/30 flex items-center justify-center text-amber-300 font-black text-lg">
            ⚡
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Packaging Pending
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
              {pendingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('in_progress')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'in_progress'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <Box className="w-4 h-4" />
            Packaging In Progress
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'in_progress' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'}`}>
              {inProgressOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('packed_today')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'packed_today'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Packed Today
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'packed_today' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
              {packedTodayOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            All Packaging ({orders.length})
          </button>
        </div>
      </div>

      {/* Orders Grid / Cards */}
      {loading ? (
        <div className="p-12 text-center text-gray-500 font-semibold text-sm">
          Loading packaging queue...
        </div>
      ) : displayedOrders.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">No Orders in this Packaging View</h3>
            <p className="text-xs text-gray-500">
              All confirmed orders for this filter have been processed or moved to Ready to Ship.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedOrders.map((ord) => {
            const status = ord.packagingStatus || 'Not Started';
            const isPending = status === 'Not Started';
            const isInProgress = status === 'In Progress';
            const isPacked = status === 'Packed';

            const timeElapsed = getTimeElapsedStr(ord.orderDate || ord.createdAt);

            return (
              <div 
                key={ord.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isInProgress 
                    ? 'border-orange-400 ring-2 ring-orange-500/20' 
                    : isPacked 
                    ? 'border-emerald-300 dark:border-emerald-800' 
                    : 'border-amber-200 dark:border-gray-800'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-800/40 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
                          {ord.orderId}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                          Payment Verified ✓
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatKolkataDateTime(ord.orderDate || ord.createdAt)}
                      </p>
                    </div>

                    <div className="text-right">
                      {isPending && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                      {isInProgress && (
                        <span className="px-2.5 py-1 bg-orange-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                          <Box className="w-3 h-3" /> In Progress
                        </span>
                      )}
                      {isPacked && (
                        <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" /> Packed
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 font-semibold mt-1">Confirmed {timeElapsed}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {ord.customerName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {ord.customerMobile}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-extrabold text-gray-900 dark:text-white">
                          ₹{ord.totalAmount?.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-400">{ord.items?.length || 0} items</p>
                      </div>
                    </div>

                    {/* Products List */}
                    <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-2xl space-y-1.5 border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                        <span>Items to Pack</span>
                        <span>Qty</span>
                      </p>
                      {ord.items?.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[200px]">
                            • {it.productName} {it.fragrance ? `(${it.fragrance})` : ''}
                          </span>
                          <span className="font-black bg-white dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600 text-emerald-700 dark:text-emerald-400">
                            x{it.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {ord.orderNotes && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-900">
                        📌 <strong>Note:</strong> {ord.orderNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-slate-800/20 flex items-center justify-between gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs font-bold text-gray-600 dark:text-gray-300"
                    onClick={() => navigate(`/orders/${ord.id}`)}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> View Order
                  </Button>

                  {isPending && (
                    <Button 
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                      onClick={() => handleStartPackaging(ord)}
                    >
                      <Play className="w-3.5 h-3.5 fill-white" /> Start Packaging
                    </Button>
                  )}

                  {isInProgress && (
                    <Button 
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5"
                      onClick={() => handleOpenChecklistModal(ord)}
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Complete Checklist & Pack
                    </Button>
                  )}

                  {isPacked && (
                    <Button 
                      size="sm"
                      variant="outline"
                      className="border-emerald-600 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs rounded-xl"
                      onClick={() => handleOpenChecklistModal(ord)}
                    >
                      View Checklist
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Internal Packaging Checklist Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 my-8">
            <div className="flex justify-between items-start border-b pb-4 dark:border-gray-800">
              <div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                  Internal Packaging Checklist
                </span>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                  Order {selectedOrder.orderId} — {selectedOrder.customerName}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Verify all 10 internal packing criteria before sealing the parcel.
                </p>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedOrder(null)} 
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            </div>

            {/* Address Summary */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-2xl border text-xs space-y-1 dark:border-gray-700">
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Delivery Address:
              </p>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                {typeof selectedOrder.shippingAddress === 'object' ? (
                  `${selectedOrder.shippingAddress.houseNo}, ${selectedOrder.shippingAddress.building}, ${selectedOrder.shippingAddress.street}, ${selectedOrder.shippingAddress.area}, ${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state} - ${selectedOrder.shippingAddress.pinCode}`
                ) : (
                  selectedOrder.shippingAddress
                )}
              </p>
            </div>

            {/* The 10 Checklist Items */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Safety & Quality Tasks</span>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-emerald-600 font-bold hover:bg-emerald-50 h-7"
                  onClick={handleMarkAllChecked}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Select All Checklist Items
                </Button>
              </div>

              {[
                { key: 'productsCollected', label: 'Correct products collected from warehouse' },
                { key: 'quantitiesChecked', label: 'Correct item quantities verified' },
                { key: 'productConditionChecked', label: 'Product condition & packaging intact' },
                { key: 'placedInParcel', label: 'Products safely placed inside parcel' },
                { key: 'freeSampleAdded', label: 'Free sample added, when applicable' },
                { key: 'invoiceAdded', label: 'Invoice or packing slip added inside parcel' },
                { key: 'parcelSealed', label: 'Parcel properly sealed with secure tape' },
                { key: 'addressLabelAttached', label: 'Customer address label firmly attached' },
                { key: 'mobileChecked', label: 'Customer mobile number checked on label' },
                { key: 'qualityChecked', label: 'Final quality & weight check completed' },
              ].map((item) => {
                const isChecked = checklist[item.key as keyof PackagingChecklist];
                return (
                  <label 
                    key={item.key}
                    onClick={() => toggleChecklistItem(item.key as keyof PackagingChecklist)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                        : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs ${
                      isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-300 text-transparent'
                    }`}>
                      ✓
                    </div>
                    <span className="text-xs font-semibold">{item.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-3 border-t dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setSelectedOrder(null)} 
                className="w-full sm:w-auto rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>

              <Button 
                onClick={handleMarkAsPacked} 
                disabled={isSaving}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <span>MARK AS PACKED ✅</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
