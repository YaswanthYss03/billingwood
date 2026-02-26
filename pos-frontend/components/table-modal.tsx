'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  table?: {
    id: string;
    tableNumber: string;
    tableName?: string;
    capacity: number;
    section?: string;
    floor?: string;
    positionX?: number;
    positionY?: number;
    layoutZone?: string;
    notes?: string;
  };
  locationId: string;
}

export function TableModal({ isOpen, onClose, onSuccess, table, locationId }: TableModalProps) {
  const [formData, setFormData] = useState({
    tableNumber: '',
    tableName: '',
    capacity: 4,
    section: '',
    floor: '',
    positionX: 0,
    positionY: 0,
    layoutZone: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table) {
      setFormData({
        tableNumber: table.tableNumber,
        tableName: table.tableName || '',
        capacity: table.capacity,
        section: table.section || '',
        floor: table.floor || '',
        positionX: table.positionX || 0,
        positionY: table.positionY || 0,
        layoutZone: table.layoutZone || '',
        notes: table.notes || '',
      });
    } else {
      // Reset form for new table
      setFormData({
        tableNumber: '',
        tableName: '',
        capacity: 4,
        section: '',
        floor: '',
        positionX: 0,
        positionY: 0,
        layoutZone: '',
        notes: '',
      });
    }
  }, [table, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tableNumber || formData.capacity < 1) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      if (table) {
        // Update existing table
        await api.tables.update(table.id, {
          ...formData,
          locationId,
        });
        toast.success('Table updated successfully');
      } else {
        // Create new table
        await api.tables.create({
          ...formData,
          locationId,
        });
        toast.success('Table created successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save table');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {table ? 'Edit Table' : 'Add New Table'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Table Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.tableNumber}
                  onChange={(e) => handleChange('tableNumber', e.target.value)}
                  placeholder="e.g., T1, Table 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Table Name
                </label>
                <Input
                  value={formData.tableName}
                  onChange={(e) => handleChange('tableName', e.target.value)}
                  placeholder="e.g., Window Table"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Capacity <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.capacity}
                  onChange={(e) => handleChange('capacity', parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Section
                </label>
                <Input
                  value={formData.section}
                  onChange={(e) => handleChange('section', e.target.value)}
                  placeholder="e.g., Indoor, Outdoor, VIP"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Floor
                </label>
                <Input
                  value={formData.floor}
                  onChange={(e) => handleChange('floor', e.target.value)}
                  placeholder="e.g., Ground, First"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Layout Zone
                </label>
                <Input
                  value={formData.layoutZone}
                  onChange={(e) => handleChange('layoutZone', e.target.value)}
                  placeholder="e.g., Zone A, Near Kitchen"
                />
              </div>
            </div>

            {/* Position (for future visual editor) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Position X (px)
                </label>
                <Input
                  type="number"
                  value={formData.positionX}
                  onChange={(e) => handleChange('positionX', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Position Y (px)
                </label>
                <Input
                  type="number"
                  value={formData.positionY}
                  onChange={(e) => handleChange('positionY', parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about this table..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         placeholder-gray-400 dark:placeholder-gray-500"
                rows={3}
              />
            </div>

            {/* Form Actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? 'Saving...' : table ? 'Update Table' : 'Create Table'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
