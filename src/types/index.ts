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
  gstNumber?: string;
  createdAt: Date | any; // allow firestore timestamp
}

export interface Address {
  id?: string;
  customerId: string;
  fullName: string;
  mobileNumber: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area: string;
  city: string;
  state: string;
  pinCode: string;
}

export interface Product {
  id?: string;
  name: string;
  fragrance: string;
  weight: number; // in grams
  price: number;
  stock: number;
  imageUrl?: string;
  createdAt: Date | any;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Packed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Verified' | 'Failed' | 'Refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number; // unit price at time of order
}

export interface Order {
  id?: string;
  orderId: string; // e.g. AG20260001
  customerId: string;
  addressId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingCharge: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  orderDate: Date | any;
  notes?: string;
  
  // Payment Details
  upiTransactionId?: string;
  paymentScreenshotUrl?: string;
  
  // Shipping Details
  courierCompany?: string;
  shippingDate?: Date | any;
  expectedDeliveryDate?: Date | any;
  deliveredDate?: Date | any;
}
