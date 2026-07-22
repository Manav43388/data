import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument, getDocuments } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import type { Customer } from '../../types';

const customerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  mobileNumber: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Valid mobile number is required'),
  whatsappNumber: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Valid whatsapp number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  customerType: z.string(),
  notes: z.string().optional(),
  
  // Shipping Address
  houseNo: z.string().min(1, 'House/Flat No is required'),
  building: z.string().min(1, 'Building/Society is required'),
  street: z.string().min(1, 'Street/Road is required'),
  area: z.string().min(1, 'Area/Locality is required'),
  landmark: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  pinCode: z.string().min(1, 'PIN Code is required'),
  country: z.string().min(1, 'Country is required'),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export const CustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateCustomer, setDuplicateCustomer] = useState<Customer | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      country: 'India',
      customerType: 'Regular',
    }
  });

  const mobileNumber = watch('mobileNumber');

  // Auto-sync WhatsApp number with Mobile number if empty
  React.useEffect(() => {
    if (mobileNumber && mobileNumber.length >= 10) {
      const currentWA = watch('whatsappNumber');
      if (!currentWA) {
        setValue('whatsappNumber', mobileNumber);
      }
    }
  }, [mobileNumber, setValue, watch]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setDuplicateCustomer(null);
    try {
      // 1. Check duplicate mobile number
      const existingCustomers = await getDocuments('customers') as Customer[];
      const duplicate = existingCustomers.find((c) => c.mobileNumber === data.mobileNumber);
      
      if (duplicate) {
        setDuplicateCustomer(duplicate);
        showToast('Customer already exists with this mobile number!', 'error');
        setIsSubmitting(false);
        return;
      }

      // 2. Save Customer with embedded complete address
      const customerId = await addDocument('customers', data);
      
      showToast('Customer saved successfully!');
      navigate(`/customers/${customerId}`);
    } catch (error) {
      console.error("Error adding customer:", error);
      showToast('Failed to add customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Customer</h1>
          <p className="text-sm text-gray-500">Save complete customer master details and shipping address.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/customers')}>Cancel</Button>
      </div>

      {duplicateCustomer && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-900 dark:text-amber-300">Customer Already Exists!</p>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                "{duplicateCustomer.name}" is already registered with mobile number {duplicateCustomer.mobileNumber}.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate(`/customers/${duplicateCustomer.id}`)}>
            Open Existing Customer <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>1. Contact Information & Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name *</label>
                <Input placeholder="e.g. Rahul Sharma" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mobile Number *</label>
                <Input placeholder="e.g. 9876543210" {...register('mobileNumber')} />
                {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp Number *</label>
                <Input placeholder="e.g. 9876543210" {...register('whatsappNumber')} />
                {errors.whatsappNumber && <p className="text-xs text-red-500">{errors.whatsappNumber.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Tag / Category</label>
                <select className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700" {...register('customerType')}>
                  <option value="Regular">Regular Customer</option>
                  <option value="Wholesale">Wholesale Customer</option>
                  <option value="VIP">VIP Customer</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address (Optional)</label>
                <Input placeholder="e.g. rahul@example.com" type="email" {...register('email')} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Notes (Optional)</label>
                <Input placeholder="e.g. Prefers Delhivery courier, prefers morning delivery" {...register('notes')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle>2. Complete Shipping Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">House/Flat No. *</label>
                <Input placeholder="e.g. Flat 101" {...register('houseNo')} />
                {errors.houseNo && <p className="text-xs text-red-500">{errors.houseNo.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Building/Society *</label>
                <Input placeholder="e.g. Gokuldham Society" {...register('building')} />
                {errors.building && <p className="text-xs text-red-500">{errors.building.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Street/Road *</label>
                <Input placeholder="e.g. MG Road" {...register('street')} />
                {errors.street && <p className="text-xs text-red-500">{errors.street.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Area/Locality *</label>
                <Input placeholder="e.g. Andheri East" {...register('area')} />
                {errors.area && <p className="text-xs text-red-500">{errors.area.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Landmark (Optional)</label>
                <Input placeholder="e.g. Near Metro Station" {...register('landmark')} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">City *</label>
                <Input placeholder="e.g. Mumbai" {...register('city')} />
                {errors.city && <p className="text-xs text-red-500">{errors.city.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">District *</label>
                <Input placeholder="e.g. Mumbai Suburban" {...register('district')} />
                {errors.district && <p className="text-xs text-red-500">{errors.district.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">State *</label>
                <Input placeholder="e.g. Maharashtra" {...register('state')} />
                {errors.state && <p className="text-xs text-red-500">{errors.state.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">PIN Code *</label>
                <Input placeholder="e.g. 400069" {...register('pinCode')} />
                {errors.pinCode && <p className="text-xs text-red-500">{errors.pinCode.message}</p>}
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Save Customer Master Record
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
