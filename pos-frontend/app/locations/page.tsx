'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { FeatureGuard } from '@/components/feature-guard';
import { LocationModal } from '@/components/location-modal';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, Plus, Building2, Package, TrendingUp } from 'lucide-react';

export default function LocationsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeatureGuard feature="multiLocationManagement">
          <LocationsContent />
        </FeatureGuard>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function LocationsContent() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const response = await api.locations.list();
      setLocations(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Multi-Location Management</h1>
          <p className="text-gray-600 mt-1">Manage all your store locations and inventory</p>
        </div>
        <button
          onClick={() => {
            setSelectedLocation(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Location
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Locations</span>
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{locations.length}</div>
          <div className="text-xs text-gray-500 mt-1">Max: 5 on Professional</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active Locations</span>
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {locations.filter(l => l.isActive).length}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Inventory Value</span>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">₹0</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Pending Transfers</span>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
      </div>

      {/* Locations Grid */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : locations.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center border border-gray-200">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Locations Yet</h3>
          <p className="text-gray-600 mb-4">Create your first location to start managing multiple stores</p>
          <button
            onClick={() => {
              setSelectedLocation(null);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create First Location
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((location) => (
            <div
              key={location.id}
              className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{location.name}</h3>
                      <p className="text-xs text-gray-500">{location.code}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      location.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {location.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{location.address}</span>
                  </div>
                  {location.phone && (
                    <div className="text-sm text-gray-600">
                      📞 {location.phone}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500">Items</div>
                    <div className="text-lg font-semibold text-gray-900">0</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Stock Value</div>
                    <div className="text-lg font-semibold text-gray-900">₹0</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedLocation(location);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 text-sm bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => toast.success('Transfer stock')}
                    className="flex-1 text-sm bg-gray-50 text-gray-600 py-2 rounded-lg hover:bg-gray-100"
                  >
                    Transfer Stock
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Feature Badge */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Professional Feature</h3>
            <p className="text-sm text-gray-600">
              Multi-Location Management is exclusive to Professional and Enterprise plans. Manage up to 5 locations with stock transfers.
            </p>
          </div>
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedLocation(null);
        }}
        onSuccess={loadLocations}
        location={selectedLocation}
      />
    </div>
  );
}
