export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin';
  name?: string;
}

export interface Customer {
  id?: string;
  name: string;
  mobileNumber: string;
  whatsappNumber: string;
  email?: string;
  houseNo: string;
  building: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  country?: string;
  notes?: string;
  customerType?: 'Regular' | 'Wholesale' | 'VIP' | 'New' | string;
  isDeleted?: boolean;
  deletedAt?: Date | any;
  createdAt: Date | any;
  createdBy?: string;
  updatedAt?: Date | any;
  updatedBy?: string;
}

export interface Address {
  id?: string;
  customerId: string;
  houseNo: string;
  building: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  country: string;
}

export interface Product {
  id?: string;
  name: string;
  fragrance: string;
  weight: number; // in grams
  price: number;
  stock: number;
  minStockThreshold?: number;
  imageUrl?: string;
  isDeleted?: boolean;
  deletedAt?: Date | any;
  createdAt: Date | any;
  createdBy?: string;
  updatedAt?: Date | any;
  updatedBy?: string;
}

export type OrderStatus = 'Pending Payment' | 'Payment Verified' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type ShippingStatus = 'Ready to Pack' | 'Packed' | 'Out for Pickup' | 'In Transit' | 'Delivered' | 'Returned';
export type PaymentStatus = 'Pending Payment' | 'Payment Verified' | 'Failed' | 'Refunded';
export type PaymentMethod = 'UPI' | 'Bank Transfer' | 'Razorpay' | 'Other Online';
export type CourierCompany = 'India Post' | 'DTDC' | 'Delhivery' | 'Blue Dart' | 'Xpressbees' | 'Shadowfax' | 'Other';

export interface OrderItem {
  productId: string;
  productName: string;
  fragrance?: string;
  weight?: number;
  quantity: number;
  price: number; // unit price at time of order
  imageUrl?: string;
}

export interface OrderTimelineStep {
  status: string;
  timestamp: Date | any;
  updatedBy?: string;
  note?: string;
}

export interface OrderShippingAddress {
  houseNo: string;
  building: string;
  street: string;
  area: string;
  landmark?: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  country?: string;
}

export interface Order {
  id?: string;
  orderId: string; // e.g. AG20260001
  invoiceNumber?: string; // e.g. INV20260001
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerWhatsapp: string;
  addressId?: string;
  shippingAddress: OrderShippingAddress | string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingCharge: number;
  totalAmount: number;
  paymentMethod: PaymentMethod | string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  shippingStatus?: ShippingStatus;
  orderDate: Date | any;
  orderNotes?: string;
  notes?: string;
  
  // Payment Details
  upiTransactionId?: string;
  paymentScreenshotUrl?: string;
  
  // Shipping Details
  courierCompany?: CourierCompany | string;
  trackingId?: string;
  trackingUrl?: string;
  shippingDate?: Date | any;
  expectedDeliveryDate?: Date | any;
  deliveredDate?: Date | any;
  
  // Audit & Workflow
  timeline?: OrderTimelineStep[];
  isDeleted?: boolean;
  deletedAt?: Date | any;
  createdAt?: Date | any;
  createdBy?: string;
  updatedAt?: Date | any;
  updatedBy?: string;
}

export interface StoreSettings {
  id?: string;
  businessName: string;
  businessAddress: string;
  city: string;
  state: string;
  pinCode: string;
  phone: string;
  email: string;
  upiId: string;
  upiQrUrl?: string;
  gstNumber?: string;
  invoicePrefix: string;
  orderPrefix: string;
  defaultShippingCharge: number;
}
