'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LogWastagePage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <LogWastageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface Item {
  id: string;
  name: string;
  sku: string;
  unit: string;
  currentQuantity?: number;
}

interface Batch {
  id: string;
  batchNumber: string;
  currentQuantity: number;
  expiryDate: string;
  costPrice?: string;
}

function LogWastageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const preSelectedBatchId = searchParams.get('batchId');

  const [items, setItems] = useState<Item[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemId: '',
    batchId: preSelectedBatchId || '',
    quantity: '',
    reason: 'EXPIRED',
    notes: '',
  });

  useEffect(() => {
    // Only load items when component mounts and user is authenticated
    if (user) {
      loadItems();
    }
  }, [user]);

  useEffect(() => {
    if (formData.itemId) {
      loadBatches(formData.itemId);
    } else {
      setBatches([]);
      setFormData(prev => ({ ...prev, batchId: '' }));
    }
  }, [formData.itemId]);

  useEffect(() => {
    if (preSelectedBatchId && batches.length > 0) {
      const batch = batches.find(b => b.id === preSelectedBatchId);
      if (batch) {
        // Find the item for this batch
        loadItems();
      }
    }
  }, [preSelectedBatchId, batches]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await api.items.list();
      setItems(response.data || []);
    } catch (error: any) {
      console.error('Failed to load items:', error);
      toast.error('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async (itemId: string) => {
    try {
      setLoading(true);
      const response = await api.inventory.batches(itemId);
      setBatches(response.data || []);
    } catch (error: any) {
      console.error('Failed to load batches:', error);
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstimatedValue = (): number => {
    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) return 0;

    // If a specific batch is selected, use its cost price
    if (formData.batchId && selectedBatch) {
      return quantity * parseFloat(selectedBatch.costPrice || '0');
    }

    // Otherwise, try to get the average cost from available batches
    if (batches.length > 0) {
      const avgCost = batches.reduce((sum, b) => sum + parseFloat(b.costPrice || '0'), 0) / batches.length;
      return quantity * avgCost;
    }

    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemId || !formData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    const quantity = parseFloat(formData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    try {
      setSubmitting(true);
      const estimatedValue = calculateEstimatedValue();
      
      await api.wastage.create({
        itemId: formData.itemId,
        batchId: formData.batchId || undefined,
        quantity,
        reason: formData.reason,
        description: formData.notes || undefined,
        estimatedValue,
      });

      toast.success('Wastage logged successfully');
      router.push('/wastage');
    } catch (error: any) {
      console.error('Failed to log wastage:', error);
      toast.error(error.response?.data?.message || 'Failed to log wastage');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBatch = batches.find(b => b.id === formData.batchId);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/wastage"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wastage Management
        </Link>
        <div className="flex items-center gap-3">
          <div className="bg-red-100 p-3 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Log Wastage</h1>
            <p className="text-gray-600 mt-1">Record inventory loss or wastage</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Item Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.itemId}
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value, batchId: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              disabled={loading}
            >
              <option value="">Select an item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) - {item.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selection (Optional) */}
          {formData.itemId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Batch (Optional)
              </label>
              <select
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading || batches.length === 0}
              >
                <option value="">No specific batch</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchNumber} - Available: {batch.currentQuantity} 
                    {batch.expiryDate && ` - Expires: ${new Date(batch.expiryDate).toLocaleDateString()}`}
                  </option>
                ))}
              </select>
              {selectedBatch && (
                <p className="mt-2 text-sm text-gray-600">
                  Available quantity: <span className="font-semibold">{selectedBatch.currentQuantity}</span>
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter quantity"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            >
              <option value="EXPIRED">Expired</option>
              <option value="DAMAGED">Damaged</option>
              <option value="SPILLAGE">Spillage</option>
              <option value="THEFT">Theft</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Add any additional notes about this wastage..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.push('/wastage')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Logging...' : 'Log Wastage'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Text */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Select a specific batch to deduct from that batch's inventory</li>
          <li>• If no batch is selected, FIFO method will be used</li>
          <li>• The quantity will be automatically deducted from your inventory</li>
          <li>• Make sure to select the correct reason for accurate reporting</li>
        </ul>
      </div>
    </div>
  );
}
