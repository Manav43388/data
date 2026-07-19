import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, History, Copy, Check, MessageCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Customer, Order, Address } from '../../types';
import { getDocuments, deleteDocument } from '../../services/db';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custData, ordData, addrData] = await Promise.all([
        getDocuments('customers'),
        getDocuments('orders'),
        getDocuments('addresses')
      ]);
      setCustomers(custData as Customer[]);
      setOrders(ordData as Order[]);
      setAddresses(addrData as Address[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteDocument('customers', id);
        // We probably should delete associated addresses, but leaving as is for simplicity
        fetchData();
      } catch (error) {
        console.error("Error deleting customer:", error);
      }
    }
  };

  const formatAddress = (addr: Address) => {
    return `${addr.houseNo}, ${addr.building}, ${addr.street}, ${addr.area}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city}, ${addr.district}, ${addr.state} - ${addr.pinCode}`;
  };

  const handleCopyAddress = (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const custAddresses = addresses.filter(a => a.customerId === customerId);
    if (custAddresses.length > 0) {
      const textToCopy = formatAddress(custAddresses[0]);
      navigator.clipboard.writeText(textToCopy);
      setCopiedId(customerId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || 
           c.mobileNumber.includes(q) || 
           (c.whatsappNumber && c.whatsappNumber.includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
        <Button className="w-full sm:w-auto" onClick={() => navigate('/customers/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>Customer Directory</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input 
                className="pl-9" 
                placeholder="Search by name, mobile, or WA..." 
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
                  <th className="px-4 py-3">Primary Address</th>
                  <th className="px-4 py-3">Metrics</th>
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
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No customers found.</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => {
                    const custOrders = orders.filter(o => o.customerId === customer.id);
                    const totalPurchased = custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
                    const custAddresses = addresses.filter(a => a.customerId === customer.id);
                    
                    return (
                      <tr key={customer.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                          {customer.notes && (
                            <span className="inline-flex mt-1 items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20">
                              {customer.notes}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 space-y-1">
                          <div className="flex items-center text-gray-700 dark:text-gray-300">
                            {customer.mobileNumber}
                          </div>
                          {customer.whatsappNumber && (
                            <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <MessageCircle className="w-3 h-3 mr-1" /> {customer.whatsappNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          {custAddresses.length > 0 ? (
                            <div className="flex items-start gap-2">
                              <p className="text-gray-500 dark:text-gray-400 text-xs truncate" title={formatAddress(custAddresses[0])}>
                                {formatAddress(custAddresses[0])}
                              </p>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={(e) => handleCopyAddress(customer.id!, e)} title="Copy Complete Address">
                                {copiedId === customer.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">No address saved</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs font-medium text-gray-900 dark:text-white">{custOrders.length} Orders</div>
                          <div className="text-xs text-gray-500">₹{totalPurchased.toFixed(2)}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Order History">
                              <History className="h-4 w-4 text-purple-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit (Coming Soon)">
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(customer.id!)} title="Delete">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
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
