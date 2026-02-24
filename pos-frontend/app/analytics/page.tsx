'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProtectedRoute } from '@/components/auth-provider';
import { FeatureGuard } from '@/components/feature-guard';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { TrendingUp, DollarSign, Users, Package, Calendar, PieChart, AlertTriangle, BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <FeatureGuard feature="advancedAnalytics">
          <AnalyticsContent />
        </FeatureGuard>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

interface RevenueTrend {
  period: string;
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
}

interface ComparativeReport {
  thisMonth: { revenue: number; bills: number; averageOrderValue: number };
  lastMonth: { revenue: number; bills: number; averageOrderValue: number };
  monthOverMonth: { revenueGrowth: number; billGrowth: number; aovGrowth: number };
  thisYear: { revenue: number; bills: number; averageOrderValue: number };
  lastYear: { revenue: number; bills: number; averageOrderValue: number };
  yearOverYear: { revenueGrowth: number; billGrowth: number; aovGrowth: number };
}

interface ProfitMargin {
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  itemCount: number;
}

interface ItemProfit {
  itemId: string;
  itemName: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

interface PeakHour {
  hour: number;
  orderCount: number;
  totalRevenue: number;
  averageOrderValue: number;
  recommendation: string;
}

interface CustomerRetention {
  totalCustomers: number;
  repeatCustomers: number;
  repeatRate: number;
  averageLifetimeValue: number;
  averageOrdersPerCustomer: number;
  topCustomers: any[];
}

interface CategoryPerformance {
  category: string;
  revenue: number;
  itemsSold: number;
  uniqueItems: number;
  averagePrice: number;
  revenuePercentage: number;
}

interface DeadStockItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  category: string;
  lastSoldDate: string | null;
  daysSinceLastSale: number | null;
  currentStock: number;
  status: 'NEVER_SOLD' | 'SLOW_MOVING';
}

interface ABCItem {
  itemId: string;
  itemName: string;
  revenue: number;
  quantitySold: number;
  revenuePercentage: number;
  cumulativePercentage: number;
  classification: 'A' | 'B' | 'C';
  rank: number;
}

function AnalyticsContent() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  
  // Analytics Data States
  const [revenueTrends, setRevenueTrends] = useState<RevenueTrend[]>([]);
  const [comparativeReports, setComparativeReports] = useState<ComparativeReport | null>(null);
  const [profitMargin, setProfitMargin] = useState<ProfitMargin | null>(null);
  const [itemProfits, setItemProfits] = useState<ItemProfit[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [customerRetention, setCustomerRetention] = useState<CustomerRetention | null>(null);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [deadStock, setDeadStock] = useState<DeadStockItem[]>([]);
  const [abcAnalysis, setABCAnalysis] = useState<ABCItem[]>([]);

  // Calculate date range
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  // Fetch all analytics data
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      
      // Fetch all analytics in parallel
      const [
        revenueTrendsRes,
        comparativeRes,
        profitMarginRes,
        itemProfitRes,
        peakHoursRes,
        customerRetentionRes,
        categoryPerformanceRes,
        deadStockRes,
        abcAnalysisRes,
      ] = await Promise.all([
        api.analytics.revenueTrends(startDate, endDate, 'day'),
        api.analytics.comparativeReports(),
        api.analytics.profitMargin(startDate, endDate),
        api.analytics.itemProfit(startDate, endDate),
        api.analytics.peakHours(30),
        api.analytics.customerRetention(),
        api.analytics.categoryPerformance(startDate, endDate),
        api.analytics.deadStock(30),
        api.analytics.abcAnalysis(startDate, endDate),
      ]);

      setRevenueTrends(revenueTrendsRes.data?.periods || []);
      setComparativeReports(comparativeRes.data);
      setProfitMargin(profitMarginRes.data);
      setItemProfits((itemProfitRes.data?.items || []).slice(0, 5)); // Top 5
      setPeakHours((peakHoursRes.data?.hours || []).sort((a: PeakHour, b: PeakHour) => b.orderCount - a.orderCount).slice(0, 5));
      setCustomerRetention(customerRetentionRes.data);
      setCategoryPerformance(categoryPerformanceRes.data?.categories || []);
      setDeadStock((deadStockRes.data?.deadStockItems || []).slice(0, 10));
      setABCAnalysis((abcAnalysisRes.data?.items || []).filter((item: ABCItem) => item.classification === 'A').slice(0, 5));
      
    } catch (error: any) {
      console.error('Analytics fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600 mt-1">Deep insights into your business performance</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
          <option value="1y">Last Year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Revenue Growth</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {comparativeReports?.monthOverMonth?.revenueGrowth?.toFixed(1) || 0}%
          </div>
          <div className={`text-xs mt-1 ${(comparativeReports?.monthOverMonth?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(comparativeReports?.monthOverMonth?.revenueGrowth || 0) >= 0 ? '↑' : '↓'} vs last month
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Profit Margin</span>
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {profitMargin?.profitMargin?.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ₹{(profitMargin?.profit || 0).toLocaleString()} profit
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Customer Retention</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {customerRetention?.repeatRate?.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {customerRetention?.repeatCustomers || 0} repeat customers
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Dead Stock Items</span>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{deadStock.length}</div>
          <div className="text-xs text-orange-600 mt-1">
            {deadStock.filter(item => item.status === 'NEVER_SOLD').length} never sold
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Revenue Trends</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          {revenueTrends.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 font-medium mb-2 px-2">
                <div>Date</div>
                <div className="text-right">Revenue</div>
                <div className="text-right">Orders</div>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {revenueTrends.slice(-7).reverse().map((trend, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 text-sm p-2 bg-gray-50 rounded">
                    <div className="text-gray-700">{new Date(trend.period).toLocaleDateString()}</div>
                    <div className="text-right font-semibold text-gray-900">
                      ₹{trend.revenue.toLocaleString()}
                    </div>
                    <div className="text-right text-gray-600">{trend.orderCount}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No revenue data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Category Performance</h3>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          {categoryPerformance.length > 0 ? (
            <div className="space-y-4">
              {categoryPerformance.slice(0, 4).map((item, index) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.category}</span>
                      <span className="font-semibold text-gray-900">
                        ₹{item.revenue.toLocaleString()} ({item.revenuePercentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${colors[index % colors.length]} h-2 rounded-full`}
                        style={{ width: `${Math.min(item.revenuePercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No category data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Peak Hours Analysis */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Peak Hours</h3>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          {peakHours.length > 0 ? (
            <div className="space-y-3">
              {peakHours.map((slot) => {
                const maxOrders = Math.max(...peakHours.map(h => h.orderCount));
                const percentage = (slot.orderCount / maxOrders) * 100;
                const hourDisplay = slot.hour === 0 ? '12 AM' : slot.hour < 12 ? `${slot.hour} AM` : slot.hour === 12 ? '12 PM' : `${slot.hour - 12} PM`;
                
                return (
                  <div key={slot.hour} className="flex items-center gap-3">
                    <div className="text-sm text-gray-700 w-20">{hourDisplay}</div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 w-20 text-right">
                      {slot.orderCount} orders
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${
                      slot.recommendation === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      slot.recommendation === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      slot.recommendation === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {slot.recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No peak hours data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Top Performing Items (ABC Analysis - Class A) */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Performing Items (Class A)</h3>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          {itemProfits.length > 0 ? (
            <div className="space-y-3">
              {itemProfits.map((item, index) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{item.itemName}</div>
                      <div className="text-xs text-gray-500">
                        Revenue: ₹{item.revenue.toLocaleString()} | Profit: ₹{item.profit.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${(item.profitMargin ?? 0) > 40 ? 'text-green-600' : 'text-blue-600'}`}>
                      {(item.profitMargin ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">{item.quantitySold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No item profit data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Insights */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Customer Insights</h3>
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {customerRetention?.totalCustomers?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-600">Total Customers</div>
            <div className="text-xs text-gray-500 mt-1">
              {customerRetention?.repeatCustomers || 0} repeat
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-1">
              ₹{customerRetention?.averageLifetimeValue?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-gray-600">Avg. Lifetime Value</div>
            <div className="text-xs text-gray-500 mt-1">
              {customerRetention?.repeatRate?.toFixed(1) || 0}% retention rate
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600 mb-1">
              {customerRetention?.averageOrdersPerCustomer?.toFixed(1) || 0}
            </div>
            <div className="text-sm text-gray-600">Avg. Orders per Customer</div>
            <div className="text-xs text-gray-500 mt-1">Lifetime average</div>
          </div>
        </div>
      </div>

      {/* Dead Stock Alerts */}
      {deadStock.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Dead Stock Alerts</h3>
            </div>
            <span className="text-sm text-orange-600 font-medium">{deadStock.length} items</span>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2 text-xs text-gray-600 font-medium mb-2 px-2">
              <div>Item Name</div>
              <div>Code</div>
              <div>Category</div>
              <div className="text-right">Stock</div>
              <div className="text-right">Status</div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {deadStock.map((item) => (
                <div key={item.itemId} className="grid grid-cols-5 gap-2 text-sm p-2 bg-orange-50 rounded">
                  <div className="text-gray-700 truncate">{item.itemName}</div>
                  <div className="text-gray-600">{item.itemCode}</div>
                  <div className="text-gray-600 truncate">{item.category}</div>
                  <div className="text-right font-semibold text-gray-900">{item.currentStock}</div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded ${
                      item.status === 'NEVER_SOLD' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {item.status === 'NEVER_SOLD' ? 'Never Sold' : `${item.daysSinceLastSale}d`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comparative Reports Summary */}
      {comparativeReports && (
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Comparative Performance</h3>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Month over Month */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Month over Month</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Revenue Growth</span>
                  <span className={`text-lg font-bold ${(comparativeReports.monthOverMonth?.revenueGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(comparativeReports.monthOverMonth?.revenueGrowth ?? 0) >= 0 ? '+' : ''}{(comparativeReports.monthOverMonth?.revenueGrowth ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Order Growth</span>
                  <span className={`text-lg font-bold ${(comparativeReports.monthOverMonth?.billGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(comparativeReports.monthOverMonth?.billGrowth ?? 0) >= 0 ? '+' : ''}{(comparativeReports.monthOverMonth?.billGrowth ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-600">AOV Growth</span>
                  <span className={`text-lg font-bold ${(comparativeReports.monthOverMonth?.aovGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(comparativeReports.monthOverMonth?.aovGrowth ?? 0) >= 0 ? '+' : ''}{(comparativeReports.monthOverMonth?.aovGrowth ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Year over Year */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Year over Year</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Revenue Growth</span>
                  <span className={`text-lg font-bold ${(comparativeReports.yearOverYear?.revenueGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(comparativeReports.yearOverYear?.revenueGrowth ?? 0) >= 0 ? '+' : ''}{(comparativeReports.yearOverYear?.revenueGrowth ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm text-gray-600">Order Growth</span>
                  <span className={`text-lg font-bold ${(comparativeReports.yearOverYear?.billGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(comparativeReports.yearOverYear?.billGrowth ?? 0) >= 0 ? '+' : ''}{(comparativeReports.yearOverYear?.billGrowth ?? 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-gray-600">AOV Growth</span>
                  <span className={`text-lg font-bold ${(comparativeReports.yearOverYear?.aovGrowth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(comparativeReports.yearOverYear?.aovGrowth ?? 0) >= 0 ? '+' : ''}{(comparativeReports.yearOverYear?.aovGrowth ?? 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Feature Badge */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Professional Feature</h3>
            <p className="text-sm text-gray-600">
              Advanced Analytics with AI-powered insights, forecasting, and custom reports - exclusive to Professional and Enterprise plans
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
