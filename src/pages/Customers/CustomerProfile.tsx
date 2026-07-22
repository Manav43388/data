import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Phone, MessageCircle, Copy, Check, Plus, 
  ShoppingBag, IndianRupee, Calendar, MapPin, Eye, Loader2 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Customer, Order } from '../../types';
import { getDocuments } from '../../services/db';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useToast } from '../../contexts/ToastContext';

export const CustomerProfile: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!id) return;
      try {
        const custRef = doc(db, 'customers', id);
        const custSnap = await getDoc(custRef);
        if (custSnap.exists()) {
          setCustomer({ id: custSnap.id, ...custSnap.data() } as Customer);

          // Fetch orders for this customer
          const allOrders = await getDocuments('orders') as Order[];
          const custOrders = allOrders.filter(o => o.customerId === id);
          setOrders(custOrders);
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
        showToast('Error loading customer profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomerData();
  }, [id]);

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  if (!customer) return <div className="p-8 text-center text-red-500 font-medium">Customer not found</div>;

  // Format full address
  const fullAddress = `${customer.houseNo || ''}, ${customer.building || ''}, ${customer.street || ''}, ${customer.area || ''}${customer.landmark ? ', Landmark: ' + customer.landmark : ''}, ${customer.city || ''}, ${customer.district || ''}, ${customer.state || ''} - ${customer.pinCode || ''}`;

  // Metrics
  const totalOrdersCount = orders.length;
  const totalLifetimeSpend = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const avgOrderValue = totalOrdersCount > 0 ? (totalLifetimeSpend / totalOrdersCount) : 0;
  
  const sortedOrdersByDate = [...orders].sort((a, b) => {
    const timeA = a.orderDate?.seconds || new Date(a.orderDate).getTime() || 0;
    const timeB = b.orderDate?.seconds || new Date(b.orderDate).getTime() || 0;
    return timeA - timeB;
  });

  const latestOrderDate = sortedOrdersByDate.length > 0 ? sortedOrdersByDate[sortedOrdersByDate.length - 1].orderDate : null;

  const formatDateString = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    if (dateVal.toDate) return dateVal.toDate().toLocaleDateString();
    return new Date(dateVal).toLocaleDateString();
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddress(true);
    showToast('Address copied to clipboard');
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(customer.mobileNumber);
    setCopiedPhone(true);
    showToast('Mobile number copied');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const num = customer.whatsappNumber || customer.mobileNumber;
    window.open(`https://wa.me/${num}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/customers')} className="px-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
              {customer.customerType && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  customer.customerType === 'VIP' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                  customer.customerType === 'Wholesale' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                  'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300'
                }`}>
                  {customer.customerType}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Customer ID: {customer.id}</p>
          </div>
        </div>

        <Button size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}>
          <Plus className="w-5 h-5 mr-2" />
          Create New Order
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Lifetime Spend</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">₹{totalLifetimeSpend.toFixed(2)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Orders</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{totalOrdersCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Avg Order Value</p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">₹{avgOrderValue.toFixed(2)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center space-x-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Latest Order</p>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{formatDateString(latestOrderDate)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Info Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <a href={`tel:${customer.mobileNumber}`} className="flex-1">
                  <Button variant="outline" className="w-full text-sm">
                    <Phone className="w-4 h-4 mr-2 text-blue-600" /> Call
                  </Button>
                </a>
                <Button variant="outline" className="flex-1 text-sm border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={handleOpenWhatsApp}>
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </div>

              <div className="pt-2 border-t space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Mobile:</span>
                  <span className="font-semibold flex items-center gap-1">
                    {customer.mobileNumber}
                    <button onClick={handleCopyPhone} className="text-gray-400 hover:text-primary">
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">WhatsApp:</span>
                  <span className="font-semibold">{customer.whatsappNumber || customer.mobileNumber}</span>
                </div>
                {customer.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Email:</span>
                    <span className="font-semibold text-xs">{customer.email}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" /> Primary Address
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopyAddress} title="Copy Address">
                  {copiedAddress ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <p className="font-bold text-gray-900 dark:text-white">{customer.name}</p>
              <p>{customer.houseNo}, {customer.building}</p>
              <p>{customer.street}, {customer.area}</p>
              {customer.landmark && <p className="text-xs text-gray-500">Landmark: {customer.landmark}</p>}
              <p className="font-medium text-primary">{customer.city}, {customer.district}, {customer.state} - {customer.pinCode}</p>
              {customer.notes && (
                <div className="mt-3 p-2.5 bg-gray-50 dark:bg-slate-800 rounded border text-xs text-gray-600 dark:text-gray-400">
                  <span className="font-bold">Customer Notes:</span> {customer.notes}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order History ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No previous orders found for this customer.
                  <div className="mt-4">
                    <Button onClick={() => navigate(`/orders/new?customerId=${customer.id}`)}>
                      Create First Order
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Order Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((ord) => (
                        <tr key={ord.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3 font-bold text-primary">{ord.orderId}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDateString(ord.orderDate)}</td>
                          <td className="px-4 py-3 font-bold">₹{ord.totalAmount}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              ord.paymentStatus === 'Payment Verified' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30' :
                              'bg-amber-100 text-amber-800 dark:bg-amber-900/30'
                            }`}>
                              {ord.paymentStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30">
                              {ord.orderStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Order" onClick={() => navigate(`/orders/${ord.id}`)}>
                              <Eye className="w-4 h-4 text-gray-500" />
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
      </div>
    </div>
  );
};
