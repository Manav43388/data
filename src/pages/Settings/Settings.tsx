import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Download, Loader2, Save, Store, Shield } from 'lucide-react';
import { getStoreSettings, saveStoreSettings, exportAllData } from '../../services/db';
import { useToast } from '../../contexts/ToastContext';
import type { StoreSettings } from '../../types';

export const Settings: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>({
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
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getStoreSettings();
        setSettings(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveStoreSettings(settings);
      showToast('Store settings saved successfully!');
    } catch (e) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const backupData = await exportAllData();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AsmitaGruhUdhyog_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      showToast('System data backup exported successfully!');
    } catch (e) {
      showToast('Export failed', 'error');
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings & Business Profile</h1>
          <p className="text-sm text-gray-500">Configure business information, printable templates headers, and system backups.</p>
        </div>
        <Button variant="outline" onClick={handleExportBackup}>
          <Download className="w-4 h-4 mr-2" />
          Export System Backup
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" /> Asmita Gruh Udhyog Business Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Business / Brand Name</label>
                <Input value={settings.businessName} onChange={(e) => handleChange('businessName', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">GST Number</label>
                <Input value={settings.gstNumber || ''} onChange={(e) => handleChange('gstNumber', e.target.value)} placeholder="e.g. 24ABCDE1234F1Z5" />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold">Complete Business Address (For Shipping Labels & Invoices)</label>
                <Input value={settings.businessAddress} onChange={(e) => handleChange('businessAddress', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">City</label>
                <Input value={settings.city} onChange={(e) => handleChange('city', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">State</label>
                <Input value={settings.state} onChange={(e) => handleChange('state', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">PIN Code</label>
                <Input value={settings.pinCode} onChange={(e) => handleChange('pinCode', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Store Phone Number</label>
                <Input value={settings.phone} onChange={(e) => handleChange('phone', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Support Email</label>
                <Input value={settings.email} onChange={(e) => handleChange('email', e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Store UPI ID</label>
                <Input value={settings.upiId} onChange={(e) => handleChange('upiId', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" /> Defaults & Document Prefixes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Order ID Prefix</label>
                <Input value={settings.orderPrefix} onChange={(e) => handleChange('orderPrefix', e.target.value)} placeholder="AG2026" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Invoice Number Prefix</label>
                <Input value={settings.invoicePrefix} onChange={(e) => handleChange('invoicePrefix', e.target.value)} placeholder="INV2026" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Default Shipping Charge (₹)</label>
                <Input type="number" value={settings.defaultShippingCharge} onChange={(e) => handleChange('defaultShippingCharge', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" size="lg" className="font-bold" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Business Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
