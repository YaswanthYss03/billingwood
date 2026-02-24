'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  TrendingUp,
  DollarSign,
  Package,
  Lock,
  Edit,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function VendorsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <VendorsContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  isActive: boolean;
  purchases?: any[];
}

function VendorsContent() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const { canAccessVendors } = useBusinessFeatures();

  const accessCheck = canAccessVendors();

  useEffect(() => {
    if (accessCheck.canAccess) {
      loadVendors();
    } else {
      setLoading(false);
    }
  }, [showInactive, accessCheck.canAccess]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const response = await api.vendors.list(showInactive);
      setVendors(response.data || []);
    } catch (error: any) {
      console.error('Failed to load vendors:', error);
      toast.error(error.response?.data?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete vendor "${vendorName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.vendors.delete(id);
      toast.success('Vendor deleted successfully');
      loadVendors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.vendors.toggleActive(id);
      toast.success(`Vendor ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      loadVendors();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update vendor status');
    }
  };

  // Feature access check
  if (!accessCheck.canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Vendor Management</h2>
            <p className="text-gray-600 mb-4">{accessCheck.reason}</p>
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Unlock Professional Features:</h3>
              <ul className="text-sm text-left text-gray-600 space-y-1">
                <li>✓ Centralized vendor database</li>
                <li>✓ Track vendor performance and history</li>
                <li>✓ Link vendors to purchase orders</li>
                <li>✓ Payment terms and credit limits</li>
                <li>✓ Vendor analytics and insights</li>
              </ul>
            </div>
            <Link
              href="/subscription/upgrade"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upgrade to Professional
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600 mt-1">Manage your suppliers and vendors</p>
        </div>
        <Link
          href="/vendors/new"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Vendors</span>
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{vendors.length}</div>
          <div className="text-xs text-gray-500 mt-1">
            {vendors.filter(v => v.isActive).length} active
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">With GST</span>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {vendors.filter(v => v.gstNumber).length}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {((vendors.filter(v => v.gstNumber).length / vendors.length) * 100 || 0).toFixed(0)}% of total
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Purchase Orders</span>
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {vendors.reduce((sum, v) => sum + (v.purchases?.length || 0), 0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total POs placed</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vendors by name, contact, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Show Inactive
          </label>
        </div>
      </div>

      {/* Vendors List */}
      {filteredVendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No vendors found' : 'No vendors yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'Start by adding your first vendor to manage suppliers efficiently'}
          </p>
          {!searchTerm && (
            <Link
              href="/vendors/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Your First Vendor
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link href={`/vendors/${vendor.id}`} className="block hover:underline">
                        <div className="font-medium text-gray-900">{vendor.name}</div>
                        {vendor.contactPerson && (
                          <div className="text-sm text-gray-500">{vendor.contactPerson}</div>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {vendor.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-4 h-4" />
                            {vendor.phone}
                          </div>
                        )}
                        {vendor.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            {vendor.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {vendor.city || vendor.state ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {[vendor.city, vendor.state].filter(Boolean).join(', ')}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {vendor.gstNumber || <span className="text-gray-400">-</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          vendor.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="View Details"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/vendors/${vendor.id}/edit`}
                          className="text-gray-600 hover:text-gray-800 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleActive(vendor.id, vendor.isActive)}
                          className={`p-1 ${vendor.isActive ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                          title={vendor.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {vendor.isActive ? '◯' : '●'}
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id, vendor.name)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Professional Badge */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Professional Feature</h3>
            <p className="text-sm text-gray-600">
              Vendor Management helps you maintain supplier relationships, track performance, and streamline purchasing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
