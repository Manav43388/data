import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, RefreshCw, AlertTriangle, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import type { Product } from '../../types';
import { getDocuments, getTrashDocuments, softDeleteDocument, restoreDocument, restockProduct } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTrash, setShowTrash] = useState(false);
  const [restockModalProduct, setRestockModalProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState(50);
  const [isRestocking, setIsRestocking] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [showTrash]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = showTrash 
        ? await getTrashDocuments('products')
        : await getDocuments('products');
      setProducts(data as Product[]);
    } catch (error) {
      console.error("Error fetching products:", error);
      showToast('Error loading products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (window.confirm(`Move "${name}" to Trash?`)) {
      try {
        await softDeleteDocument('products', id);
        showToast(`Product moved to trash`);
        fetchProducts();
      } catch (error) {
        showToast(`Failed to delete product`, 'error');
      }
    }
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      await restoreDocument('products', id);
      showToast(`Product "${name}" restored!`);
      fetchProducts();
    } catch (error) {
      showToast(`Failed to restore product`, 'error');
    }
  };

  const handleRestockSubmit = async () => {
    if (!restockModalProduct?.id || restockQty <= 0) return;
    setIsRestocking(true);
    try {
      await restockProduct(restockModalProduct.id, restockQty);
      showToast(`Restocked +${restockQty} units of ${restockModalProduct.name}!`);
      setRestockModalProduct(null);
      fetchProducts();
    } catch (error) {
      showToast('Failed to restock product', 'error');
    } finally {
      setIsRestocking(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || 
           p.fragrance.toLowerCase().includes(q) ||
           `${p.weight}g`.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products & Inventory</h1>
          <p className="text-sm text-gray-500">Manage catalog, fragrance, weight, prices, and live stock levels.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowTrash(!showTrash)}>
            <Trash2 className="w-4 h-4 mr-2" />
            {showTrash ? 'View Active Catalog' : 'View Trash'}
          </Button>
          {!showTrash && (
            <Button className="w-full sm:w-auto" onClick={() => navigate('/products/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>{showTrash ? 'Trashed Products' : 'Product Directory'}</CardTitle>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input 
                className="pl-9" 
                placeholder="Search by name, fragrance, weight..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-800 dark:text-gray-400 border-b dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Fragrance</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading products...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      {showTrash ? 'No products in trash.' : 'No products found.'}
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const threshold = product.minStockThreshold || 10;
                    const isLowStock = product.stock <= threshold;

                    return (
                      <tr key={product.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded-md border shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 shrink-0">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{product.fragrance}</td>
                        <td className="px-4 py-3 font-medium">{product.weight}g</td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">₹{product.price}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                              product.stock === 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                              isLowStock ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                              'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}>
                              {isLowStock && <AlertTriangle className="w-3 h-3" />}
                              {product.stock} units
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {showTrash ? (
                            <Button variant="outline" size="sm" onClick={() => handleRestore(product.id!, product.name)}>
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore
                            </Button>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => {
                                  setRestockModalProduct(product);
                                  setRestockQty(50);
                                }}
                              >
                                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restock
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Delete" onClick={() => handleSoftDelete(product.id!, product.name)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Restock Modal */}
      {restockModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Restock Product</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{restockModalProduct.name}</p>
                <p className="text-sm text-gray-500">Current Stock: {restockModalProduct.stock} units</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Quantity to Restock</label>
                <Input 
                  type="number" 
                  min="1" 
                  value={restockQty} 
                  onChange={(e) => setRestockQty(parseInt(e.target.value) || 0)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRestockModalProduct(null)}>Cancel</Button>
                <Button onClick={handleRestockSubmit} disabled={isRestocking}>
                  Confirm Restock (+{restockQty})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
