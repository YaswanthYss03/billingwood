'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Building2, MapPin, Phone, Code, UserPlus, Users, ChevronRight, ChevronLeft } from 'lucide-react';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location?: any;
}

type Step = 'basic' | 'manager' | 'cashiers';

export function LocationModal({ isOpen, onClose, onSuccess, location }: LocationModalProps) {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: location?.name || '',
    code: location?.code || '',
    address: location?.address || '',
    city: location?.city || '',
    state: location?.state || '',
    phone: location?.phone || '',
  });

  const [managerAssignment, setManagerAssignment] = useState<{
    type: 'none' | 'existing' | 'new';
    existingUserId?: string;
    newManager?: {
      name: string;
      email: string;
      username: string;
      phone: string;
      password: string;
    };
  }>({ type: 'none' });

  const [cashierAssignments, setCashierAssignments] = useState<{
    existingUserIds: string[];
    newCashiers: Array<{
      name: string;
      email: string;
      username: string;
      phone: string;
      password: string;
    }>;
  }>({ existingUserIds: [], newCashiers: [] });

  useEffect(() => {
    if (isOpen && !location) {
      loadAvailableUsers();
    }
  }, [isOpen, location]);

  const loadAvailableUsers = async () => {
    try {
      const response = await api.users.list();
      // Filter users who are not assigned to any location, or are managers/cashiers
      const unassignedUsers = response.data.filter((user: any) => 
        !user.locationId && (user.role === 'MANAGER' || user.role === 'CASHIER')
      );
      setAvailableUsers(unassignedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = { ...formData };

      // Add manager assignment
      if (managerAssignment.type === 'existing' && managerAssignment.existingUserId) {
        payload.managerId = managerAssignment.existingUserId;
      } else if (managerAssignment.type === 'new' && managerAssignment.newManager) {
        payload.newManager = {
          ...managerAssignment.newManager,
          role: 'MANAGER',
        };
      }

      // Add cashier assignments
      if (cashierAssignments.existingUserIds.length > 0) {
        payload.cashierIds = cashierAssignments.existingUserIds;
      }
      if (cashierAssignments.newCashiers.length > 0) {
        payload.newCashiers = cashierAssignments.newCashiers.map(c => ({
          ...c,
          role: 'CASHIER',
        }));
      }

      if (location) {
        await api.locations.update(location.id, formData);
        toast.success('Location updated successfully');
      } else {
        await api.locations.create(payload);
        toast.success('Location created successfully');
      }
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('basic');
    setManagerAssignment({ type: 'none' });
    setCashierAssignments({ existingUserIds: [], newCashiers: [] });
    onClose();
  };

  const availableManagers = availableUsers.filter(u => u.role === 'MANAGER');
  const availableCashiers = availableUsers.filter(u => u.role === 'CASHIER');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {location ? 'Edit Location' : 'Add New Location'}
            </h2>
            {!location && (
              <div className="flex items-center gap-2 mt-2">
                <Step step="basic" currentStep={currentStep} label="Location Details" />
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <Step step="manager" currentStep={currentStep} label="Assign Manager" />
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <Step step="cashiers" currentStep={currentStep} label="Assign Cashiers" />
              </div>
            )}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Step 1: Basic Location Details */}
          {currentStep === 'basic' && (
            <BasicLocationForm formData={formData} setFormData={setFormData} />
          )}

          {/* Step 2: Manager Assignment */}
          {currentStep === 'manager' && (
            <ManagerAssignmentForm
              managerAssignment={managerAssignment}
              setManagerAssignment={setManagerAssignment}
              availableManagers={availableManagers}
            />
          )}

          {/* Step 3: Cashier Assignments */}
          {currentStep === 'cashiers' && (
            <CashierAssignmentsForm
              cashierAssignments={cashierAssignments}
              setCashierAssignments={setCashierAssignments}
              availableCashiers={availableCashiers}
            />
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 mt-6">
            {currentStep !== 'basic' && !location && (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 'cashiers') setCurrentStep('manager');
                  else if (currentStep === 'manager') setCurrentStep('basic');
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>

            {currentStep === 'basic' && !location && (
              <button
                type="button"
                onClick={() => setCurrentStep('manager')}
                disabled={!formData.name || !formData.code || !formData.address}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Next: Assign Manager
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStep === 'manager' && !location && (
              <button
                type="button"
                onClick={() => setCurrentStep('cashiers')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next: Assign Cashiers
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {(currentStep === 'cashiers' || location) && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : location ? 'Update Location' : 'Create Location'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Step({ step, currentStep, label }: { step: Step; currentStep: Step; label: string }) {
  const steps: Step[] = ['basic', 'manager', 'cashiers'];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(currentStep);
  
  return (
    <span className={`text-xs font-medium ${
      stepIndex === currentIndex ? 'text-blue-600' :
      stepIndex < currentIndex ? 'text-green-600' : 'text-gray-400'
    }`}>
      {label}
    </span>
  );
}

function BasicLocationForm({ formData, setFormData }: any) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Location Name *
          </div>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Main Store, Madurai Branch"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Location Code *
          </div>
        </label>
        <input
          type="text"
          required
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., MAD-01, ANN-01"
          maxLength={10}
        />
        <p className="text-xs text-gray-500 mt-1">Unique identifier for this location</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address *
          </div>
        </label>
        <textarea
          required
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter full address"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            City *
          </label>
          <input
            type="text"
            required
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="City"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            State *
          </label>
          <input
            type="text"
            required
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="State"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Phone Number
          </div>
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter phone number (optional)"
        />
      </div>
    </div>
  );
}

function ManagerAssignmentForm({ managerAssignment, setManagerAssignment, availableManagers }: any) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Optional:</strong> Assign a manager to this location. Managers can view reports and manage inventory for their assigned location only.
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="managerType"
            checked={managerAssignment.type === 'none'}
            onChange={() => setManagerAssignment({ type: 'none' })}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium text-gray-900">Skip for Now</div>
            <div className="text-sm text-gray-500">Assign a manager later</div>
          </div>
        </label>

        {availableManagers.length > 0 && (
          <label className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="managerType"
              checked={managerAssignment.type === 'existing'}
              onChange={() => setManagerAssignment({ type: 'existing', existingUserId: availableManagers[0]?.id })}
              className="w-4 h-4 text-blue-600 mt-0.5"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Assign Existing Manager</div>
              <div className="text-sm text-gray-500 mb-2">Select from unassigned managers</div>
              {managerAssignment.type === 'existing' && (
                <select
                  value={managerAssignment.existingUserId || ''}
                  onChange={(e) => setManagerAssignment({ ...managerAssignment, existingUserId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {availableManagers.map((manager: any) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name} ({manager.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>
        )}

        <label className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="managerType"
            checked={managerAssignment.type === 'new'}
            onChange={() => setManagerAssignment({
              type: 'new',
              newManager: { name: '', email: '', username: '', phone: '' }
            })}
            className="w-4 h-4 text-blue-600 mt-0.5"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900 mb-2">Create New Manager</div>
            {managerAssignment.type === 'new' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Full Name *"
                  required
                  value={managerAssignment.newManager?.name || ''}
                  onChange={(e) => setManagerAssignment({
                    ...managerAssignment,
                    newManager: { ...managerAssignment.newManager, name: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="email"
                  placeholder="Email *"
                  required
                  value={managerAssignment.newManager?.email || ''}
                  onChange={(e) => setManagerAssignment({
                    ...managerAssignment,
                    newManager: { ...managerAssignment.newManager, email: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Username *"
                  required
                  value={managerAssignment.newManager?.username || ''}
                  onChange={(e) => setManagerAssignment({
                    ...managerAssignment,
                    newManager: { ...managerAssignment.newManager, username: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={managerAssignment.newManager?.phone || ''}
                  onChange={(e) => setManagerAssignment({
                    ...managerAssignment,
                    newManager: { ...managerAssignment.newManager, phone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  required
                  value={managerAssignment.newManager?.password || ''}
                  onChange={(e) => setManagerAssignment({
                    ...managerAssignment,
                    newManager: { ...managerAssignment.newManager, password: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

function CashierAssignmentsForm({ cashierAssignments, setCashierAssignments, availableCashiers }: any) {
  const addNewCashier = () => {
    setCashierAssignments({
      ...cashierAssignments,
      newCashiers: [...cashierAssignments.newCashiers, { name: '', email: '', username: '', phone: '', password: '' }]
    });
  };

  const removeNewCashier = (index: number) => {
    setCashierAssignments({
      ...cashierAssignments,
      newCashiers: cashierAssignments.newCashiers.filter((_: any, i: number) => i !== index)
    });
  };

  const updateNewCashier = (index: number, field: string, value: string) => {
    const updated = [...cashierAssignments.newCashiers];
    updated[index] = { ...updated[index], [field]: value };
    setCashierAssignments({ ...cashierAssignments, newCashiers: updated });
  };

  const toggleExistingCashier = (userId: string) => {
    const ids = cashierAssignments.existingUserIds;
    if (ids.includes(userId)) {
      setCashierAssignments({
        ...cashierAssignments,
        existingUserIds: ids.filter((id: string) => id !== userId)
      });
    } else {
      setCashierAssignments({
        ...cashierAssignments,
        existingUserIds: [...ids, userId]
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Optional:</strong> Assign cashiers to this location. Cashiers can create bills and manage orders at their assigned location.
        </p>
      </div>

      {/* Existing Cashiers */}
      {availableCashiers.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Assign Existing Cashiers</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {availableCashiers.map((cashier: any) => (
              <label key={cashier.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={cashierAssignments.existingUserIds.includes(cashier.id)}
                  onChange={() => toggleExistingCashier(cashier.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{cashier.name}</div>
                  <div className="text-xs text-gray-500">{cashier.email}</div>
                </div>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {cashierAssignments.existingUserIds.length} selected
          </p>
        </div>
      )}

      {/* Create New Cashiers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Create New Cashiers</h4>
          <button
            type="button"
            onClick={addNewCashier}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            Add Cashier
          </button>
        </div>

        {cashierAssignments.newCashiers.length === 0 ? (
          <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No new cashiers added</p>
            <button
              type="button"
              onClick={addNewCashier}
              className="text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              Click to add your first cashier
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cashierAssignments.newCashiers.map((cashier: any, index: number) => (
              <div key={index} className="p-4 border border-gray-300 rounded-lg space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Cashier #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeNewCashier(index)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Full Name *"
                  required
                  value={cashier.name}
                  onChange={(e) => updateNewCashier(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="email"
                  placeholder="Email *"
                  required
                  value={cashier.email}
                  onChange={(e) => updateNewCashier(index, 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Username *"
                  required
                  value={cashier.username}
                  onChange={(e) => updateNewCashier(index, 'username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={cashier.phone}
                  onChange={(e) => updateNewCashier(index, 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  required
                  value={cashier.password}
                  onChange={(e) => updateNewCashier(index, 'password', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
