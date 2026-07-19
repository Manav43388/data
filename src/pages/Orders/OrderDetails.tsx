import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
  ArrowLeft, Copy, Printer, Check, 
  Truck, CheckCircle, Package, Send, Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { getDocuments, updateDocument } from '../../services/db';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { Order, Customer, Address } from '../../types';

export const OrderDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Shipping states
  const [courier, setCourier] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [status, setStatus] = useState('');
  const [savingShipping, setSavingShipping] = useState(false);
  
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        const orderRef = doc(db, 'orders', id);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const ord = { id: orderSnap.id, ...orderSnap.data() } as Order;
          setOrder(ord);
          setCourier(ord.courierCompany || '');
          setTrackingId(ord.trackingId || '');
          setStatus(ord.orderStatus || 'Pending');
          
          const custRef = doc(db, 'customers', ord.customerId);
          const custSnap = await getDoc(custRef);
          if (custSnap.exists()) {
            setCustomer({ id: custSnap.id, ...custSnap.data() } as Customer);
          }

          const addrRef = doc(db, 'addresses', ord.addressId);
          const addrSnap = await getDoc(addrRef);
          if (addrSnap.exists()) {
            setAddress({ id: addrSnap.id, ...addrSnap.data() } as Address);
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const saveShippingDetails = async () => {
    if (!id) return;
    setSavingShipping(true);
    try {
      await updateDocument('orders', id, {
        courierCompany: courier,
        trackingId: trackingId,
        orderStatus: status,
        shippingDate: new Date(),
      });
      alert('Shipping details updated!');
      setOrder(prev => prev ? { ...prev, courierCompany: courier, trackingId, orderStatus: status as any } : null);
    } catch (e) {
      console.error(e);
      alert('Failed to save shipping details');
    } finally {
      setSavingShipping(false);
    }
  };

  const formatAddress = (addr: Address) => {
    return `${addr.houseNo}, ${addr.building}, ${addr.street}, ${addr.area}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city}, ${addr.district}, ${addr.state} - ${addr.pinCode}`;
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(formatAddress(address));
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleCopyTracking = () => {
    if (trackingId) {
      navigator.clipboard.writeText(trackingId);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2000);
    }
  };

  const handleSendWhatsApp = () => {
    if (!customer || !order) return;
    const number = customer.whatsappNumber || customer.mobileNumber;
    if (!number) {
      alert("No WhatsApp number available.");
      return;
    }
    
    // Format message
    const message = `Hello ${customer.name},

Your order has been shipped.

Order ID: ${order.orderId}
Courier: ${order.courierCompany || courier || 'N/A'}
Tracking ID: ${order.trackingId || trackingId || 'N/A'}

Track your parcel here:
[Insert Tracking Link]

Thank you for shopping with Asmita Gruh Udhyog.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${number}?text=${encoded}`, '_blank');
  };

  // For Printing
  const invoiceRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  const printLabel = () => {
    const printContent = labelRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html><head>
          <title>Print Label</title>
          <style>
            @page { size: 4in 6in; margin: 0; }
            body { font-family: sans-serif; padding: 0.25in; margin: 0; box-sizing: border-box; width: 4in; height: 6in; }
            .header { font-size: 18px; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; text-align: center; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #555; }
            .address-box { border: 1px solid #ccc; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 16px; line-height: 1.5; }
            .footer { margin-top: 30px; font-size: 12px; text-align: center; color: #666; border-top: 1px dashed #ccc; padding-top: 10px;}
            .bold { font-weight: bold; font-size: 18px;}
          </style>
        </head><body>${printContent}</body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const printInvoice = () => {
    const printContent = invoiceRef.current?.innerHTML;
    if (!printContent) return;
    const printWindow = window.open('', '', 'width=800,height=1000');
    if (printWindow) {
      printWindow.document.write(`
        <html><head>
          <title>Invoice - ${order?.orderId}</title>
          <style>
            @page { size: A4; margin: 0.5in; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #333; line-height: 1.6; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 28px; font-weight: bold; color: #2563eb; margin:0;}
            .invoice-title { font-size: 24px; color: #666; margin:0;}
            .details-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .details-col { width: 48%; }
            .box-title { font-size: 12px; text-transform: uppercase; font-weight: bold; color: #888; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f9fafb; padding: 12px; text-align: left; border-bottom: 2px solid #eee; font-size: 14px; color: #555; }
            td { padding: 12px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .totals { width: 50%; float: right; }
            .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;}
            .total-row.grand { font-size: 18px; font-weight: bold; border-bottom: none; border-top: 2px solid #333; margin-top: 5px; padding-top: 10px;}
            .clear { clear: both; }
          </style>
        </head><body>${printContent}</body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };


  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!order || !customer) return <div className="p-8 text-center text-red-500">Order not found</div>;

  const orderStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];
  const currentStatusIndex = orderStatuses.indexOf(status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/orders')} className="px-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order {order.orderId}</h1>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            {status}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printInvoice}>
            <Printer className="w-4 h-4 mr-2" /> Print Invoice
          </Button>
          <Button variant="outline" onClick={printLabel}>
            <Package className="w-4 h-4 mr-2" /> Print 4x6 Label
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center relative py-4">
                <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 -translate-y-1/2"></div>
                {orderStatuses.map((st, i) => (
                  <div key={st} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                      i <= currentStatusIndex ? 'bg-primary border-primary text-white' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-600 text-gray-400'
                    }`}>
                      {i <= currentStatusIndex ? <Check className="w-5 h-5" /> : i + 1}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${i <= currentStatusIndex ? 'text-primary' : 'text-gray-500'}`}>{st}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-4 py-3 font-medium">{item.productId}</td>
                        <td className="px-4 py-3 text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">₹{item.price || (item as any).unitPrice}</td>
                        <td className="px-4 py-3 text-right font-medium">₹{item.quantity * (item.price || (item as any).unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span>₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Shipping</span>
                    <span>+ ₹{order.shippingCharge || (order as any).shippingCharges}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-green-600">- ₹{order.discount}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-gray-700">
                    <span>Grand Total</span>
                    <span className="text-primary">₹{order.totalAmount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping & Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Status</label>
                <select 
                  className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {orderStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Courier Company</label>
                <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Delhivery" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Tracking ID</label>
                  {trackingId && (
                    <button onClick={handleCopyTracking} className="text-xs text-primary flex items-center hover:underline">
                      {copiedTracking ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedTracking ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} placeholder="e.g. AWB123456789" />
              </div>
              
              <Button className="w-full" onClick={saveShippingDetails} disabled={savingShipping}>
                {savingShipping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Save Shipping Details
              </Button>

              <Button variant="outline" className="w-full mt-2 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={handleSendWhatsApp}>
                <Send className="w-4 h-4 mr-2" /> Send WhatsApp Update
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Customer</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopyAddress} title="Copy Address">
                  {copiedAddress ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-bold text-lg">{customer.name}</p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{customer.mobileNumber}</p>
              
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold text-gray-500 text-xs uppercase mb-1">Shipping Address</p>
                {address ? (
                  <>
                    <p>{address.houseNo}, {address.building}</p>
                    <p>{address.street}, {address.area}</p>
                    {address.landmark && <p>Landmark: {address.landmark}</p>}
                    <p>{address.city}, {address.state} - {address.pinCode}</p>
                  </>
                ) : <p className="italic text-gray-400">No address loaded</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden Print Templates */}
      <div className="hidden">
        <div ref={labelRef}>
          <div className="header">
            ASMITA GRUH UDHYOG
          </div>
          <div className="section-title">SHIP TO:</div>
          <div className="address-box">
            <div className="bold">{customer?.name}</div>
            {address && (
              <>
                <div>{address.houseNo}, {address.building}</div>
                <div>{address.street}, {address.area}</div>
                {address.landmark && <div>Landmark: {address.landmark}</div>}
                <div>{address.city}, {address.district}</div>
                <div className="bold">{address.state} - {address.pinCode}</div>
                <div style={{marginTop: '10px', fontSize: '14px'}}>
                  Mobile: <span className="bold">{customer.mobileNumber}</span>
                </div>
              </>
            )}
          </div>
          <div className="footer">
            Order ID: {order.orderId} | Courier: {courier || 'N/A'}<br/>
            Tracking: {trackingId || 'N/A'}
          </div>
        </div>

        <div ref={invoiceRef}>
          <div className="invoice-header">
            <div>
              <div className="company-name">ASMITA GRUH UDHYOG</div>
              <div>123 Main Street, Industrial Area</div>
              <div>City, State - 123456</div>
              <div>Phone: +91 9876543210</div>
            </div>
            <div style={{textAlign: 'right'}}>
              <div className="invoice-title">INVOICE</div>
              <div style={{fontWeight: 'bold', fontSize: '16px'}}>Order #: {order.orderId}</div>
              <div>Date: {order.orderDate?.toDate ? order.orderDate.toDate().toLocaleDateString() : new Date(order.orderDate).toLocaleDateString()}</div>
              <div>Payment: {order.paymentMethod} ({order.paymentStatus})</div>
            </div>
          </div>
          
          <div className="details-row">
            <div className="details-col">
              <div className="box-title">BILL TO / SHIP TO:</div>
              <div style={{fontWeight: 'bold', fontSize: '16px'}}>{customer.name}</div>
              <div>{address?.houseNo}, {address?.building}</div>
              <div>{address?.street}, {address?.area}</div>
              <div>{address?.city}, {address?.state} - {address?.pinCode}</div>
              <div>Phone: {customer.mobileNumber}</div>
            </div>
            <div className="details-col">
              <div className="box-title">SHIPPING INFO:</div>
              <div>Courier: {courier || 'N/A'}</div>
              <div>Tracking ID: {trackingId || 'N/A'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style={{textAlign: 'center'}}>Qty</th>
                <th style={{textAlign: 'right'}}>Price</th>
                <th style={{textAlign: 'right'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td>{item.productId}</td>
                  <td style={{textAlign: 'center'}}>{item.quantity}</td>
                  <td style={{textAlign: 'right'}}>₹{item.price || (item as any).unitPrice}</td>
                  <td style={{textAlign: 'right'}}>₹{item.quantity * (item.price || (item as any).unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="totals">
            <div className="total-row">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            <div className="total-row">
              <span>Shipping</span>
              <span>₹{order.shippingCharge || (order as any).shippingCharges}</span>
            </div>
            <div className="total-row">
              <span>Discount</span>
              <span>-₹{order.discount}</span>
            </div>
            <div className="total-row grand">
              <span>Grand Total</span>
              <span>₹{order.totalAmount}</span>
            </div>
          </div>
          <div className="clear"></div>
          
          <div style={{marginTop: '50px', textAlign: 'center', color: '#888', fontSize: '14px'}}>
            Thank you for shopping with Asmita Gruh Udhyog!
          </div>
        </div>
      </div>
    </div>
  );
};
