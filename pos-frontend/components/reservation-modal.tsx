'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, Mail, Phone, FileText, UtensilsCrossed, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservation?: any;
  tables?: any[];
}

interface PreOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  price?: number;
}

export function ReservationModal({
  isOpen,
  onClose,
  onSuccess,
  reservation,
  tables = [],
}: ReservationModalProps) {
  const isEditMode = !!reservation;
  const [loading, setLoading] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>(tables);
  const [items, setItems] = useState<any[]>([]);
  const [showPreOrderForm, setShowPreOrderForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tableId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    numberOfPeople: 2,
    reservationDate: '',
    reservationTime: '',
    duration: 120,
    specialRequirements: '',
    preOrderNotes: '',
    notes: '',
  });

  const [preOrderItems, setPreOrderItems] = useState<PreOrderItem[]>([]);
  const [newPreOrderItem, setNewPreOrderItem] = useState({
    itemId: '',
    quantity: 1,
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && reservation) {
        // Populate form with existing reservation data
        const resDate = new Date(reservation.reservationDate);
        const resTime = new Date(reservation.reservationTime);
        
        setFormData({
          tableId: reservation.tableId || '',
          customerName: reservation.customerName || '',
          customerPhone: reservation.customerPhone || '',
          customerEmail: reservation.customerEmail || '',
          numberOfPeople: reservation.numberOfPeople || 2,
          reservationDate: resDate.toISOString().split('T')[0],
          reservationTime: resTime.toTimeString().slice(0, 5),
          duration: reservation.duration || 120,
          specialRequirements: reservation.specialRequirements || '',
          preOrderNotes: reservation.preOrderNotes || '',
          notes: reservation.notes || '',
        });

        if (reservation.preOrderItems) {
          setPreOrderItems(reservation.preOrderItems);
        }
      } else {
        // Set default date/time for new reservations
        const now = new Date();
        now.setHours(now.getHours() + 1); // Default to 1 hour from now
        setFormData(prev => ({
          ...prev,
          reservationDate: now.toISOString().split('T')[0],
          reservationTime: now.toTimeString().slice(0, 5),
        }));
      }

      loadAvailableTables();
      loadItems();
    }
  }, [isOpen, reservation, isEditMode]);

  const loadAvailableTables = async () => {
    try {
      const response = await api.tables.getAvailable();
      if (response.data) {
        setAvailableTables(response.data);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const loadItems = async () => {
    try {
      const response = await api.items.list();
      if (response.data) {
        setItems(response.data);
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numberOfPeople' || name === 'duration' ? parseInt(value) || 0 : value,
    }));
  };

  const handleAddPreOrderItem = () => {
    if (!newPreOrderItem.itemId) {
      toast.error('Please select an item');
      return;
    }

    const item = items.find(i => i.id === newPreOrderItem.itemId);
    if (!item) return;

    const existingIndex = preOrderItems.findIndex(poi => poi.itemId === item.id);

    if (existingIndex >= 0) {
      // Update quantity if item already exists
      const updated = [...preOrderItems];
      updated[existingIndex].quantity += newPreOrderItem.quantity;
      setPreOrderItems(updated);
    } else {
      // Add new item
      setPreOrderItems([
        ...preOrderItems,
        {
          itemId: item.id,
          name: item.name,
          quantity: newPreOrderItem.quantity,
          price: item.price,
        },
      ]);
    }

    setNewPreOrderItem({ itemId: '', quantity: 1 });
    toast.success('Item added to pre-order');
  };

  const handleRemovePreOrderItem = (index: number) => {
    setPreOrderItems(preOrderItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.tableId) {
      toast.error('Please select a table');
      return;
    }

    if (!formData.customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    if (!formData.customerPhone.trim()) {
      toast.error('Please enter customer phone');
      return;
    }

    if (!formData.reservationDate) {
      toast.error('Please select reservation date');
      return;
    }

    if (!formData.reservationTime) {
      toast.error('Please select reservation time');
      return;
    }

    if (formData.numberOfPeople < 1) {
      toast.error('Number of people must be at least 1');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        preOrderItems: preOrderItems.length > 0 ? preOrderItems : undefined,
      };

      if (isEditMode) {
        await api.tables.updateReservation(reservation.id, payload);
        toast.success('Reservation updated successfully!');
      } else {
        await api.tables.createReservation(payload);
        toast.success('Reservation created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save reservation');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isEditMode ? 'Edit Reservation' : 'New Table Reservation'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Table Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <UtensilsCrossed className="h-4 w-4 inline mr-1" />
              Table <span className="text-red-500">*</span>
            </label>
            <select
              name="tableId"
              value={formData.tableId}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">Select a table</option>
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.tableName || `T${table.tableNumber}`} - {table.capacity} seats
                  {table.section && ` (${table.section})`}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                required
                placeholder="John Doe"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                required
                placeholder="+91 98765 43210"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="h-4 w-4 inline mr-1" />
                Email (Optional)
              </label>
              <Input
                type="email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleInputChange}
                placeholder="john@example.com"
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Users className="h-4 w-4 inline mr-1" />
                Number of People <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                name="numberOfPeople"
                value={formData.numberOfPeople}
                onChange={handleInputChange}
                required
                min="1"
                max="50"
                className="w-full"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="reservationDate"
                value={formData.reservationDate}
                onChange={handleInputChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                name="reservationTime"
                value={formData.reservationTime}
                onChange={handleInputChange}
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Duration (minutes)
              </label>
              <Input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="30"
                max="480"
                step="15"
                className="w-full"
              />
            </div>
          </div>

          {/* Special Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="h-4 w-4 inline mr-1" />
              Special Requirements / Arrangements
            </label>
            <textarea
              name="specialRequirements"
              value={formData.specialRequirements}
              onChange={handleInputChange}
              rows={3}
              placeholder="Birthday celebration, wheelchair access, near window seat, etc."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Pre-Order Items (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pre-Order Food (Optional)
              </label>
              <Button
                type="button"
                onClick={() => setShowPreOrderForm(!showPreOrderForm)}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                {showPreOrderForm ? 'Hide' : 'Add Items'}
              </Button>
            </div>

            {showPreOrderForm && (
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newPreOrderItem.itemId}
                    onChange={(e) => setNewPreOrderItem(prev => ({ ...prev, itemId: e.target.value }))}
                    className="col-span-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">Select item...</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - ₹{item.price}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={newPreOrderItem.quantity}
                      onChange={(e) => setNewPreOrderItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      placeholder="Qty"
                      className="w-20"
                    />
                    <Button
                      type="button"
                      onClick={handleAddPreOrderItem}
                      size="sm"
                      className="px-3"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {preOrderItems.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {preOrderItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <span className="text-sm">
                          {item.name} x {item.quantity}
                          {item.price && ` (₹${(item.price * item.quantity).toFixed(2)})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePreOrderItem(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pre-Order Notes
                  </label>
                  <textarea
                    name="preOrderNotes"
                    value={formData.preOrderNotes}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Special preparation instructions..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={2}
              placeholder="Any other information..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Create'} Reservation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
