import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Business Name" defaultValue="Asmita Agarbatti" />
            <Input label="GST Number" placeholder="e.g. 22AAAAA0000A1Z5" />
            <Input label="Support Email" defaultValue="support@asmitagarbatti.com" />
            <Input label="Support Phone" defaultValue="+91 9000000000" />
            <div className="pt-2">
              <Button>Save Profile</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Details & UPI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Bank Name" placeholder="e.g. HDFC Bank" />
            <Input label="Account Number" type="password" placeholder="••••••••••••" />
            <Input label="IFSC Code" placeholder="HDFC0001234" />
            <Input label="UPI ID" placeholder="asmita@upi" />
            
            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UPI QR Code</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="text-sm">Click to upload QR Image</span>
              </div>
            </div>
            
            <div className="pt-2">
              <Button>Save Payment Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
