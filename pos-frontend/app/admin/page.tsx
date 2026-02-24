'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  LogOut,
  Plus,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  businessType: string;
  email: string;
  phone: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionEndDate: string;
  isActive: boolean;
  userCount: number;
  billCount: number;
  createdAt: string;
}

interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  starterTenants: number;
  professionalTenants: number;
  enterpriseTenants: number;
  totalUsers: number;
  totalBills: number;
  totalItems: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editForm, setEditForm] = useState({
    subscriptionPlan: '',
    subscriptionStatus: '',
    subscriptionEndDate: '',
  });
  const [createForm, setCreateForm] = useState({
    name: '',
    businessType: 'RESTAURANT',
    gstNumber: '',
    address: '',
    phone: '',
    email: '',
    ownerName: '',
    ownerEmail: '',
    ownerUsername: '',
    ownerPassword: '',
    ownerPhone: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes] = await Promise.all([
        api.admin.getStats(),
        api.admin.getTenants(),
      ]);
      setStats(statsRes.data);
      setTenants(tenantsRes.data);
    } catch (error: any) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const handleEditSubscription = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditForm({
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionEndDate: tenant.subscriptionEndDate
        ? new Date(tenant.subscriptionEndDate).toISOString().split('T')[0]
        : '',
    });
    setShowEditModal(true);
  };

  const handleSaveSubscription = async () => {
    if (!selectedTenant) return;

    try {
      await api.admin.updateSubscription(selectedTenant.id, editForm);
      toast.success('Subscription updated successfully');
      setShowEditModal(false);
      loadData();
    } catch (error: any) {
      toast.error('Failed to update subscription');
      console.error(error);
    }
  };

  const handleCreateTenant = async () => {
    // Validation
    if (!createForm.name || !createForm.businessType || !createForm.ownerName || 
        !createForm.ownerEmail || !createForm.ownerUsername || !createForm.ownerPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await api.admin.createTenant(createForm);
      toast.success('Tenant and owner created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        businessType: 'RESTAURANT',
        gstNumber: '',
        address: '',
        phone: '',
        email: '',
        ownerName: '',
        ownerEmail: '',
        ownerUsername: '',
        ownerPassword: '',
        ownerPhone: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
      console.error(error);
    }
  };

  const handleToggleStatus = async (tenantId: string) => {
    try {
      await api.admin.toggleTenantStatus(tenantId);
      toast.success('Tenant status updated');
      loadData();
    } catch (error: any) {
      toast.error('Failed to update tenant status');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      TRIAL: 'bg-blue-100 text-blue-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPlanBadge = (plan: string) => {
    const colors = {
      FREE_TRIAL: 'bg-gray-100 text-gray-800',
      STARTER: 'bg-blue-100 text-blue-800',
      PROFESSIONAL: 'bg-purple-100 text-purple-800',
      ENTERPRISE: 'bg-indigo-100 text-indigo-800',
    };
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome back, {user?.name || 'Admin'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Tenant
              </Button>
              <Button
                onClick={loadData}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Refresh Data
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalTenants || 0}</p>
                </div>
                <Building2 className="w-12 h-12 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Tenants</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.activeTenants || 0}</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trial Tenants</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.trialTenants || 0}</p>
                </div>
                <Clock className="w-12 h-12 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-indigo-600">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="w-12 h-12 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Starter Plan</p>
                  <p className="text-2xl font-bold text-blue-600">{stats?.starterTenants || 0}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Professional Plan</p>
                  <p className="text-2xl font-bold text-purple-600">{stats?.professionalTenants || 0}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Enterprise Plan</p>
                  <p className="text-2xl font-bold text-indigo-600">{stats?.enterpriseTenants || 0}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Business Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Users</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Bills</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{tenant.businessType}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanBadge(tenant.subscriptionPlan)}`}>
                          {tenant.subscriptionPlan.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(tenant.subscriptionStatus)}`}>
                          {tenant.subscriptionStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{tenant.userCount}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{tenant.billCount}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditSubscription(tenant)}
                            className="bg-purple-600 hover:bg-purple-700 text-xs"
                          >
                            Edit Plan
                          </Button>
                          <Button
                            size="sm"
                            variant={tenant.isActive ? 'destructive' : 'default'}
                            onClick={() => handleToggleStatus(tenant.id)}
                            className="text-xs"
                          >
                            {tenant.isActive ? 'Suspend' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Subscription Modal */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Subscription - {selectedTenant.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={editForm.subscriptionPlan}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionPlan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="FREE_TRIAL">Free Trial</option>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription Status
                  </label>
                  <select
                    value={editForm.subscriptionStatus}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="TRIAL">Trial</option>
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subscription End Date
                  </label>
                  <input
                    type="date"
                    value={editForm.subscriptionEndDate}
                    onChange={(e) => setEditForm({ ...editForm, subscriptionEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowEditModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSubscription}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-4xl my-8">
              <Card className="shadow-2xl">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Building2 className="w-6 h-6" />
                        Create New Tenant
                      </CardTitle>
                      <p className="text-purple-100 mt-2">
                        Set up a new business with Professional plan and owner access
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
                  <div className="space-y-6">
                    {/* Business Information Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Business Information
                      </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Business Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.name}
                          onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="e.g., Aadayar aanandha Bhavan"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter the legal or trading name of the business</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Business Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={createForm.businessType}
                          onChange={(e) => setCreateForm({ ...createForm, businessType: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                        >
                          <option value="RESTAURANT">🍽️ Restaurant</option>
                          <option value="HOTEL">🏨 Hotel</option>
                          <option value="RETAIL">🛍️ Retail</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          GST Number
                        </label>
                        <input
                          type="text"
                          value={createForm.gstNumber}
                          onChange={(e) => setCreateForm({ ...createForm, gstNumber: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="29AABCU9603R1ZM"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={createForm.email}
                          onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="contact@business.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="text"
                          value={createForm.phone}
                          onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="+91 9876543210"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Address
                        </label>
                        <textarea
                          value={createForm.address}
                          onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          rows={2}
                          placeholder="123 Main Street, City"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owner Credentials Section */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600" />
                      Owner User Credentials
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Owner Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.ownerName}
                          onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="John Doe"
                        />
                        <p className="text-xs text-gray-500 mt-1">Full name of the business owner</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Owner Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={createForm.ownerEmail}
                          onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="owner@business.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Owner Phone
                        </label>
                        <input
                          type="text"
                          value={createForm.ownerPhone}
                          onChange={(e) => setCreateForm({ ...createForm, ownerPhone: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="+91 9876543210"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={createForm.ownerUsername}
                          onChange={(e) => setCreateForm({ ...createForm, ownerUsername: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="johndoe"
                        />
                        <p className="text-xs text-gray-500 mt-1">Login username for the owner</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={createForm.ownerPassword}
                          onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          placeholder="••••••••"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum 8 characters recommended</p>
                      </div>
                    </div>
                  </div>

                  {/* Info Badge */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Activity className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-purple-900 mb-1">
                          Subscription Details
                        </p>
                        <p className="text-sm text-purple-700">
                          The tenant will be created with the <strong>PROFESSIONAL</strong> plan 
                          and <strong>ACTIVE</strong> status with a <strong>30-day trial period</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Footer with Actions */}
              <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t sticky bottom-0 z-10">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      name: '',
                      businessType: 'RESTAURANT',
                      gstNumber: '',
                      address: '',
                      phone: '',
                      email: '',
                      ownerName: '',
                      ownerEmail: '',
                      ownerUsername: '',
                      ownerPassword: '',
                      ownerPhone: '',
                    });
                  }}
                  variant="outline"
                  className="flex-1 py-3 text-base font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateTenant}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3 text-base font-semibold shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Tenant
                </Button>
              </div>
            </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
