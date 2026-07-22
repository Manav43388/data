import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { StoreSettings } from '../types';

// Generic CRUD functions with Soft Delete support
export const addDocument = async (collectionName: string, data: any) => {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getDocuments = async (collectionName: string, includeDeleted = false) => {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  
  const docs = snapshot.docs
    .map(d => {
      const data = d.data();
      return { id: d.id, ...data };
    })
    .filter((item: any) => includeDeleted ? true : !item.isDeleted);

  // Sort locally by createdAt desc if present
  return docs.sort((a: any, b: any) => {
    const timeA = a.createdAt?.seconds || 0;
    const timeB = b.createdAt?.seconds || 0;
    return timeB - timeA;
  });
};

export const getTrashDocuments = async (collectionName: string) => {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter((item: any) => item.isDeleted === true);
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const softDeleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    isDeleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
};

export const restoreDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    isDeleted: false,
    deletedAt: null,
    updatedAt: serverTimestamp()
  });
};

export const permanentDeleteDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

// Sequential ID Generators
export const generateNextOrderId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `AG${year}`;
  
  const colRef = collection(db, 'orders');
  const snapshot = await getDocs(colRef);
  
  let highestNum = 0;
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.orderId && typeof data.orderId === 'string' && data.orderId.startsWith(prefix)) {
      const numPart = parseInt(data.orderId.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > highestNum) {
        highestNum = numPart;
      }
    }
  });

  const nextNum = highestNum + 1;
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
};

export const generateNextInvoiceId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `INV${year}`;
  
  const colRef = collection(db, 'orders');
  const snapshot = await getDocs(colRef);
  
  let highestNum = 0;
  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    if (data.invoiceNumber && typeof data.invoiceNumber === 'string' && data.invoiceNumber.startsWith(prefix)) {
      const numPart = parseInt(data.invoiceNumber.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > highestNum) {
        highestNum = numPart;
      }
    }
  });

  const nextNum = highestNum + 1;
  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
};

// Stock Management
export const deductProductStock = async (items: Array<{ productId: string; quantity: number }>) => {
  for (const item of items) {
    if (!item.productId) continue;
    const productRef = doc(db, 'products', item.productId);
    const snap = await getDoc(productRef);
    if (snap.exists()) {
      const currentStock = snap.data().stock || 0;
      const newStock = Math.max(0, currentStock - item.quantity);
      await updateDoc(productRef, { 
        stock: newStock,
        updatedAt: serverTimestamp()
      });
    }
  }
};

export const restockProduct = async (productId: string, quantity: number) => {
  const productRef = doc(db, 'products', productId);
  const snap = await getDoc(productRef);
  if (snap.exists()) {
    const currentStock = snap.data().stock || 0;
    await updateDoc(productRef, {
      stock: currentStock + quantity,
      updatedAt: serverTimestamp()
    });
  }
};

// Store Settings
export const DEFAULT_SETTINGS: StoreSettings = {
  businessName: 'Asmita Gruh Udhyog',
  businessAddress: '123 Main Street, Industrial Area',
  city: 'Ahmedabad',
  state: 'Gujarat',
  pinCode: '380001',
  phone: '+91 9876543210',
  email: 'info@asmitagruhudhyog.com',
  upiId: 'asmitagruhudhyog@upi',
  gstNumber: '24ABCDE1234F1Z5',
  invoicePrefix: 'INV2026',
  orderPrefix: 'AG2026',
  defaultShippingCharge: 50
};

export const getStoreSettings = async (): Promise<StoreSettings> => {
  try {
    const colRef = collection(db, 'settings');
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StoreSettings;
    }
  } catch (e) {
    console.error("Error loading settings, using default", e);
  }
  return DEFAULT_SETTINGS;
};

export const saveStoreSettings = async (settings: Partial<StoreSettings>) => {
  const colRef = collection(db, 'settings');
  const snapshot = await getDocs(colRef);
  if (!snapshot.empty) {
    const docRef = doc(db, 'settings', snapshot.docs[0].id);
    await updateDoc(docRef, { ...settings, updatedAt: serverTimestamp() });
  } else {
    await addDoc(colRef, { ...settings, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
};

// Backup Export Helper
export const exportAllData = async () => {
  const [customers, products, orders, settings] = await Promise.all([
    getDocuments('customers', true),
    getDocuments('products', true),
    getDocuments('orders', true),
    getStoreSettings()
  ]);

  return {
    exportDate: new Date().toISOString(),
    storeName: settings.businessName,
    customers,
    products,
    orders,
    settings
  };
};
