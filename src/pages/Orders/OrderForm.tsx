import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, IndianRupee, Search, UploadCloud } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument, getDocuments } from '../../services/db';
import type { Customer, Product, Address } from '../../types';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0),
});

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  addressId: z.string().min(1, 'Address is required'),
  items: z.array(orderItemSchema).min(1, 'At least one product is required'),
  shippingCharges: z.number().min(0, 'Shipping cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative'),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  upiTransactionId: z.string().optional(),
  paymentScreenshotUrl: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export const OrderForm: React.FC = () => {
  const navigate = useNavigate();
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Workflow States
  const [searchMobile, setSearchMobile] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [customerAddresses, setCustomerAddresses] = useState<Address[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{ productId: '', quantity: 1, unitPrice: 0 }],
      shippingCharges: 50,
      discount: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'Verified'
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch values to auto-calculate totals
  const watchItems = watch("items");
  const shippingCharges = watch("shippingCharges") || 0;
  const discount = watch("discount") || 0;

  const subtotal = watchItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const grandTotal = subtotal + shippingCharges - discount;

  useEffect(() => {
    const fetchBaseData = async () => {
      const custData = await getDocuments('customers');
      const prodData = await getDocuments('products');
      setAllCustomers(custData as Customer[]);
      setProducts(prodData as Product[]);
    };
    fetchBaseData();
  }, []);

  const searchCustomer = async () => {
    if (!searchMobile) return;
    setIsSearching(true);
    const customer = allCustomers.find(c => c.mobileNumber.includes(searchMobile) || (c.whatsappNumber && c.whatsappNumber.includes(searchMobile)));
    
    if (customer) {
      setFoundCustomer(customer);
      setValue('customerId', customer.id!);
      
      // Fetch addresses for this customer
      const allAddresses = await getDocuments('addresses') as Address[];
      const cAddrs = allAddresses.filter(a => a.customerId === customer.id);
      setCustomerAddresses(cAddrs);
      if (cAddrs.length > 0) {
        setValue('addressId', cAddrs[0].id!);
      }
    } else {
      setFoundCustomer(null);
      setCustomerAddresses([]);
      alert("Customer not found. Please add them in the Customers section first.");
    }
    setIsSearching(false);
  };

  const generateOrderId = async () => {
    const year = new Date().getFullYear();
    const prefix = `AG${year}`;
    
    const q = query(collection(db, 'orders'), orderBy('orderId', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    
    let nextNum = 1;
    if (!snapshot.empty) {
      const lastId = snapshot.docs[0].data().orderId as string;
      if (lastId.startsWith(prefix)) {
        const lastNum = parseInt(lastId.substring(6));
        nextNum = lastNum + 1;
      }
    }
    
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  };

  // Utility to compress image to base64 so it fits in Firestore doc
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // compress heavily to fit in firestore (0.5 quality jpeg)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        setValue('paymentScreenshotUrl', dataUrl);
      };
    };
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    try {
      const orderId = await generateOrderId();
      
      const fullOrder = {
        ...data,
        orderId,
        orderDate: new Date(),
        subtotal,
        totalAmount: grandTotal,
        orderStatus: 'Pending',
      };

      await addDocument('orders', fullOrder);
      navigate('/orders');
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setValue(`items.${index}.unitPrice`, product.price);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Order</h1>
        <Button variant="outline" onClick={() => navigate('/orders')}>Cancel</Button>
      </div>

      {/* Step 1: Customer Search */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input 
              placeholder="Search by Mobile Number" 
              value={searchMobile} 
              onChange={(e) => setSearchMobile(e.target.value)} 
              className="max-w-xs"
              onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
            />
            <Button onClick={searchCustomer} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Search
            </Button>
          </div>

          {foundCustomer && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
              <div>
                <h3 className="font-bold text-emerald-800 dark:text-emerald-400">{foundCustomer.name}</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-500">{foundCustomer.mobileNumber}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFoundCustomer(null)}>Change</Button>
            </div>
          )}
          {errors.customerId && <p className="text-xs text-red-500 mt-2">{errors.customerId.message}</p>}
        </CardContent>
      </Card>

      {/* Step 2 & Beyond: Only visible if customer is selected */}
      {foundCustomer && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle>2. Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              {customerAddresses.length === 0 ? (
                <div className="text-amber-600 dark:text-amber-400 p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                  No saved addresses found. Please edit the customer to add an address first.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerAddresses.map((addr) => (
                    <label key={addr.id} className="cursor-pointer border dark:border-gray-700 p-4 rounded-lg flex gap-3 items-start hover:bg-gray-50 dark:hover:bg-slate-800/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                      <input 
                        type="radio" 
                        value={addr.id} 
                        {...register('addressId')} 
                        className="mt-1"
                      />
                      <div className="text-sm">
                        <p className="font-semibold mb-1">{addr.houseNo}, {addr.building}</p>
                        <p className="text-gray-600 dark:text-gray-400">{addr.street}, {addr.area}</p>
                        <p className="text-gray-600 dark:text-gray-400">{addr.city}, {addr.state} - {addr.pinCode}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {errors.addressId && <p className="text-xs text-red-500 mt-2">{errors.addressId.message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>3. Products</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1, unitPrice: 0 })}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-4 items-end p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex-1 space-y-2 w-full">
                    <label className="text-sm font-medium">Product</label>
                    <select 
                      className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700"
                      {...register(`items.${index}.productId`)}
                      onChange={(e) => {
                        register(`items.${index}.productId`).onChange(e);
                        handleProductSelect(index, e.target.value);
                      }}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full sm:w-24 space-y-2">
                    <label className="text-sm font-medium">Price (₹)</label>
                    <Input type="number" readOnly className="bg-gray-100 dark:bg-slate-800" {...register(`items.${index}.unitPrice`, { valueAsNumber: true })} />
                  </div>
                  
                  <div className="w-full sm:w-24 space-y-2">
                    <label className="text-sm font-medium">Qty</label>
                    <Input type="number" min="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                  </div>
                  
                  <div className="w-full sm:w-32 space-y-2">
                    <label className="text-sm font-medium">Total</label>
                    <div className="h-10 flex items-center px-3 border rounded-md bg-gray-100 dark:bg-slate-800 dark:border-gray-700 font-medium">
                      ₹{(watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0)}
                    </div>
                  </div>

                  <Button type="button" variant="ghost" className="h-10 px-3 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>4. Payment & Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <select className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700" {...register('paymentMethod')}>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Status</label>
                  <select className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700" {...register('paymentStatus')}>
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">UPI Transaction ID</label>
                  <Input placeholder="e.g. 301234567890" {...register('upiTransactionId')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Screenshot</label>
                  <div className="border-2 border-dashed dark:border-gray-700 rounded-lg p-4 text-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="screenshot" 
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <label htmlFor="screenshot" className="cursor-pointer flex flex-col items-center text-sm text-gray-500 hover:text-primary">
                      <UploadCloud className="w-8 h-8 mb-2" />
                      <span>{watch('paymentScreenshotUrl') ? 'Screenshot Uploaded (Click to change)' : 'Click to Upload Screenshot'}</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">₹{subtotal}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Shipping Charge</span>
                  <div className="w-24">
                    <Input type="number" className="h-8 text-right" {...register('shippingCharges', { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Discount</span>
                  <div className="w-24">
                    <Input type="number" className="h-8 text-right" {...register('discount', { valueAsNumber: true })} />
                  </div>
                </div>
                <div className="border-t dark:border-gray-700 pt-4 mt-2 flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-xl font-bold text-primary flex items-center">
                    <IndianRupee className="w-5 h-5 mr-1" />
                    {grandTotal}
                  </span>
                </div>

                <Button type="submit" className="w-full mt-4" size="lg" disabled={isSubmitting || !foundCustomer || customerAddresses.length === 0}>
                  {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Confirm Order & Generate ID
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
};
