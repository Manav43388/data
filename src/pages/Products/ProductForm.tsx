import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { addDocument } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  fragrance: z.string().min(1, 'Fragrance type is required'),
  weight: z.number().min(1, 'Weight must be positive'),
  price: z.number().min(0, 'Price cannot be negative'),
  stock: z.number().min(0, 'Stock cannot be negative'),
  minStockThreshold: z.number().min(1, 'Minimum stock threshold is required'),
  imageUrl: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      minStockThreshold: 10,
      stock: 50,
      weight: 100,
    }
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setImagePreview(dataUrl);
        setValue('imageUrl', dataUrl);
      };
    };
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await addDocument('products', data);
      showToast('Product added successfully!');
      navigate('/products');
    } catch (error) {
      console.error("Error adding product:", error);
      showToast('Failed to add product', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
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
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Name *</label>
                <Input placeholder="e.g. Premium Rose Agarbatti" {...register('name')} />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Fragrance Type *</label>
                <Input placeholder="e.g. Rose, Sandalwood, Mogra" {...register('fragrance')} />
                {errors.fragrance && <p className="text-xs text-red-500">{errors.fragrance.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight (in grams) *</label>
                <Input type="number" placeholder="e.g. 100" {...register('weight', { valueAsNumber: true })} />
                {errors.weight && <p className="text-xs text-red-500">{errors.weight.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Price (₹) *</label>
                <Input type="number" placeholder="e.g. 150" {...register('price', { valueAsNumber: true })} />
                {errors.price && <p className="text-xs text-red-500">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Stock *</label>
                <Input type="number" placeholder="e.g. 50" {...register('stock', { valueAsNumber: true })} />
                {errors.stock && <p className="text-xs text-red-500">{errors.stock.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Alert Threshold *</label>
                <Input type="number" placeholder="Default: 10" {...register('minStockThreshold', { valueAsNumber: true })} />
                <p className="text-xs text-gray-500">Dashboard will warn when stock falls below this quantity.</p>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Product Image (Optional)</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <input 
                  type="file" 
                  accept="image/*" 
                  id="product-image" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />
                <label htmlFor="product-image" className="cursor-pointer flex flex-col items-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-md mb-2 border" />
                  ) : (
                    <ImageIcon className="w-8 h-8 mb-2 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-primary">
                    {imagePreview ? 'Click to change image' : 'Upload Product Image'}
                  </span>
                </label>
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
