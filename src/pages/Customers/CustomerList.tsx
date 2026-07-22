import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Trash2, RotateCcw, MessageCircle, Phone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Customer, Order } from '../../types';
import { getDocuments, getTrashDocuments, softDeleteDocument, restoreDocument } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    fetchData();
  }, [showTrash]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custData, ordData] = await Promise.all([
        showTrash ? getTrashDocuments('customers') : getDocuments('customers'),
        getDocuments('orders')
      ]);
      setCustomers(custData as Customer[]);
      setOrders(ordData as Order[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      showToast('Error loading customer list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (window.confirm(`Move customer "${name}" to Trash?`)) {
      try {
        await softDeleteDocument('customers', id);
        showToast(`Customer moved to trash`);
        fetchData();
      } catch (error) {
        showToast('Failed to delete customer', 'error');
      }
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      await restoreDocument('customers', id);
      showToast(`Customer "${name}" restored!`);
      fetchData();
    } catch (error) {
      showToast('Failed to restore customer', 'error');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || 
           c.mobileNumber.includes(q) || 
           (c.whatsappNumber && c.whatsappNumber.includes(q)) ||
           (c.city && c.city.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Directory</h1>
          <p className="text-sm text-gray-500">Master customer directory storing contact profiles and full shipping addresses.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowTrash(!showTrash)}>
            <Trash2 className="w-4 h-4 mr-2" />
            {showTrash ? 'View Active Directory' : 'View Trash'}
          </Button>
          {!showTrash && (
            <Button className="w-full sm:w-auto font-bold" onClick={() => navigate('/customers/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>{showTrash ? 'Trashed Customers' : 'All Customers'}</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input 
                className="pl-9" 
                placeholder="Search by name, mobile, WA, city..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-400 border-b dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Customer Details</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">City & State</th>
                  <th className="px-4 py-3">Lifetime Orders</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading customers...</td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {showTrash ? 'No trashed customers found.' : 'No customers found.'}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const custOrders = orders.filter(o => o.customerId === customer.id);
                    const totalPurchased = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

                    return (
                      <tr key={customer.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div 
                            className="font-bold text-gray-900 dark:text-white cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                          >
                            {customer.name}
                            {customer.customerType && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                customer.customerType === 'VIP' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30' :
                                customer.customerType === 'Wholesale' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' :
                                'bg-gray-100 text-gray-700 dark:bg-slate-800'
                              }`}>
                                {customer.customerType}
                              </span>
                            )}
                          </div>
                          {customer.notes && <p className="text-xs text-gray-500 italic mt-0.5">{customer.notes}</p>}
                        </td>
                        <td className="px-4 py-3 space-y-0.5 text-xs">
                          <div className="flex items-center text-gray-800 dark:text-gray-200 font-medium">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" /> {customer.mobileNumber}
                          </div>
                          {customer.whatsappNumber && (
                            <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                              <MessageCircle className="w-3 h-3 mr-1" /> {customer.whatsappNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{customer.city}, {customer.state}</div>
                          <div className="text-xs text-gray-500">PIN: {customer.pinCode}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-gray-900 dark:text-white">{custOrders.length} Orders</div>
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">₹{totalPurchased.toFixed(2)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {showTrash ? (
                            <Button variant="outline" size="sm" onClick={() => handleRestore(customer.id!, customer.name)}>
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                            </Button>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-8 px-2 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => navigate(`/orders/new?customerId=${customer.id}`)} title="New Order">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Order
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Profile" onClick={() => navigate(`/customers/${customer.id}`)}>
                                <Eye className="h-4 w-4 text-purple-500" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleSoftDelete(customer.id!, customer.name)} title="Delete">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
