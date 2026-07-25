import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDocuments } from '../services/db';
import type { Order, Customer, Product } from '../types';

interface SearchResults {
  orders: Order[];
  customers: Customer[];
  products: Product[];
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  results: SearchResults;
  loading: boolean;
  performSearch: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  const [results, setResults] = useState<SearchResults>({
    orders: [],
    customers: [],
    products: [],
  });

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [ordersData, customersData, productsData] = await Promise.all([
        getDocuments('orders'),
        getDocuments('customers'),
        getDocuments('products'),
      ]);
      setAllOrders(ordersData as Order[]);
      setAllCustomers(customersData as Customer[]);
      setAllProducts(productsData as Product[]);
    } catch (e) {
      console.error('Error fetching data for search:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSearchOpen || searchQuery.length > 0) {
      loadAllData();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ orders: [], customers: [], products: [] });
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    const filteredOrders = allOrders.filter((o) => {
      const orderIdMatch = o.orderId?.toLowerCase().includes(q);
      const customerNameMatch = o.customerName?.toLowerCase().includes(q);
      const mobileMatch = o.customerMobile?.includes(q) || o.customerWhatsapp?.includes(q);
      const trackingMatch = o.trackingId?.toLowerCase().includes(q);
      const productMatch = o.items?.some((i) => i.productName.toLowerCase().includes(q));
      return orderIdMatch || customerNameMatch || mobileMatch || trackingMatch || productMatch;
    });

    const filteredCustomers = allCustomers.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(q);
      const mobileMatch = c.mobileNumber?.includes(q) || c.whatsappNumber?.includes(q);
      const cityMatch = c.city?.toLowerCase().includes(q);
      return nameMatch || mobileMatch || cityMatch;
    });

    const filteredProducts = allProducts.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(q);
      const fragranceMatch = p.fragrance?.toLowerCase().includes(q);
      return nameMatch || fragranceMatch;
    });

    setResults({
      orders: filteredOrders.slice(0, 8),
      customers: filteredCustomers.slice(0, 8),
      products: filteredProducts.slice(0, 8),
    });
  }, [searchQuery, allOrders, allCustomers, allProducts]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        results,
        loading,
        performSearch: setSearchQuery,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
