import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument, getDocuments } from '../../services/db';

const customerFormSchema = z.object({
  // Customer Details
  name: z.string().min(1, 'Customer name is required'),
  mobileNumber: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Valid mobile number is required'),
  whatsappNumber: z.string().regex(/^[0-9+\s-]{10,15}$/, 'Valid whatsapp number is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
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
  country: z.string().default('India'),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export const CustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      country: 'India'
    }
  });

  const mobileNumber = watch('mobileNumber');

  // Auto-fill WhatsApp number with Mobile number if it's empty or matching previously
  useEffect(() => {
    if (mobileNumber && mobileNumber.length >= 10) {
      setValue('whatsappNumber', mobileNumber, { shouldValidate: true });
    }
  }, [mobileNumber, setValue]);

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

      // 1. Save Customer
      const customerData = {
        name: data.name,
        mobileNumber: data.mobileNumber,
        whatsappNumber: data.whatsappNumber,
        email: data.email || '',
        notes: data.notes || '',
      };
      const customerId = await addDocument('customers', customerData);

      // 2. Save Address
      const addressData = {
        customerId,
        houseNo: data.houseNo,
        building: data.building,
        street: data.street,
        area: data.area,
        landmark: data.landmark || '',
        city: data.city,
        district: data.district,
        state: data.state,
        pinCode: data.pinCode,
        country: data.country,
      };
      await addDocument('addresses', addressData);

      navigate('/customers');
    } catch (error) {
      console.error("Error adding customer:", error);
      setErrorMsg('Failed to add customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Customer</h1>
        <Button variant="outline" onClick={() => navigate('/customers')}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {errorMsg && (
          <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-md text-sm font-medium">
            {errorMsg}
          </div>
        )}

        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address (Optional)</label>
                <Input placeholder="e.g. rahul@example.com" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customer Notes (Optional)</label>
                <Input placeholder="e.g. Regular Customer, Wholesale" {...register('notes')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
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

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                <Input {...register('country')} />
                {errors.country && <p className="text-xs text-red-500">{errors.country.message}</p>}
              </div>
            </div>

            <div className="pt-8 flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Save Customer & Address
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
