import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, IndianRupee, Search, UploadCloud, AlertCircle, CheckCircle, UserPlus, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument, getDocuments, generateNextOrderId, generateNextInvoiceId, getStoreSettings } from '../../services/db';
import type { Customer, Product } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { getKolkataTodayKey, formatKolkataDate } from '../../utils/dateUtils';

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
  paymentMethod: z.enum(['UPI', 'Bank Transfer', 'Razorpay', 'Other Online']),
  paymentStatus: z.enum(['Pending', 'Received', 'Verified', 'Failed', 'Refunded', 'Pending Payment', 'Payment Verified']),
  upiTransactionId: z.string().optional(),
  paymentScreenshotUrl: z.string().optional(),
  orderNotes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export const OrderForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCustomerId = searchParams.get('customerId');
  const { addToast } = useToast();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Customer Search & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline New Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustLoading, setNewCustLoading] = useState(false);
  const [newCustData, setNewCustData] = useState({
    name: '',
    mobileNumber: '',
    whatsappNumber: '',
    houseNo: '',
    building: '',
    street: '',
    area: '',
    landmark: '',
    city: '',
    district: '',
    state: 'Gujarat',
    pinCode: '',
    notes: '',
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      items: [{ productId: '', productName: '', quantity: 1, price: 0 }],
      shippingCharge: 50,
      discount: 0,
      paymentMethod: 'UPI',
      paymentStatus: 'Verified',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchItems = watch("items");
  const shippingCharge = watch("shippingCharge") || 0;
  const discount = watch("discount") || 0;

  const subtotal = watchItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.price || 0)), 0);
  const grandTotal = Math.max(0, subtotal + shippingCharge - discount);

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

  useEffect(() => {
    fetchInitialData();
  }, [preSelectedCustomerId, setValue]);

  const handleCustomerSearch = () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const q = searchQuery.trim().toLowerCase();
    const found = allCustomers.find(c => 
      c.mobileNumber?.includes(q) || 
      (c.whatsappNumber && c.whatsappNumber.includes(q)) ||
      c.name.toLowerCase().includes(q)
    );

    if (found) {
      setSelectedCustomer(found);
      setValue('customerId', found.id!);
      addToast(`Customer "${found.name}" loaded successfully`, 'success');
    } else {
      setSelectedCustomer(null);
      addToast('No customer matching name/mobile/WhatsApp found. You can create a new customer inline.', 'error');
    }
    setIsSearching(false);
  };

  const handleCreateCustomerInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustData.name || !newCustData.mobileNumber) {
      addToast('Customer Name and Mobile Number are required', 'error');
      return;
    }

    setNewCustLoading(true);
    try {
      const payload = {
        ...newCustData,
        whatsappNumber: newCustData.whatsappNumber || newCustData.mobileNumber,
        country: 'India',
        createdAt: new Date()
      };

      const newId = await addDocument('customers', payload);
      const createdCust: Customer = { id: newId, ...payload };

      setAllCustomers(prev => [createdCust, ...prev]);
      setSelectedCustomer(createdCust);
      setValue('customerId', newId);
      setShowAddCustomerModal(false);
      addToast(`New Customer "${createdCust.name}" created and attached to order!`, 'success');
    } catch (err) {
      console.error("Error creating customer inline", err);
      addToast('Failed to create new customer', 'error');
    } finally {
      setNewCustLoading(false);
    }
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
        addToast('Payment screenshot attached', 'success');
      };
    };
  };

  const onSubmit = async (data: OrderFormData) => {
    if (!selectedCustomer) {
      addToast('Please select or create a customer first', 'error');
      return;
    }

    // Live Stock Validation
    for (const item of data.items) {
      const prod = products.find(p => p.id === item.productId);
      if (prod && item.quantity > prod.stock) {
        addToast(`Stock Alert: Only ${prod.stock} units available for "${prod.name}"`, 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const orderId = await generateNextOrderId();
      const invoiceNumber = await generateNextInvoiceId();
      const now = new Date();

      const isVerified = data.paymentStatus === 'Verified' || data.paymentStatus === 'Payment Verified';

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

      const timelineSteps = [
        { status: 'Customer Added', timestamp: now },
        { status: 'Order Created', timestamp: now },
        { status: 'Payment Received', timestamp: now },
      ];

      if (isVerified) {
        timelineSteps.push({ status: 'Payment Verified', timestamp: now });
        timelineSteps.push({ status: 'Order Confirmed', timestamp: now });
        timelineSteps.push({ status: 'Packaging Pending', timestamp: now });
      }

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
        paymentStatus: isVerified ? 'Verified' : data.paymentStatus,
        orderStatus: isVerified ? 'Confirmed' : 'Pending Payment',
        fulfilmentStatus: isVerified ? 'Packaging Pending' : 'Order Confirmed',
        packagingStatus: 'Not Started',
        upiTransactionId: data.upiTransactionId || '',
        transactionId: data.upiTransactionId || '',
        paymentScreenshotUrl: data.paymentScreenshotUrl || '',
        orderNotes: data.orderNotes || '',
        orderDate: now,
        orderDateKey: getKolkataTodayKey(),
        displayDate: formatKolkataDate(now),
        timeline: timelineSteps
      };

      const newDocId = await addDocument('orders', orderPayload);
      addToast(`Order ${orderId} created! Moved to Packaging Pending.`, 'success');
      navigate(`/orders/${newDocId}`);
    } catch (error) {
      console.error("Error creating order:", error);
      addToast('Failed to create order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            Stage 1 — Customer & Order Entry
          </span>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Create Confirmed Order</h1>
        </div>
        <Button variant="outline" onClick={() => navigate('/orders')} className="rounded-xl text-xs font-bold">
          Cancel
        </Button>
      </div>

      {/* Step 1: Customer Search or Selection */}
      <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-extrabold flex items-center justify-between">
            <span>1. Customer Search & Address Verification</span>
            <Button 
              type="button" 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              onClick={() => setShowAddCustomerModal(true)}
            >
              <UserPlus className="w-4 h-4" /> + Inline New Customer
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedCustomer ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder="Search by Customer Name, Mobile, or WhatsApp..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="max-w-md rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomerSearch())}
                />
                <Button type="button" onClick={handleCustomerSearch} disabled={isSearching} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Search Customer
                </Button>
              </div>

              {allCustomers.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Or select existing saved customer:</p>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {allCustomers.slice(0, 10).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setValue('customerId', c.id!);
                        }}
                        className="px-3.5 py-2 bg-gray-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-200 transition-all flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {c.name} ({c.mobileNumber})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-black text-emerald-900 dark:text-emerald-200 text-lg">{selectedCustomer.name}</h3>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1 font-semibold">
                  Mobile: {selectedCustomer.mobileNumber} | WhatsApp: {selectedCustomer.whatsappNumber || selectedCustomer.mobileNumber}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                  Address: {selectedCustomer.houseNo}, {selectedCustomer.building}, {selectedCustomer.street}, {selectedCustomer.area}, {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pinCode}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCustomer(null)} className="rounded-xl text-xs font-bold">
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
          <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-extrabold">2. Ordered Agarbatti Products</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', productName: '', quantity: 1, price: 0 })} className="rounded-xl text-xs font-bold">
                  <Plus className="w-4 h-4 mr-1" /> Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const selectedProdId = watchItems[index]?.productId;
                const currentProd = products.find(p => p.id === selectedProdId);

                return (
                  <div key={field.id} className="p-4 border rounded-2xl dark:border-gray-700 bg-gray-50/50 dark:bg-slate-800/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300">Select Agarbatti Product</label>
                        <select 
                          className="w-full h-10 px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-gray-700 text-xs font-bold"
                          value={selectedProdId}
                          onChange={(e) => handleProductSelect(index, e.target.value)}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.fragrance}, {p.weight}g) - ₹{p.price} [Stock: {p.stock}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Unit Price (₹)</label>
                        <Input type="number" readOnly className="bg-gray-100 dark:bg-slate-800 rounded-xl font-bold text-xs" {...register(`items.${index}.price`, { valueAsNumber: true })} />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Quantity</label>
                        <Input type="number" min="1" className="rounded-xl font-bold text-xs" {...register(`items.${index}.quantity`, { valueAsNumber: true })} />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Item Total</label>
                        <div className="h-10 flex items-center px-3 border rounded-xl bg-emerald-50/50 dark:bg-slate-800 dark:border-gray-700 font-black text-emerald-700 dark:text-emerald-400 text-xs">
                          ₹{((watchItems[index]?.quantity || 0) * (watchItems[index]?.price || 0)).toFixed(2)}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <Button type="button" variant="ghost" className="h-10 w-10 p-0 text-red-500 hover:text-red-700 rounded-xl" onClick={() => remove(index)} disabled={fields.length === 1}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {currentProd && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t dark:border-gray-700">
                        <span className="text-gray-500 font-medium">
                          Fragrance: <strong>{currentProd.fragrance}</strong> | Weight: <strong>{currentProd.weight}g</strong>
                        </span>
                        {watchItems[index]?.quantity > currentProd.stock ? (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Only {currentProd.stock} in stock!
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold">
                            Stock Available ({currentProd.stock})
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

          {/* Step 3: Payment Method & Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-extrabold">3. Online Payment Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Payment Method (Online Only) *</label>
                  <select className="w-full h-10 px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-gray-700 text-xs font-bold" {...register('paymentMethod')}>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Razorpay">Razorpay</option>
                    <option value="Other Online">Other Online</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Payment Status *</label>
                  <select className="w-full h-10 px-3 py-2 border rounded-xl dark:bg-slate-900 dark:border-gray-700 text-xs font-bold" {...register('paymentStatus')}>
                    <option value="Verified">Verified (Confirms Order & Moves to Packaging)</option>
                    <option value="Pending">Pending Payment</option>
                    <option value="Received">Received (Awaiting Audit)</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">UPI / Bank Transaction ID</label>
                  <Input placeholder="e.g. UPI301294859" className="rounded-xl font-bold text-xs" {...register('upiTransactionId')} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Payment Screenshot Proof</label>
                  <div className="border-2 border-dashed dark:border-gray-700 rounded-2xl p-3 text-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="screenshot" 
                      className="hidden"
                      onChange={handleScreenshotUpload}
                    />
                    <label htmlFor="screenshot" className="cursor-pointer flex flex-col items-center text-xs font-bold text-gray-500 hover:text-emerald-600">
                      <UploadCloud className="w-5 h-5 mb-1" />
                      <span>{watch('paymentScreenshotUrl') ? '✓ Screenshot Attached (Click to change)' : 'Upload Payment Screenshot'}</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Order Special Notes</label>
                  <Input placeholder="e.g. Include sample, Urgent dispatch" className="rounded-xl text-xs" {...register('orderNotes')} />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xs flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-base font-extrabold">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-xs font-semibold text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900 dark:text-white">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-500">Shipping Charge (₹)</span>
                  <div className="w-28">
                    <Input type="number" className="h-8 text-right font-bold rounded-xl text-xs" {...register('shippingCharge', { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-500">Discount (₹)</span>
                  <div className="w-28">
                    <Input type="number" className="h-8 text-right font-bold text-emerald-600 rounded-xl text-xs" {...register('discount', { valueAsNumber: true })} />
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-4 mt-2 flex justify-between items-center">
                  <span className="text-sm font-black text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 flex items-center">
                    <IndianRupee className="w-5 h-5" />
                    {grandTotal.toFixed(2)}
                  </span>
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm py-3 rounded-2xl shadow-lg" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    "Confirm Order & Move to Packaging"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      )}

      {/* Inline Customer Creation Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Add New Customer Inline</h2>
                <p className="text-xs text-gray-500">Enter customer details and shipping address to auto-attach to order.</p>
              </div>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerInline} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Customer Name *</label>
                  <Input 
                    required 
                    className="rounded-xl text-xs" 
                    placeholder="Full Name" 
                    value={newCustData.name} 
                    onChange={e => setNewCustData({ ...newCustData, name: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Mobile Number *</label>
                  <Input 
                    required 
                    className="rounded-xl text-xs" 
                    placeholder="10-digit mobile" 
                    value={newCustData.mobileNumber} 
                    onChange={e => setNewCustData({ ...newCustData, mobileNumber: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">WhatsApp Number</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="Leave blank if same as mobile" 
                    value={newCustData.whatsappNumber} 
                    onChange={e => setNewCustData({ ...newCustData, whatsappNumber: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">House / Flat No.</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="House No / Shop No" 
                    value={newCustData.houseNo} 
                    onChange={e => setNewCustData({ ...newCustData, houseNo: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Building / Society</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="Building name" 
                    value={newCustData.building} 
                    onChange={e => setNewCustData({ ...newCustData, building: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Street / Road</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="Street name" 
                    value={newCustData.street} 
                    onChange={e => setNewCustData({ ...newCustData, street: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Area / Locality</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="Area locality" 
                    value={newCustData.area} 
                    onChange={e => setNewCustData({ ...newCustData, area: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Landmark</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="Near landmark" 
                    value={newCustData.landmark} 
                    onChange={e => setNewCustData({ ...newCustData, landmark: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">City</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="City" 
                    value={newCustData.city} 
                    onChange={e => setNewCustData({ ...newCustData, city: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">District</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="District" 
                    value={newCustData.district} 
                    onChange={e => setNewCustData({ ...newCustData, district: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">State</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="State" 
                    value={newCustData.state} 
                    onChange={e => setNewCustData({ ...newCustData, state: e.target.value })} 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">PIN Code</label>
                  <Input 
                    className="rounded-xl text-xs" 
                    placeholder="6-digit PIN code" 
                    value={newCustData.pinCode} 
                    onChange={e => setNewCustData({ ...newCustData, pinCode: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Customer Notes</label>
                <Input 
                  className="rounded-xl text-xs" 
                  placeholder="Special instructions or preferences" 
                  value={newCustData.notes} 
                  onChange={e => setNewCustData({ ...newCustData, notes: e.target.value })} 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-800">
                <Button type="button" variant="outline" onClick={() => setShowAddCustomerModal(false)} className="rounded-xl text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={newCustLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 py-2">
                  {newCustLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Attach Customer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
