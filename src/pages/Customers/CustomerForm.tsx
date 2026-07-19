import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument, getDocuments } from '../../services/db';

const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobileNumber: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Valid mobile number is required'),
  whatsappNumber: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  gstNumber: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export const CustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      // Check for duplicates
      const existingCustomers = await getDocuments('customers');
      const isDuplicate = existingCustomers.some((c: any) => c.mobileNumber === data.mobileNumber);
      
      if (isDuplicate) {
        setErrorMsg('A customer with this mobile number already exists!');
        setIsSubmitting(false);
        return;
      }

      await addDocument('customers', data);
      navigate('/customers');
    } catch (error) {
      console.error("Error adding customer:", error);
      setErrorMsg('Failed to add customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Customer</h1>
        <Button variant="outline" onClick={() => navigate('/customers')}>Cancel</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
                <Input placeholder="e.g. Rahul Sharma" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number</label>
                <Input placeholder="e.g. 9876543210" {...register('mobileNumber')} />
                {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Number</label>
                <Input placeholder="e.g. 9876543210" {...register('whatsappNumber')} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address (Optional)</label>
                <Input type="email" placeholder="e.g. rahul@example.com" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">GST Number (Optional)</label>
                <Input placeholder="e.g. 22AAAAA0000A1Z5" {...register('gstNumber')} />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Customer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
