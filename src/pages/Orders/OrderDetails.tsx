import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Copy, Printer, Check, CheckCircle, Package, Send, Loader2, 
  Phone, ExternalLink, Image as ImageIcon, ZoomIn, Clock, Truck, ShieldCheck, User
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { updateDocument, deductProductStock, getStoreSettings } from '../../services/db';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Order, StoreSettings, CourierCompany } from '../../types';
import { useToast } from '../../contexts/ToastContext';

export const OrderDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Shipping Form States
  const [courier, setCourier] = useState<CourierCompany | string>('Delhivery');
  const [trackingId, setTrackingId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [shippingStatus, setShippingStatus] = useState('');
  const [savingShipping, setSavingShipping] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Quick Action feedback
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Screenshot Lightbox
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

  // Printable Refs
  const invoiceRef = useRef<HTMLDivElement>(null);
  const packingSlipRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const COURIER_OPTIONS = ['Delhivery', 'India Post', 'DTDC', 'Blue Dart', 'Xpressbees', 'Shadowfax', 'Other'];
  const ORDER_STATUS_STEPS = ['Pending Payment', 'Payment Verified', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const SHIPPING_STATUS_OPTIONS = ['Ready to Pack', 'Packed', 'Out for Pickup', 'In Transit', 'Delivered', 'Returned'];

  useEffect(() => {
    fetchOrderAndSettings();
  }, [id]);

  const fetchOrderAndSettings = async () => {
    if (!id) return;
    try {
      const [orderSnap, settings] = await Promise.all([
        getDoc(doc(db, 'orders', id)),
        getStoreSettings()
      ]);

      setStoreSettings(settings);

      if (orderSnap.exists()) {
        const ord = { id: orderSnap.id, ...orderSnap.data() } as Order;
        setOrder(ord);
        setCourier(ord.courierCompany || 'Delhivery');
        setTrackingId(ord.trackingId || '');
        setTrackingUrl(ord.trackingUrl || '');
        setOrderStatus(ord.orderStatus || 'Pending Payment');
        setShippingStatus(ord.shippingStatus || 'Ready to Pack');
      }
    } catch (error) {
      console.error("Error loading order:", error);
      showToast('Error loading order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!id || !order) return;
    setVerifyingPayment(true);
    try {
      const newTimeline = [
        ...(order.timeline || []),
        { status: 'Payment Verified', timestamp: new Date() },
        { status: 'Confirmed', timestamp: new Date() }
      ];

      // Auto-deduct stock on confirmation if not already deducted
      if (order.orderStatus !== 'Confirmed' && order.orderStatus !== 'Packed' && order.orderStatus !== 'Shipped' && order.orderStatus !== 'Delivered') {
        await deductProductStock(order.items);
      }

      await updateDocument('orders', id, {
        paymentStatus: 'Payment Verified',
        orderStatus: 'Confirmed',
        timeline: newTimeline
      });

      setOrder(prev => prev ? { ...prev, paymentStatus: 'Payment Verified', orderStatus: 'Confirmed', timeline: newTimeline } : null);
      setOrderStatus('Confirmed');
      showToast('Payment verified & order confirmed! Product stock updated.');
    } catch (error) {
      console.error("Error verifying payment:", error);
      showToast('Failed to verify payment', 'error');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleSaveShippingDetails = async () => {
    if (!id || !order) return;
    setSavingShipping(true);
    try {
      // Auto build tracking URL if empty
      let finalTrackingUrl = trackingUrl;
      if (!finalTrackingUrl && trackingId) {
        if (courier === 'Delhivery') finalTrackingUrl = `https://www.delhivery.com/track/package/${trackingId}`;
        else if (courier === 'DTDC') finalTrackingUrl = `https://www.dtdc.in/tracking/shipment-tracking.asp`;
        else if (courier === 'India Post') finalTrackingUrl = `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
      }

      const updatedTimeline = [...(order.timeline || [])];
      if (orderStatus === 'Shipped' && !updatedTimeline.some(t => t.status === 'Shipped')) {
        updatedTimeline.push({ status: 'Shipped', timestamp: new Date() });
      }

      await updateDocument('orders', id, {
        courierCompany: courier,
        trackingId: trackingId,
        trackingUrl: finalTrackingUrl,
        orderStatus: orderStatus,
        shippingStatus: shippingStatus,
        shippingDate: new Date(),
        timeline: updatedTimeline
      });

      setOrder(prev => prev ? { 
        ...prev, 
        courierCompany: courier, 
        trackingId, 
        trackingUrl: finalTrackingUrl, 
        orderStatus: orderStatus as any,
        shippingStatus: shippingStatus as any,
        timeline: updatedTimeline
      } : null);

      showToast('Shipping details saved successfully!');
    } catch (error) {
      console.error("Error updating shipping:", error);
      showToast('Failed to save shipping details', 'error');
    } finally {
      setSavingShipping(false);
    }
  };

  const formatAddressString = (addr: any) => {
    if (!addr) return 'N/A';
    if (typeof addr === 'string') return addr;
    return `${addr.houseNo || ''}, ${addr.building || ''}, ${addr.street || ''}, ${addr.area || ''}${addr.landmark ? ', Landmark: ' + addr.landmark : ''}, ${addr.city || ''}, ${addr.district || ''}, ${addr.state || ''} - ${addr.pinCode || ''}`;
  };

  const handleCopyAddress = () => {
    if (order?.shippingAddress) {
      navigator.clipboard.writeText(formatAddressString(order.shippingAddress));
      setCopiedAddress(true);
      showToast('Address copied to clipboard');
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyTracking = () => {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      setCopiedTracking(true);
      showToast('Tracking ID copied');
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };

  const handleCopyPhone = () => {
    if (order?.customerMobile) {
      navigator.clipboard.writeText(order.customerMobile);
      setCopiedPhone(true);
      showToast('Mobile number copied');
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!order) return;
    const num = order.customerWhatsapp || order.customerMobile;
    if (!num) {
      showToast("No phone number available for WhatsApp", 'error');
      return;
    }

    const message = `Hello ${order.customerName},

Your order from Asmita Gruh Udhyog has been shipped.

Order ID:
${order.orderId}

Courier:
${order.courierCompany || courier || 'N/A'}

Tracking ID:
${order.trackingId || trackingId || 'N/A'}

Thank you for shopping with Asmita Gruh Udhyog.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${num}?text=${encoded}`, '_blank');
  };

  // Printing utilities
  const handlePrint = (ref: React.RefObject<HTMLDivElement | null>, title: string) => {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
              th { background: #f4f4f4; }
              .header { border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 20px; }
              .flex-between { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
              @page { margin: 10mm; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!order) return <div className="p-12 text-center text-red-500 font-bold">Order not found</div>;

  const currentStatusIndex = ORDER_STATUS_STEPS.indexOf(orderStatus);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/orders')} className="px-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Order {order.orderId}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                orderStatus === 'Delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                orderStatus === 'Shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                orderStatus === 'Confirmed' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
                {orderStatus}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Invoice: {order.invoiceNumber || 'N/A'} | Created: {new Date(order.orderDate?.seconds ? order.orderDate.seconds * 1000 : order.orderDate).toLocaleString()}</p>
          </div>
        </div>

        {/* Action Printable Buttons */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => handlePrint(invoiceRef, `Invoice_${order.orderId}`)}>
            <Printer className="w-4 h-4 mr-1.5" /> A4 Invoice
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrint(packingSlipRef, `PackingSlip_${order.orderId}`)}>
            <Package className="w-4 h-4 mr-1.5" /> Packing Slip
          </Button>
          <Button variant="outline" size="sm" onClick={() => handlePrint(labelRef, `ShippingLabel_${order.orderId}`)}>
            <TagIcon className="w-4 h-4 mr-1.5" /> 4x6 Label
          </Button>
        </div>
      </div>

      {/* Main Command Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Order Items & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order Timeline Visual Stepper */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Order Timeline & Status Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center relative py-6">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 -translate-y-1/2"></div>
                {ORDER_STATUS_STEPS.map((st, i) => {
                  const isPassed = i <= currentStatusIndex;
                  return (
                    <div key={st} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                        isPassed ? 'bg-primary border-primary text-white scale-110 shadow' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}>
                        {isPassed ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      <span className={`mt-2 text-[11px] font-semibold text-center max-w-[70px] ${isPassed ? 'text-primary' : 'text-gray-400'}`}>
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Product Items Table with Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ordered Items ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-center">Weight</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 object-cover rounded border shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 shrink-0">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{item.productName}</p>
                              {item.fragrance && <p className="text-xs text-gray-500">Fragrance: {item.fragrance}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-medium">{item.weight ? `${item.weight}g` : 'N/A'}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{item.price}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary">₹{item.quantity * item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="mt-4 flex justify-end">
                <div className="w-72 space-y-2 text-sm bg-gray-50 dark:bg-slate-800/60 p-4 rounded-lg border">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">₹{order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping Charge</span>
                    <span className="font-semibold">+ ₹{order.shippingCharge?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-semibold text-emerald-600">- ₹{order.discount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-black text-lg pt-2 border-t dark:border-gray-700">
                    <span>Grand Total</span>
                    <span className="text-primary">₹{order.totalAmount?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Verification Card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Payment & Verification
                </CardTitle>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  order.paymentStatus === 'Payment Verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                  'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="font-bold text-gray-900 dark:text-white">{order.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transaction ID</p>
                  <p className="font-bold text-gray-900 dark:text-white">{order.upiTransactionId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Verification Action</p>
                  {order.paymentStatus !== 'Payment Verified' ? (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleVerifyPayment} disabled={verifyingPayment}>
                      {verifyingPayment && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Verify Payment & Confirm Order
                    </Button>
                  ) : (
                    <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Verified & Stock Reduced
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Screenshot Preview */}
              {order.paymentScreenshotUrl && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-medium text-gray-500 mb-2">Payment Screenshot Proof:</p>
                  <div className="relative group w-48 h-32 border rounded-lg overflow-hidden cursor-pointer" onClick={() => setShowScreenshotModal(true)}>
                    <img src={order.paymentScreenshotUrl} alt="Payment Proof" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold gap-1">
                      <ZoomIn className="w-4 h-4" /> Click to Zoom
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Customer Info, Shipping & WhatsApp Action */}
        <div className="space-y-6">
          
          {/* BIG GREEN SEND WHATSAPP BUTTON CARD */}
          <Card className="border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-4 space-y-3">
              <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-base shadow-lg flex items-center justify-center gap-2" onClick={handleSendWhatsApp}>
                <Send className="w-5 h-5" />
                SEND WHATSAPP UPDATE
              </Button>
              <p className="text-[11px] text-center text-emerald-800 dark:text-emerald-400">
                Launches WhatsApp Web/App pre-filled with Order ID, Courier, & Tracking ID text.
              </p>
            </CardContent>
          </Card>

          {/* Shipping & Parcel Management Entry */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" /> Shipping & Parcel Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Courier Partner</label>
                <select 
                  className="w-full h-10 px-3 border rounded-md dark:bg-slate-900 dark:border-gray-700 text-sm font-medium" 
                  value={courier} 
                  onChange={(e) => setCourier(e.target.value)}
                >
                  {COURIER_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold">Tracking ID</label>
                  {trackingId && (
                    <button onClick={handleCopyTracking} className="text-xs text-primary flex items-center hover:underline">
                      {copiedTracking ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedTracking ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="e.g. AWB123456789" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Order Status</label>
                <select 
                  className="w-full h-10 px-3 border rounded-md dark:bg-slate-900 dark:border-gray-700 text-sm font-medium" 
                  value={orderStatus} 
                  onChange={(e) => setOrderStatus(e.target.value)}
                >
                  {ORDER_STATUS_STEPS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Shipping Status</label>
                <select 
                  className="w-full h-10 px-3 border rounded-md dark:bg-slate-900 dark:border-gray-700 text-sm font-medium" 
                  value={shippingStatus} 
                  onChange={(e) => setShippingStatus(e.target.value)}
                >
                  {SHIPPING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <Button className="w-full font-bold" onClick={handleSaveShippingDetails} disabled={savingShipping}>
                {savingShipping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Save Shipping Details
              </Button>

              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button variant="outline" className="w-full text-xs font-semibold text-blue-600">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Track Parcel Page
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Customer Master Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-600" /> Customer Details
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopyAddress} title="Copy Address">
                  {copiedAddress ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-bold text-base text-gray-900 dark:text-white">{order.customerName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <a href={`tel:${order.customerMobile}`} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {order.customerMobile}
                  </a>
                  <button onClick={handleCopyPhone} className="text-gray-400 hover:text-primary">
                    {copiedPhone ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <p className="font-bold text-gray-500 uppercase">Shipping Address</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{formatAddressString(order.shippingAddress)}</p>
              </div>

              {order.orderNotes && (
                <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
                  <strong className="font-bold">Order Note:</strong> {order.orderNotes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Proof Screenshot Modal Lightbox */}
      {showScreenshotModal && order.paymentScreenshotUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowScreenshotModal(false)}>
          <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-lg overflow-hidden p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-lg">Payment Proof Screenshot</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScreenshotModal(false)}>Close</Button>
            </div>
            <img src={order.paymentScreenshotUrl} alt="Full Proof" className="max-h-[70vh] w-full object-contain mx-auto" />
          </div>
        </div>
      )}

      {/* HIDDEN PRINT TEMPLATES */}
      <div className="hidden">
        {/* A4 Tax Invoice Template */}
        <div ref={invoiceRef}>
          <div className="header flex-between">
            <div>
              <h1 style={{margin:0, fontSize: '24px', color: '#15803d'}}>{storeSettings?.businessName || 'Asmita Gruh Udhyog'}</h1>
              <p style={{margin:0, fontSize: '12px'}}>{storeSettings?.businessAddress || '123 Main Street, Industrial Area'}</p>
              <p style={{margin:0, fontSize: '12px'}}>{storeSettings?.city}, {storeSettings?.state} - {storeSettings?.pinCode}</p>
              <p style={{margin:0, fontSize: '12px'}}>Phone: {storeSettings?.phone} | GST: {storeSettings?.gstNumber || 'N/A'}</p>
            </div>
            <div style={{textAlign: 'right'}}>
              <h2 style={{margin:0, fontSize: '20px', color: '#555'}}>TAX INVOICE</h2>
              <p style={{margin:0, fontSize: '14px'}} className="bold">Invoice #: {order.invoiceNumber || 'INV-001'}</p>
              <p style={{margin:0, fontSize: '12px'}}>Order #: {order.orderId}</p>
              <p style={{margin:0, fontSize: '12px'}}>Date: {new Date(order.orderDate?.seconds ? order.orderDate.seconds * 1000 : order.orderDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex-between" style={{marginBottom: '20px'}}>
            <div style={{width: '48%'}}>
              <p style={{margin: '0 0 5px 0', fontSize: '11px', textTransform: 'uppercase'}} className="bold">BILL TO / SHIP TO:</p>
              <p style={{margin:0}} className="bold">{order.customerName}</p>
              <p style={{margin:0, fontSize: '12px'}}>{formatAddressString(order.shippingAddress)}</p>
              <p style={{margin:0, fontSize: '12px'}}>Mobile: {order.customerMobile}</p>
            </div>
            <div style={{width: '48%'}}>
              <p style={{margin: '0 0 5px 0', fontSize: '11px', textTransform: 'uppercase'}} className="bold">PAYMENT & COURIER:</p>
              <p style={{margin:0, fontSize: '12px'}}>Payment Method: {order.paymentMethod}</p>
              <p style={{margin:0, fontSize: '12px'}}>Payment Status: {order.paymentStatus}</p>
              <p style={{margin:0, fontSize: '12px'}}>Courier: {order.courierCompany || courier || 'N/A'}</p>
              <p style={{margin:0, fontSize: '12px'}}>Tracking ID: {order.trackingId || trackingId || 'N/A'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style={{textAlign: 'center'}}>Fragrance</th>
                <th style={{textAlign: 'center'}}>Qty</th>
                <th style={{textAlign: 'right'}}>Price</th>
                <th style={{textAlign: 'right'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.productName}</td>
                  <td style={{textAlign: 'center'}}>{item.fragrance || '-'}</td>
                  <td style={{textAlign: 'center'}}>{item.quantity}</td>
                  <td style={{textAlign: 'right'}}>₹{item.price}</td>
                  <td style={{textAlign: 'right'}}>₹{item.quantity * item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{width: '40%', float: 'right', marginTop: '20px'}}>
            <div className="flex-between" style={{padding: '4px 0'}}>
              <span>Subtotal:</span> <span>₹{order.subtotal}</span>
            </div>
            <div className="flex-between" style={{padding: '4px 0'}}>
              <span>Shipping:</span> <span>+ ₹{order.shippingCharge}</span>
            </div>
            <div className="flex-between" style={{padding: '4px 0'}}>
              <span>Discount:</span> <span>- ₹{order.discount}</span>
            </div>
            <div className="flex-between bold" style={{padding: '8px 0', borderTop: '2px solid #222', fontSize: '16px'}}>
              <span>Grand Total:</span> <span>₹{order.totalAmount}</span>
            </div>
          </div>
          <div style={{clear: 'both', paddingTop: '40px', textAlign: 'center', fontSize: '12px', color: '#666'}}>
            Thank you for shopping with Asmita Gruh Udhyog!
          </div>
        </div>

        {/* Printable Packing Slip Template */}
        <div ref={packingSlipRef}>
          <div className="header flex-between">
            <div>
              <h2 style={{margin:0}}>{storeSettings?.businessName || 'Asmita Gruh Udhyog'}</h2>
              <p style={{margin:0, fontSize: '14px'}} className="bold">PACKING SLIP</p>
            </div>
            <div style={{textAlign: 'right'}}>
              <p style={{margin:0}} className="bold">Order ID: {order.orderId}</p>
              <p style={{margin:0, fontSize: '12px'}}>Courier: {order.courierCompany || courier || 'N/A'}</p>
              <p style={{margin:0, fontSize: '12px'}}>Tracking: {order.trackingId || trackingId || 'N/A'}</p>
            </div>
          </div>

          <div style={{marginBottom: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '4px'}}>
            <p style={{margin:0}} className="bold">SHIP TO:</p>
            <p style={{margin:0}} className="bold">{order.customerName}</p>
            <p style={{margin:0, fontSize: '13px'}}>{formatAddressString(order.shippingAddress)}</p>
            <p style={{margin:0, fontSize: '13px'}}>Phone: {order.customerMobile}</p>
          </div>

          <h3>PACKING CHECKLIST</h3>
          <table>
            <thead>
              <tr>
                <th style={{width: '30px'}}>✔</th>
                <th>Item Name</th>
                <th>Fragrance</th>
                <th style={{textAlign: 'center'}}>Weight</th>
                <th style={{textAlign: 'center'}}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{textAlign: 'center'}}>[ ]</td>
                  <td className="bold">{item.productName}</td>
                  <td>{item.fragrance || '-'}</td>
                  <td style={{textAlign: 'center'}}>{item.weight ? `${item.weight}g` : '-'}</td>
                  <td style={{textAlign: 'center'}} className="bold">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Printable 4x6 Shipping Label Template */}
        <div ref={labelRef}>
          <div style={{width: '4in', height: '6in', border: '2px solid #000', padding: '15px', boxSizing: 'border-box'}}>
            <div style={{textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '10px'}}>
              <h2 style={{margin:0, fontSize: '18px'}}>{storeSettings?.businessName || 'ASMITA GRUH UDHYOG'}</h2>
              <p style={{margin:0, fontSize: '10px'}}>PREPAID SHIPPING PARCEL</p>
            </div>

            <div style={{fontSize: '10px', marginBottom: '10px', borderBottom: '1px dashed #ccc', paddingBottom: '5px'}}>
              <strong>FROM:</strong> {storeSettings?.businessName}, {storeSettings?.businessAddress}, {storeSettings?.city}, {storeSettings?.state} - {storeSettings?.pinCode}
            </div>

            <div style={{border: '2px solid #000', padding: '10px', borderRadius: '6px', marginBottom: '10px'}}>
              <p style={{margin: '0 0 4px 0', fontSize: '11px'}} className="bold">SHIP TO:</p>
              <h3 style={{margin: '0 0 4px 0', fontSize: '16px'}}>{order.customerName}</h3>
              <p style={{margin: '0 0 4px 0', fontSize: '13px', lineHeight: '1.3'}}>{formatAddressString(order.shippingAddress)}</p>
              <p style={{margin:0, fontSize: '14px'}} className="bold">MOB: {order.customerMobile}</p>
            </div>

            <div style={{fontSize: '11px', borderTop: '1px solid #000', paddingTop: '8px'}}>
              <p style={{margin:0}}><strong>Order ID:</strong> {order.orderId}</p>
              <p style={{margin:0}}><strong>Courier:</strong> {order.courierCompany || courier || 'N/A'}</p>
              <p style={{margin:0}}><strong>Tracking ID:</strong> {order.trackingId || trackingId || 'N/A'}</p>
            </div>

            {/* SVG Barcode Visual Representation */}
            <div style={{marginTop: '15px', textAlign: 'center'}}>
              <svg width="220" height="45" viewBox="0 0 220 45">
                <rect x="10" y="5" width="4" height="30" fill="#000"/>
                <rect x="18" y="5" width="2" height="30" fill="#000"/>
                <rect x="24" y="5" width="6" height="30" fill="#000"/>
                <rect x="34" y="5" width="2" height="30" fill="#000"/>
                <rect x="40" y="5" width="8" height="30" fill="#000"/>
                <rect x="52" y="5" width="3" height="30" fill="#000"/>
                <rect x="60" y="5" width="5" height="30" fill="#000"/>
                <rect x="70" y="5" width="2" height="30" fill="#000"/>
                <rect x="76" y="5" width="7" height="30" fill="#000"/>
                <rect x="88" y="5" width="4" height="30" fill="#000"/>
                <rect x="96" y="5" width="2" height="30" fill="#000"/>
                <rect x="102" y="5" width="8" height="30" fill="#000"/>
                <rect x="114" y="5" width="3" height="30" fill="#000"/>
                <rect x="122" y="5" width="6" height="30" fill="#000"/>
                <rect x="132" y="5" width="2" height="30" fill="#000"/>
                <rect x="138" y="5" width="5" height="30" fill="#000"/>
                <rect x="148" y="5" width="4" height="30" fill="#000"/>
                <rect x="156" y="5" width="8" height="30" fill="#000"/>
                <rect x="168" y="5" width="2" height="30" fill="#000"/>
                <rect x="174" y="5" width="6" height="30" fill="#000"/>
                <rect x="184" y="5" width="3" height="30" fill="#000"/>
                <text x="110" y="42" fontSize="10" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                  {order.trackingId || trackingId || order.orderId}
                </text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function TagIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
      <path d="M7 7h.01"/>
    </svg>
  );
}
