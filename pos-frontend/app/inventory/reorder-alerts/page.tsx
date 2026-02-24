'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package,
  Clock,
  ShoppingCart,
  Lock,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function SmartReorderingPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <SmartReorderingContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface ReorderAlert {
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
  currentStock: number;
  reorderLevel: number;
  suggestedPurchaseQuantity: number;
  salesVelocity: {
    period: string;
    totalSold: number;
    averageDailySales: number;
    projectedMonthlySales: number;
  };
  daysOfStockRemaining: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

function SmartReorderingContent() {
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const { canAccessSmartReordering } = useBusinessFeatures();

  const accessCheck = canAccessSmartReordering();

  useEffect(() => {
    if (accessCheck.canAccess) {
      loadReorderAlerts();
    } else {
      setLoading(false);
    }
  }, [accessCheck.canAccess]);

  const loadReorderAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.reordering.alerts();
      setAlerts(response.data || []);
    } catch (error: any) {
      console.error('Failed to load reorder alerts:', error);
      toast.error(error.response?.data?.message || 'Failed to load reorder alerts');
    } finally {
      setLoading(false);
    }
  };

  if (!accessCheck.canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center">
          <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-orange-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Smart Reordering Alerts</h2>
            <p className="text-gray-600 mb-4">{accessCheck.reason}</p>
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Unlock Professional  Features:</h3>
              <ul className="text-sm text-left text-gray-600 space-y-1">
                <li>✓ Automated stock alerts based on sales velocity</li>
                <li>✓ Smart purchase quantity suggestions</li>
                <li>✓ Urgency classification (Critical/High/Medium)</li>
                <li>✓ Sales trend analysis</li>
                <li>✓ Never run out of stock</li>
              </ul>
            </div>
            <Link
              href="/subscription/upgrade"
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors"
            >
              Upgrade to Professional
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredAlerts = filter === 'ALL' 
    ? alerts 
    : alerts.filter(alert => alert.urgency === filter);

  const criticalCount = alerts.filter(a => a.urgency === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.urgency === 'HIGH').length;
  const mediumCount = alerts.filter(a => a.urgency === 'MEDIUM').length;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reorder alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Reordering Alerts</h1>
          <p className="text-gray-600 mt-1">AI-powered inventory replenishment recommendations</p>
        </div>
        <button
          onClick={loadReorderAlerts}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <TrendingUp className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Alerts</span>
            <AlertTriangle className="w-5 h-5 text-gray-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
          <div className="text-xs text-gray-500 mt-1">Items need restocking</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Critical</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          <div className="text-xs text-gray-500 mt-1">≤3 days remaining</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">High Priority</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">{highCount}</div>
          <div className="text-xs text-gray-500 mt-1">4-7 days remaining</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Medium</span>
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">{mediumCount}</div>
          <div className="text-xs text-gray-500 mt-1">8-14 days remaining</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filter by Urgency:</span>
          <div className="flex gap-2">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'ALL' ? 'All items well-stocked!' : `No ${filter.toLowerCase()} alerts`}
          </h3>
          <p className="text-gray-600">
            {filter === 'ALL' 
              ? 'Your inventory levels are healthy. Configure reorder levels in item settings to enable alerts.'
              : `Try viewing other urgency levels or check back later.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.item.id}
              className={`bg-white rounded-lg shadow border p-6 ${
                alert.urgency === 'CRITICAL' ? 'border-l-4 border-l-red-500' :
                alert.urgency === 'HIGH' ? 'border-l-4 border-l-orange-500' :
                'border-l-4 border-l-yellow-500'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {alert.item.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(alert.urgency)}`}>
                      {alert.urgency}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    SKU: {alert.item.sku} | Unit: {alert.item.unit}
                  </div>
                </div>
                <Link
                  href={`/purchases/new?itemId=${alert.item.id}&quantity=${alert.suggestedPurchaseQuantity}`}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create PO
                </Link>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                {/* Current Stock */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-600" />
                    <div className="text-xs text-gray-600">Current Stock</div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {alert.currentStock} {alert.item.unit}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Reorder at: {alert.reorderLevel} {alert.item.unit}
                  </div>
                </div>

                {/* Days Remaining */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <div className="text-xs text-gray-600">Days Remaining</div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    alert.daysOfStockRemaining <= 3 ? 'text-red-600' :
                    alert.daysOfStockRemaining <= 7 ? 'text-orange-600' :
                    'text-yellow-600'
                  }`}>
                    {alert.daysOfStockRemaining}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">At current sales rate</div>
                </div>

                {/* Sales Velocity */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-600" />
                    <div className="text-xs text-gray-600">Avg Daily Sales</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {alert.salesVelocity.averageDailySales.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {alert.salesVelocity.period}
                  </div>
                </div>

                {/* Suggested Purchase */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                    <div className="text-xs text-blue-600 font-medium">Suggested Purchase</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {alert.suggestedPurchaseQuantity}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    ~15 days supply
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Projected Monthly Sales:</span> {alert.salesVelocity.projectedMonthlySales.toFixed(0)} {alert.item.unit}
                  <span className="mx-2">•</span>
                  <span className="font-medium">Total Sold:</span> {alert.salesVelocity.totalSold} {alert.item.unit} ({alert.salesVelocity.period})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Professional Badge */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-orange-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Professional Feature</h3>
            <p className="text-sm text-gray-600">
              Smart Reordering uses AI to analyze sales patterns and suggest optimal purchase quantities
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
