import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, IndianRupee, Search, UploadCloud, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument, getDocuments, generateNextOrderId, generateNextInvoiceId, getStoreSettings } from '../../services/db';
import type { Customer, Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  productName: z.string(),
  fragrance: z.string().optional(),
  weight: z.number().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  price: z.number().min(0),
  imageUrl: z.string().optional(),
});

const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  items: z.array(orderItemSchema).min(1, 'At least one product is required'),
  shippingCharge: z.number().min(0, 'Shipping cannot be negative'),
  discount: z.number().min(0, 'Discount cannot be negative'),
  paymentMethod: z.string().min(1, 'Payment Method is required'),
  paymentStatus: z.enum(['Pending Payment', 'Payment Verified', 'Failed', 'Refunded']),
  upiTransactionId: z.string().optional(),
  paymentScreenshotUrl: z.string().optional(),
  orderNotes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export const OrderForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCustomerId = searchParams.get('customerId');
  const { showToast } = useToast();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Selected Customer Workflow
  const [searchMobile, setSearchMobile] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{ productId: '', productName: '', quantity: 1, price: 0 }],
      shippingCharge: 50,
      discount: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'Pending Payment',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch values for live calculations
  const watchItems = watch("items");
  const shippingCharge = watch("shippingCharge") || 0;
  const discount = watch("discount") || 0;

  const subtotal = watchItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
  const grandTotal = Math.max(0, subtotal + shippingCharge - discount);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [custData, prodData, storeSettings] = await Promise.all([
          getDocuments('customers'),
          getDocuments('products'),
          getStoreSettings()
        ]);
        const activeCusts = custData as Customer[];
        const activeProds = prodData as Product[];
        setAllCustomers(activeCusts);
        setProducts(activeProds);

        setValue('shippingCharge', storeSettings.defaultShippingCharge || 50);

        // Pre-select customer if passed in URL query
        if (preSelectedCustomerId) {
          const found = activeCusts.find(c => c.id === preSelectedCustomerId);
          if (found) {
            setSelectedCustomer(found);
            setValue('customerId', found.id!);
          }
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    fetchInitialData();
  }, [preSelectedCustomerId, setValue]);

  const handleCustomerSearch = () => {
    if (!searchMobile) return;
    setIsSearching(true);
    const found = allCustomers.find(c => 
      c.mobileNumber.includes(searchMobile) || 
      (c.whatsappNumber && c.whatsappNumber.includes(searchMobile)) ||
      c.name.toLowerCase().includes(searchMobile.toLowerCase())
    );

    if (found) {
      setSelectedCustomer(found);
      setValue('customerId', found.id!);
      showToast(`Customer "${found.name}" selected`);
    } else {
      setSelectedCustomer(null);
      showToast('Customer not found. Please add them first.', 'error');
    }
    setIsSearching(false);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setValue(`items.${index}.productId`, prod.id!);
      setValue(`items.${index}.productName`, prod.name);
      setValue(`items.${index}.fragrance`, prod.fragrance);
      setValue(`items.${index}.weight`, prod.weight);
      setValue(`items.${index}.price`, prod.price);
      if (prod.imageUrl) {
        setValue(`items.${index}.imageUrl`, prod.imageUrl);
      }
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        setValue('paymentScreenshotUrl', dataUrl);
        showToast('Payment screenshot attached');
      };
    };
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!selectedCustomer) {
      showToast('Please select a customer first', 'error');
      return;
    }

    // Live Stock Validation
    for (const item of data.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && item.quantity > prod.stock) {
        showToast(`Stock Alert: Only ${prod.stock} units available for "${prod.name}"`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Generate Sequential IDs
      const orderId = await generateNextOrderId();
      const invoiceNumber = await generateNextInvoiceId();
      
      const fullShippingAddress = {
        houseNo: selectedCustomer.houseNo || '',
        building: selectedCustomer.building || '',
        street: selectedCustomer.street || '',
        area: selectedCustomer.area || '',
        landmark: selectedCustomer.landmark || '',
        city: selectedCustomer.city || '',
        district: selectedCustomer.district || '',
        state: selectedCustomer.state || '',
        pinCode: selectedCustomer.pinCode || '',
        country: selectedCustomer.country || 'India',
      };

      const orderPayload = {
        orderId,
        invoiceNumber,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobileNumber,
        customerWhatsapp: selectedCustomer.whatsappNumber || selectedCustomer.mobileNumber,
        shippingAddress: fullShippingAddress,
        items: data.items,
        subtotal,
        shippingCharge: data.shippingCharge,
        discount: data.discount,
        totalAmount: grandTotal,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        orderStatus: data.paymentStatus === 'Payment Verified' ? 'Confirmed' : 'Pending Payment',
        shippingStatus: 'Ready to Pack',
        upiTransactionId: data.upiTransactionId || '',
        paymentScreenshotUrl: data.paymentScreenshotUrl || '',
        orderNotes: data.orderNotes || '',
        orderDate: new Date(),
        timeline: [
          { status: 'Order Created', timestamp: new Date() },
          ...(data.paymentStatus === 'Payment Verified' ? [{ status: 'Payment Verified', timestamp: new Date() }] : [])
        ]
      };

      const newDocId = await addDocument('orders', orderPayload);
      showToast(`Order ${orderId} created successfully!`);
      navigate(`/orders/${newDocId}`);
    } catch (error) {
      console.error("Error creating order:", error);
      showToast('Failed to create order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Order</h1>
          <p className="text-sm text-gray-500">Generate sequential Order ID & link customer and items.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/orders')}>Cancel</Button>
      </div>

      {/* Step 1: Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Customer Information & Address</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedCustomer ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search by Mobile, WhatsApp, or Name..." 
                  value={searchMobile} 
                  onChange={(e) => setSearchMobile(e.target.value)} 
                  className="max-w-md"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomerSearch())}
                />
                <Button type="button" onClick={handleCustomerSearch} disabled={isSearching}>
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Search Customer
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/customers/new')}>
                  + Add New Customer
                </Button>
              </div>

              {allCustomers.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Or select recent customer:</p>
                  <div className="flex flex-wrap gap-2">
                    {allCustomers.slice(0, 5).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setValue('customerId', c.id!);
                        }}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 hover:bg-primary/10 rounded-full text-xs font-medium text-gray-800 dark:text-gray-200 border"
                      >
                        {c.name} ({c.mobileNumber})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-lg">{selectedCustomer.name}</h3>
                </div>
                <p className="text-sm text-emerald-800 dark:text-emerald-300 mt-1">
                  Mobile: {selectedCustomer.mobileNumber} | WhatsApp: {selectedCustomer.whatsappNumber || selectedCustomer.mobileNumber}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                  Shipping Address: {selectedCustomer.houseNo}, {selectedCustomer.building}, {selectedCustomer.street}, {selectedCustomer.area}, {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pinCode}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                Change Customer
              </Button>
            </div>
          )}
          {errors.customerId && <p className="text-xs text-red-500 mt-2">{errors.customerId.message}</p>}
        </CardContent>
      </Card>

      {/* Step 2: Line Items & Stock Validation */}
      {selectedCustomer && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">2. Product Line Items & Stock Check</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', productName: '', quantity: 1, price: 0 })}>
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const selectedProdId = watchItems[index]?.productId;
                const currentProd = products.find(p => p.id === selectedProdId);

                return (
                  <div key={field.id} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-slate-800/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-xs font-medium">Search / Select Product</label>
                        <select 
                          className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700 text-sm font-medium"
                          value={selectedProdId}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} | {p.fragrance} ({p.weight}g) - ₹{p.price} [Stock: {p.stock}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-medium">Unit Price (₹)</label>
                        <Input type="number" readOnly className="bg-gray-100 dark:bg-slate-800" {...register(`items.${index}.price`, { valueAsNumber: true })} />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-medium">Quantity</label>
                        <Input type="number" min="1" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-medium">Item Total</label>
                        <div className="h-10 flex items-center px-3 border rounded-md bg-gray-100 dark:bg-slate-800 dark:border-gray-700 font-bold text-primary text-sm">
                          ₹{(watchItems[index]?.quantity || 0) * (watchItems[index]?.price || 0)}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <Button type="button" variant="ghost" className="h-10 w-10 p-0 text-red-500 hover:text-red-700" onClick={() => remove(index)} disabled={fields.length === 1}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Stock Alert Warning */}
                    {currentProd && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t dark:border-gray-700">
                        <span className="text-gray-500">
                          Fragrance: <strong className="text-gray-800 dark:text-gray-200">{currentProd.fragrance}</strong> | Weight: <strong className="text-gray-800 dark:text-gray-200">{currentProd.weight}g</strong>
                        </span>
                        {watchItems[index]?.quantity > currentProd.stock ? (
                          <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Exceeds stock! Only {currentProd.stock} items available.
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {currentProd.stock} in stock
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}
            </CardContent>
          </Card>

          {/* Step 3: Payment & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Payment Information (Online Only)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method *</label>
                  <select className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700" {...register('paymentMethod')}>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Razorpay">Razorpay</option>
                    <option value="Other Online">Other Online</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Verification Status *</label>
                  <select className="w-full h-10 px-3 py-2 border rounded-md dark:bg-slate-900 dark:border-gray-700" {...register('paymentStatus')}>
                    <option value="Pending Payment">Pending Payment</option>
                    <option value="Payment Verified">Payment Verified (Auto-Confirms Order)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">UPI / Bank Transaction ID</label>
                  <Input placeholder="e.g. 301234567890" {...register('upiTransactionId')} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Screenshot</label>
                  <div className="border-2 border-dashed dark:border-gray-700 rounded-lg p-3 text-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="screenshot" 
                      className="hidden"
                      onChange={handleScreenshotUpload}
                    />
                    <label htmlFor="screenshot" className="cursor-pointer flex flex-col items-center text-sm text-gray-500 hover:text-primary">
                      <UploadCloud className="w-6 h-6 mb-1" />
                      <span>{watch('paymentScreenshotUrl') ? 'Screenshot Attached (Click to change)' : 'Upload Payment Screenshot'}</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Special Notes (Optional)</label>
                  <Input placeholder="e.g. Urgent Delivery, Handle Carefully, Gift Packing" {...register('orderNotes')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Shipping Charge</span>
                  <div className="w-28">
                    <Input type="number" className="h-8 text-right font-semibold" {...register('shippingCharge', { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Discount (₹)</span>
                  <div className="w-28">
                    <Input type="number" className="h-8 text-right font-semibold text-emerald-600" {...register('discount', { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-4 mt-2 flex justify-between items-center">
                  <span className="text-lg font-bold">Grand Total</span>
                  <span className="text-2xl font-bold text-primary flex items-center">
                    <IndianRupee className="w-6 h-6 mr-1" />
                    {grandTotal.toFixed(2)}
                  </span>
                </div>

                <Button type="submit" className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" size="lg" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Confirm & Generate Order ID
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
};
