import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument } from '../../services/db';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  fragrance: z.string().min(1, 'Fragrance type is required'),
  weight: z.number().min(1, 'Weight must be positive'),
  price: z.number().min(0, 'Price cannot be negative'),
  stock: z.number().min(0, 'Stock cannot be negative'),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await addDocument('products', data);
      navigate('/products');
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Failed to add product.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Product</h1>
        <Button variant="outline" onClick={() => navigate('/products')}>Cancel</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                <Input placeholder="e.g. Premium Rose Agarbatti" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fragrance Type</label>
                <Input placeholder="e.g. Rose, Sandalwood" {...register('fragrance')} />
                {errors.fragrance && <p className="text-xs text-red-500">{errors.fragrance.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight (in grams)</label>
                <Input type="number" placeholder="e.g. 100" {...register('weight', { valueAsNumber: true })} />
                {errors.weight && <p className="text-xs text-red-500">{errors.weight.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price (₹)</label>
                <Input type="number" placeholder="e.g. 150" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Stock</label>
                <Input type="number" placeholder="e.g. 50" {...register('stock', { valueAsNumber: true })} />
                {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Image (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="text-sm font-medium">Click to upload image</p>
                <p className="text-xs mt-1">PNG, JPG up to 2MB</p>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Product
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
