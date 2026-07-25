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

export interface PackagingChecklist {
  productsCollected: boolean;
  quantitiesChecked: boolean;
  productConditionChecked: boolean;
  placedInParcel: boolean;
  freeSampleAdded?: boolean;
  invoiceAdded: boolean;
  parcelSealed: boolean;
  addressLabelAttached: boolean;
  mobileChecked: boolean;
  qualityChecked: boolean;
}

export const DEFAULT_PACKAGING_CHECKLIST: PackagingChecklist = {
  productsCollected: false,
  quantitiesChecked: false,
  productConditionChecked: false,
  placedInParcel: false,
  freeSampleAdded: false,
  invoiceAdded: false,
  parcelSealed: false,
  addressLabelAttached: false,
  mobileChecked: false,
  qualityChecked: false,
};

export type FulfilmentStatus = 
  | 'Order Confirmed'
  | 'Packaging Pending'
  | 'Packaging In Progress'
  | 'Ready to Ship'
  | 'Shipped'
  | 'Delivered'
  | 'Returned'
  | 'Cancelled';

export type PackagingStatus = 'Not Started' | 'In Progress' | 'Packed';

export type OrderStatus = 
  | 'Pending Payment' 
  | 'Payment Verified' 
  | 'Confirmed' 
  | 'Packing'
  | 'Ready To Ship'
  | 'Shipment Process'
  | 'Delivered'
  | 'Cancelled';

export type ShippingStatus = 'Ready to Pack' | 'Packed' | 'Out for Pickup' | 'In Transit' | 'Delivered' | 'Returned';
export type PaymentStatus = 'Pending' | 'Received' | 'Verified' | 'Failed' | 'Refunded' | 'Pending Payment' | 'Payment Verified';
export type PaymentMethod = 'UPI' | 'Bank Transfer' | 'Razorpay' | 'Other Online';
export type CourierCompany = 'Shree Tirupati Courier' | 'India Post' | 'DTDC' | 'Delhivery' | 'Blue Dart' | 'Xpressbees' | 'Shadowfax' | 'Other';

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
  fulfilmentStatus?: FulfilmentStatus;
  packagingStatus?: PackagingStatus;
  shippingStatus?: ShippingStatus;
  orderDate: Date | any;
  orderDateKey?: string; // e.g. "2026-07-25" (in Asia/Kolkata)
  displayDate?: string; // e.g. "25-07-2026"
  orderNotes?: string;
  packagingNotes?: string;
  shippingNotes?: string;
  notes?: string;
  
  // Internal Packing Checklist
  packagingChecklist?: PackagingChecklist;
  packingChecklist?: PackagingChecklist; // backwards compatibility
  packagingStartedAt?: Date | any;
  packagingCompletedAt?: Date | any;
  packedBy?: string;
  packedAt?: Date | any;
  
  // Payment Details
  upiTransactionId?: string;
  transactionId?: string;
  paymentScreenshotUrl?: string;
  
  // Shipping Details
  courierCompany?: CourierCompany | string;
  trackingId?: string;
  trackingUrl?: string;
  shippingDate?: Date | any;
  shippedAt?: Date | any;
  expectedDeliveryDate?: Date | any;
  
  // WhatsApp Tracking status
  whatsappOpenedAt?: Date | any;
  whatsappTrackingSent?: boolean;
  whatsappTrackingSentAt?: Date | any;
  
  // Delivery Details
  deliveredDate?: Date | any;
  deliveredAt?: Date | any;
  deliveryTime?: string;
  
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
