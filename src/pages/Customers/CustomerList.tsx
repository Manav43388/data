import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, History } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Customer } from '../../types';
import { getDocuments } from '../../services/db';

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getDocuments('customers');
        setCustomers(data as Customer[]);
      } catch (error) {
        console.error("Error fetching customers:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

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
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input className="pl-9" placeholder="Search by name or mobile..." />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-400 border-b dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Loading customers...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No customers found.</td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {customer.name}
                    </td>
                    <td className="px-4 py-3">
                      <div>{customer.mobileNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-500 dark:text-gray-400">{customer.address || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Addresses">
                          <MapPin className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Order History">
                          <History className="h-4 w-4 text-purple-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                          <Edit className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
