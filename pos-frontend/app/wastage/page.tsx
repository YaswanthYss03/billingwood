'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { api } from '@/lib/api';
import { useBusinessFeatures } from '@/hooks/use-business-features';
import { 
  AlertTriangle, 
  TrendingDown,
  Trash2,
  Package,
  Calendar,
  DollarSign,
  Lock,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function WastageTrackingPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <WastageContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface ExpiringItem {
  batchId: string;
  batchNumber: string;
  item: {
    id: string;
    name: string;
    sku: string;
    unit: string;
    price: number;
  };
  currentQuantity: number;
  expiryDate: string;
  daysUntilExpiry: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedValue: number;
  suggestedDiscount: number;
}

interface WastageSummary {
  period: string;
  totalWastageLogs: number;
  totalValue: number;
  byReason: Array<{
    reason: string;
    count: number;
    value: number;
  }>;
}

function WastageContent() {
  const [expiringItems, setExpiringItems] = useState<ExpiringItem[]>([]);
  const [summary, setSummary] = useState<WastageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState(30);
  const { canAccessWastageTracking } = useBusinessFeatures();

  const accessCheck = canAccessWastageTracking();

  useEffect(() => {
    // Wait for auth to complete before loading data
    if (accessCheck.canAccess) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [daysThreshold, accessCheck.canAccess]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [expiringRes, summaryRes] = await Promise.all([
        api.wastage.expiringItems(daysThreshold),
        api.wastage.summary(30),
      ]);
      setExpiringItems(expiringRes.data || []);
      setSummary(summaryRes.data);
    } catch (error: any) {
      console.error('Failed to load wastage data:', error);
      toast.error(error.response?.data?.message || 'Failed to load wastage data');
    } finally {
      setLoading(false);
    }
  };

  if (!accessCheck.canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md text-center">
          <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-8">
            <Lock className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Wastage Tracking</h2>
            <p className="text-gray-600 mb-4">{accessCheck.reason}</p>
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Unlock Professional Features:</h3>
              <ul className="text-sm text-left text-gray-600 space-y-1">
                <li>✓ Track expired and damaged inventory</li>
                <li>✓ Expiry alerts with discount suggestions</li>
                <li>✓ Wastage analysis by reason</li>
                <li>✓ Financial impact tracking</li>
                <li>✓ Reduce losses through insights</li>
              </ul>
            </div>
            <Link
              href="/subscription/upgrade"
              className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
            >
              Upgrade to Professional
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wastage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Wastage & Expiry Management</h1>
          <p className="text-gray-600 mt-1">Track and reduce inventory losses</p>
        </div>
        <Link
          href="/wastage/log"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          <Plus className="w-5 h-5" />
          Log Wastage
        </Link>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Wastage Logs</span>
              <Trash2 className="w-5 h-5 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{summary.totalWastageLogs}</div>
            <div className="text-xs text-gray-500 mt-1">{summary.period}</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Loss Value</span>
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">
              ₹{summary.totalValue.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">Financial impact</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Items Expiring Soon</span>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{expiringItems.length}</div>
            <div className="text-xs text-gray-500 mt-1">Next {daysThreshold} days</div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Top Reason</span>
              <TrendingDown className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-600">
              {summary.byReason[0]?.reason || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {summary.byReason[0]?.count || 0} incidents
            </div>
          </div>
        </div>
      )}

      {/* Wastage by Reason */}
      {summary && summary.byReason.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Wastage Analysis by Reason</h3>
          <div className="space-y-3">
            {summary.byReason.map((reason, index) => {
              const percentage = (reason.value / summary.totalValue) * 100;
              const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-purple-500'];
              return (
                <div key={reason.reason}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{reason.reason}</span>
                    <div className="text-right">
                      <span className="font-semibold text-gray-900">
                        ₹{reason.value.toLocaleString()}
                      </span>
                      <span className="text-gray-500 ml-2">({reason.count} incidents)</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`${colors[index % colors.length]} h-2 rounded-full`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expiry Filter */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Show items expiring in:</span>
          <div className="flex gap-2">
            {[7, 14, 30, 60].map((days) => (
              <button
                key={days}
                onClick={() => setDaysThreshold(days)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  daysThreshold === days
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expiring Items List */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            Items Expiring Soon
          </h3>
        </div>
        
        {expiringItems.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No expiring items!</h3>
            <p className="text-gray-600">
              All batches have sufficient time before expiry (&gt;{daysThreshold} days)
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {expiringItems.map((item) => (
              <div key={item.batchId} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900">{item.item.name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(item.urgency)}`}>
                        {item.urgency}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Batch: {item.batchNumber} | SKU: {item.item.sku}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {item.currentQuantity} {item.item.unit}
                    </div>
                    <div className="text-sm text-gray-500">
                      ₹{item.estimatedValue.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Expiry Date</div>
                    <div className="font-semibold text-gray-900">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </div>
                    <div className={`text-xs mt-1 ${
                      item.daysUntilExpiry <= 3 ? 'text-red-600' :
                      item.daysUntilExpiry <= 7 ? 'text-orange-600' :
                      'text-yellow-600'
                    }`}>
                      {item.daysUntilExpiry} days remaining
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="text-xs text-blue-600 font-medium mb-1">Suggested Discount</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(item.suggestedDiscount * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      New Price: ₹{(item.item.price * (1 - item.suggestedDiscount)).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <Link
                      href={`/items/${item.item.id}?applyDiscount=${item.suggestedDiscount}`}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center text-sm"
                    >
                      Apply Discount
                    </Link>
                    <Link
                      href={`/wastage/log?batchId=${item.batchId}`}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-center text-sm"
                    >
                      Log Wastage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Professional Badge */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Professional Feature</h3>
            <p className="text-sm text-gray-600">
              Wastage Tracking helps you minimize losses through early expiry detection and data-driven insights
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
