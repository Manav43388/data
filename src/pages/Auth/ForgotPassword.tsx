import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

const resetSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export const ForgotPassword: React.FC = () => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema)
  });

  const onSubmit = async (data: ResetFormValues) => {
    try {
      setMessage('');
      setError('');
      setLoading(true);
      await sendPasswordResetEmail(auth, data.email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold text-primary">Reset Password</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Enter your email to receive a password reset link.</p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 border border-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm mb-4 border border-green-200">
              {message}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@asmitagarbatti.com"
              {...register('email')}
              error={errors.email?.message}
            />
            <Button type="submit" className="w-full" isLoading={loading}>
              Send Reset Link
            </Button>
            <div className="text-center mt-4 text-sm">
              <Link to="/login" className="text-primary hover:underline">Back to Login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
