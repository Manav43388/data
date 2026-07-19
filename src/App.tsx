import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';
import { Login } from './pages/Auth/Login';
import { ForgotPassword } from './pages/Auth/ForgotPassword';
import { Settings } from './pages/Settings/Settings';
import { ProductList } from './pages/Products/ProductList';
import { ProductForm } from './pages/Products/ProductForm';
import { CustomerList } from './pages/Customers/CustomerList';
import { CustomerForm } from './pages/Customers/CustomerForm';
import { OrderList } from './pages/Orders/OrderList';
import { OrderForm } from './pages/Orders/OrderForm';
import { Dashboard } from './pages/Dashboard/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
            <Route path="/customers" element={<AdminLayout><CustomerList /></AdminLayout>} />
            <Route path="/customers/new" element={<AdminLayout><CustomerForm /></AdminLayout>} />
            <Route path="/products" element={<AdminLayout><ProductList /></AdminLayout>} />
            <Route path="/products/new" element={<AdminLayout><ProductForm /></AdminLayout>} />
            <Route path="/orders" element={<AdminLayout><OrderList /></AdminLayout>} />
            <Route path="/orders/new" element={<AdminLayout><OrderForm /></AdminLayout>} />
            <Route path="/payments" element={<AdminLayout><div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow h-64 flex items-center justify-center">Payments</div></AdminLayout>} />
            <Route path="/shipping" element={<AdminLayout><div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow h-64 flex items-center justify-center">Shipping</div></AdminLayout>} />
            <Route path="/reports" element={<AdminLayout><div className="p-4 bg-white dark:bg-slate-900 rounded-lg shadow h-64 flex items-center justify-center">Reports</div></AdminLayout>} />
            <Route path="/settings" element={<AdminLayout><Settings /></AdminLayout>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
