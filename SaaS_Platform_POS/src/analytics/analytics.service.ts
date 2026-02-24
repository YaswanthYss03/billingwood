import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get revenue trends with forecasting
   */
  async getRevenueTrends(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        billedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        totalAmount: true,
        subtotal: true,
        taxAmount: true,
        discount: true,
        billedAt: true,
      },
      orderBy: { billedAt: 'asc' },
    });

    // Group by time period
    const grouped = this.groupByPeriod(bills, groupBy);

    // Calculate simple linear regression for forecasting
    const forecast = this.forecastRevenue(grouped);

    return {
      periods: grouped,
      forecast,
      summary: {
        totalRevenue: bills.reduce((sum, b) => sum + Number(b.totalAmount), 0),
        totalDiscount: bills.reduce((sum, b) => sum + Number(b.discount), 0),
        averageBillValue: bills.length > 0 
          ? bills.reduce((sum, b) => sum + Number(b.totalAmount), 0) / bills.length
          : 0,
        totalBills: bills.length,
      },
    };
  }

  /**
   * Get profit margin analysis 
   */
  async getProfitMarginAnalysis(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        billedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            batches: {
              include: {
                batch: true,
              },
            },
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;

    for (const bill of bills) {
      totalRevenue += Number(bill.totalAmount);

      for (const item of bill.items) {
        for (const batchItem of item.batches) {
          totalCost += Number(batchItem.batch.costPrice) * Number(batchItem.quantityUsed);
        }
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const grossMarginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      profit: grossProfit,
      profitMargin: grossMarginPercentage,
      itemCount: bills.length,
      averageProfit: bills.length > 0 ? grossProfit / bills.length : 0,
    };
  }

  /**
   * Get item-wise profit analysis
   */
  async getItemProfitAnalysis(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          tenantId,
          status: { not: 'CANCELLED' },
          billedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        item: true,
        batches: {
          include: {
            batch: true,
          },
        },
      },
    });

    const itemAnalysis = new Map<string, any>();

    for (const billItem of billItems) {
      const itemId = billItem.itemId;
      
      if (!itemAnalysis.has(itemId)) {
        itemAnalysis.set(itemId, {
          itemId,
          itemName: billItem.item.name,
          quantitySold: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          profitMargin: 0,
        });
      }

      const analysis = itemAnalysis.get(itemId);
      analysis.quantitySold += Number(billItem.quantity);
      analysis.revenue += Number(billItem.totalAmount);

      for (const batch of billItem.batches) {
        analysis.cost += Number(batch.batch.costPrice) * Number(batch.quantityUsed);
      }

      analysis.profit = analysis.revenue - analysis.cost;
      analysis.profitMargin = analysis.revenue > 0 ? (analysis.profit / analysis.revenue) * 100 : 0;
    }

    const results = Array.from(itemAnalysis.values())
      .sort((a, b) => b.profit - a.profit);

    return {
      items: results,
      summary: {
        totalItems: results.length,
        topPerformer: results[0],
        bottomPerformer: results[results.length - 1],
      },
    };
  }

  /**
   * Get peak hours analysis
   */
  async getPeakHoursAnalysis(tenantId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        billedAt: { gte: startDate },
      },
      select: {
        billedAt: true,
        totalAmount: true,
      },
    });

    const hourlyData = new Array(24).fill(0).map((_, hour) => ({
      hour,
      billCount: 0,
      revenue: 0,
      averageRevenue: 0,
    }));

    for (const bill of bills) {
      const hour = new Date(bill.billedAt).getHours();
      hourlyData[hour].billCount++;
      hourlyData[hour].revenue += Number(bill.totalAmount);
    }

    // Calculate average revenue per hour
    hourlyData.forEach((data) => {
      data.averageRevenue = data.billCount > 0 ? data.revenue / data.billCount : 0;
    });

    const peakHour = hourlyData.reduce((max, current) => 
      current.revenue > max.revenue ? current : max
    );

    // Map to frontend expected format
    const hours = hourlyData
      .filter(h => h.billCount > 0)
      .map(h => ({
        hour: h.hour,
        orderCount: h.billCount,
        totalRevenue: h.revenue,
        averageOrderValue: h.averageRevenue,
        recommendation: this.getPeakHourRecommendation(h.hour),
      }));

    return {
      hours,
      hourlyData,
      peakHour: {
        hour: peakHour.hour,
        orderCount: peakHour.billCount,
        totalRevenue: peakHour.revenue,
        averageOrderValue: peakHour.averageRevenue,
        recommendation: this.getPeakHourRecommendation(peakHour.hour),
      },
      recommendation: this.getPeakHourRecommendation(peakHour.hour),
    };
  }

  /**
   * Get customer lifetime value and retention analysis
   */
  async getCustomerRetentionAnalysis(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        bills: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            billedAt: true,
            totalAmount: true,
          },
        },
      },
    });

    const analysis = customers.map((customer) => {
      const bills = customer.bills;
      const totalSpent = bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
      const visitCount = bills.length;
      
      const firstVisit = bills.length > 0 
        ? new Date(Math.min(...bills.map(b => new Date(b.billedAt).getTime())))
        : null;
      
      const lastVisit = bills.length > 0
        ? new Date(Math.max(...bills.map(b => new Date(b.billedAt).getTime())))
        : null;

      const daysSinceFirstVisit = firstVisit
        ? Math.floor((Date.now() - firstVisit.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        customerId: customer.id,
        customerName: customer.name,
        tier: customer.tier,
        lifetimeValue: totalSpent,
        visitCount,
        firstVisit,
        lastVisit,
        daysSinceFirstVisit,
        averageOrderValue: visitCount > 0 ? totalSpent / visitCount : 0,
      };
    });

    const topCustomers = analysis
      .sort((a, b) => b.lifetimeValue - a.lifetimeValue)
      .slice(0, 20);

    const averageLTV = analysis.length > 0
      ? analysis.reduce((sum, c) => sum + c.lifetimeValue, 0) / analysis.length
      : 0;

    return {
      topCustomers,
      averageLTV,
      totalCustomers: analysis.length,
      repeatCustomers: analysis.filter(c => c.visitCount > 1).length,
      repeatRate: analysis.length > 0
        ? (analysis.filter(c => c.visitCount > 1).length / analysis.length) * 100
        : 0,
    };
  }

  /**
   * Get category performance analysis
   */
  async getCategoryPerformance(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ) {
    const categories = await this.prisma.category.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            billItems: {
              where: {
                bill: {
                  status: { not: 'CANCELLED' },
                  billedAt: {
                    gte: startDate,
                    lte: endDate,
                  },
                },
              },
            },
          },
        },
      },
    });

    const performance = categories.map((category) => {
      const revenue = category.items.reduce((sum, item) => {
        return sum + item.billItems.reduce((itemSum, billItem) => {
          return itemSum + Number(billItem.totalAmount);
        }, 0);
      }, 0);

      const quantitySold = category.items.reduce((sum, item) => {
        return sum + item.billItems.reduce((itemSum, billItem) => {
          return itemSum + Number(billItem.quantity);
        }, 0);
      }, 0);

      return {
        categoryId: category.id,
        category: category.name,
        categoryName: category.name,
        revenue,
        itemsSold: quantitySold,
        quantitySold,
        uniqueItems: category.items.length,
        itemCount: category.items.length,
        averagePrice: quantitySold > 0 ? revenue / quantitySold : 0,
        revenuePercentage: 0, // Will be calculated after sorting
      };
    });

    const sorted = performance.sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((sum, p) => sum + p.revenue, 0);
    
    // Calculate revenue percentage
    sorted.forEach(p => {
      p.revenuePercentage = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
    });

    return { categories: sorted };
  }

  /**
   * Get comparative reports (this month vs last month, this year vs last year)
   */
  async getComparativeReports(tenantId: string) {
    const now = new Date();
    
    // This month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    // This year
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const thisYearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    
    // Last year
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    const [thisMonth, lastMonth, thisYear, lastYear] = await Promise.all([
      this.getPeriodStats(tenantId, thisMonthStart, thisMonthEnd),
      this.getPeriodStats(tenantId, lastMonthStart, lastMonthEnd),
      this.getPeriodStats(tenantId, thisYearStart, thisYearEnd),
      this.getPeriodStats(tenantId, lastYearStart, lastYearEnd),
    ]);

    return {
      thisMonth: {
        revenue: thisMonth.revenue,
        bills: thisMonth.billCount,
        averageOrderValue: thisMonth.averageOrderValue,
      },
      lastMonth: {
        revenue: lastMonth.revenue,
        bills: lastMonth.billCount,
        averageOrderValue: lastMonth.averageOrderValue,
      },
      monthOverMonth: {
        revenueGrowth: this.calculateGrowth(thisMonth.revenue, lastMonth.revenue),
        billGrowth: this.calculateGrowth(thisMonth.billCount, lastMonth.billCount),
        aovGrowth: this.calculateGrowth(thisMonth.averageOrderValue, lastMonth.averageOrderValue),
      },
      thisYear: {
        revenue: thisYear.revenue,
        bills: thisYear.billCount,
        averageOrderValue: thisYear.averageOrderValue,
      },
      lastYear: {
        revenue: lastYear.revenue,
        bills: lastYear.billCount,
        averageOrderValue: lastYear.averageOrderValue,
      },
      yearOverYear: {
        revenueGrowth: this.calculateGrowth(thisYear.revenue, lastYear.revenue),
        billGrowth: this.calculateGrowth(thisYear.billCount, lastYear.billCount),
        aovGrowth: this.calculateGrowth(thisYear.averageOrderValue, lastYear.averageOrderValue),
      },
    };
  }

  /**
   * Get dead stock identification (items not selling for 30+ days)
   */
  async getDeadStockAnalysis(tenantId: string, daysThreshold = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        billItems: {
          where: {
            bill: {
              status: { not: 'CANCELLED' },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const deadStock = [];
    const activeStock = [];

    for (const item of items) {
      const lastSold = item.billItems[0]?.createdAt;
      const daysSinceLastSale = lastSold
        ? Math.floor((Date.now() - new Date(lastSold).getTime()) / (1000 * 60 * 60 * 24))
        : 999; // Never sold

      const stockData = {
        itemId: item.id,
        itemName: item.name,
        category: item.category.name,
        price: Number(item.price),
        lastSoldDate: lastSold,
        daysSinceLastSale,
        status: item.billItems.length === 0 ? 'NEVER_SOLD' : 'SLOW_MOVING',
      };

      if (daysSinceLastSale >= daysThreshold) {
        deadStock.push(stockData);
      } else {
        activeStock.push(stockData);
      }
    }

    return {
      deadStock: deadStock.sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale),
      activeStock,
      summary: {
        totalItems: items.length,
        deadStockCount: deadStock.length,
        deadStockPercentage: items.length > 0 ? (deadStock.length / items.length) * 100 : 0,
        neverSoldCount: deadStock.filter(s => s.status === 'NEVER_SOLD').length,
      },
    };
  }

  /**
   * ABC Analysis - classify items by revenue contribution (80-20 rule)
   */
  async getABCAnalysis(tenantId: string, startDate: Date, endDate: Date) {
    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          tenantId,
          status: { not: 'CANCELLED' },
          billedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        item: {
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Aggregate revenue per item
    const itemRevenue = new Map<string, any>();

    for (const billItem of billItems) {
      const itemId = billItem.itemId;
      
      if (!itemRevenue.has(itemId)) {
        itemRevenue.set(itemId, {
          itemId,
          itemName: billItem.item.name,
          category: billItem.item.category.name,
          revenue: 0,
          quantitySold: 0,
        });
      }

      const data = itemRevenue.get(itemId);
      data.revenue += Number(billItem.totalAmount);
      data.quantitySold += Number(billItem.quantity);
    }

    // Sort by revenue descending
    const sortedItems = Array.from(itemRevenue.values()).sort((a, b) => b.revenue - a.revenue);
    
    const totalRevenue = sortedItems.reduce((sum, item) => sum + item.revenue, 0);
    let cumulativeRevenue = 0;
    let cumulativePercentage = 0;

    const classifiedItems = sortedItems.map((item, index) => {
      cumulativeRevenue += item.revenue;
      cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A'; // Top 80% of revenue (typically 20% of items)
      } else if (cumulativePercentage <= 95) {
        classification = 'B'; // Next 15% of revenue (typically 30% of items)
      } else {
        classification = 'C'; // Last 5% of revenue (typically 50% of items)
      }

      return {
        ...item,
        classification,
        revenuePercentage: (item.revenue / totalRevenue) * 100,
        cumulativePercentage,
        rank: index + 1,
      };
    });

    const classA = classifiedItems.filter(i => i.classification === 'A');
    const classB = classifiedItems.filter(i => i.classification === 'B');
    const classC = classifiedItems.filter(i => i.classification === 'C');

    return {
      items: classifiedItems,
      summary: {
        totalItems: classifiedItems.length,
        totalRevenue,
        classA: {
          count: classA.length,
          percentage: (classA.length / classifiedItems.length) * 100,
          revenue: classA.reduce((sum, i) => sum + i.revenue, 0),
          revenuePercentage: (classA.reduce((sum, i) => sum + i.revenue, 0) / totalRevenue) * 100,
        },
        classB: {
          count: classB.length,
          percentage: (classB.length / classifiedItems.length) * 100,
          revenue: classB.reduce((sum, i) => sum + i.revenue, 0),
          revenuePercentage: (classB.reduce((sum, i) => sum + i.revenue, 0) / totalRevenue) * 100,
        },
        classC: {
          count: classC.length,
          percentage: (classC.length / classifiedItems.length) * 100,
          revenue: classC.reduce((sum, i) => sum + i.revenue, 0),
          revenuePercentage: (classC.reduce((sum, i) => sum + i.revenue, 0) / totalRevenue) * 100,
        },
      },
      recommendations: {
        classA: 'Focus on maintaining stock levels and quality. These items drive 80% of revenue.',
        classB: 'Monitor regularly. Potential to become Class A items with proper marketing.',
        classC: 'Consider discontinuing slow movers or running promotions to clear stock.',
      },
    };
  }

  /**
   * Seasonal trend detection - identify which items sell more in specific months
   */
  async getSeasonalTrends(tenantId: string, yearsBack = 2) {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - yearsBack);

    const billItems = await this.prisma.billItem.findMany({
      where: {
        bill: {
          tenantId,
          status: { not: 'CANCELLED' },
          billedAt: { gte: startDate },
        },
      },
      include: {
        item: {
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        bill: {
          select: {
            billedAt: true,
          },
        },
      },
    });

    // Group by item and month
    const seasonalData = new Map<string, any>();

    for (const billItem of billItems) {
      const itemId = billItem.itemId;
      const month = new Date(billItem.bill.billedAt).getMonth(); // 0-11

      if (!seasonalData.has(itemId)) {
        seasonalData.set(itemId, {
          itemId,
          itemName: billItem.item.name,
          category: billItem.item.category.name,
          monthlyData: Array(12).fill(0).map((_, idx) => ({
            month: idx,
            monthName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx],
            quantity: 0,
            revenue: 0,
          })),
        });
      }

      const data = seasonalData.get(itemId);
      data.monthlyData[month].quantity += Number(billItem.quantity);
      data.monthlyData[month].revenue += Number(billItem.totalAmount);
    }

    // Analyze seasonality for each item
    const seasonalItems = Array.from(seasonalData.values()).map((item) => {
      const avgMonthlyQuantity = item.monthlyData.reduce((sum: number, m: any) => sum + m.quantity, 0) / 12;
      
      // Find peak months (> 150%  of average)
      const peakMonths = item.monthlyData
        .filter((m: any) => m.quantity > avgMonthlyQuantity * 1.5)
        .map((m: any) => m.monthName);

      // Find low months (< 50% of average)
      const lowMonths = item.monthlyData
        .filter((m: any) => m.quantity < avgMonthlyQuantity * 0.5 && m.quantity > 0)
        .map((m: any) => m.monthName);

      const totalRevenue = item.monthlyData.reduce((sum: number, m: any) => sum + m.revenue, 0);

      return {
        ...item,
        totalRevenue,
        peakMonths,
        lowMonths,
        seasonalityScore: peakMonths.length > 0 ? 'HIGH' : lowMonths.length > 0 ? 'MODERATE' : 'LOW',
      };
    });

    // Filter only items with seasonal patterns
    const seasonalFiltered = seasonalItems.filter(item => 
      item.peakMonths.length > 0 || item.lowMonths.length > 0
    ).sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      seasonalItems: seasonalFiltered,
      summary: {
        totalItemsAnalyzed: seasonalItems.length,
        itemsWithSeasonality: seasonalFiltered.length,
        highSeasonalityItems: seasonalItems.filter(i => i.seasonalityScore === 'HIGH').length,
      },
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async getPeriodStats(tenantId: string, startDate: Date, endDate: Date) {
    const bills = await this.prisma.bill.findMany({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        billedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const revenue = bills.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const billCount = bills.length;

    return {
      revenue,
      billCount,
      averageOrderValue: billCount > 0 ? revenue / billCount : 0,
    };
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  private groupByPeriod(bills: any[], groupBy: 'day' | 'week' | 'month') {
    const grouped = new Map<string, any>();

    for (const bill of bills) {
      const date = new Date(bill.billedAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          period: key,
          revenue: 0,
          bills: 0,
          orderCount: 0,
          discount: 0,
        });
      }

      const group = grouped.get(key);
      group.revenue += Number(bill.totalAmount);
      group.bills += 1;
      group.orderCount += 1;
      group.discount += Number(bill.discount);
    }

    return Array.from(grouped.values()).sort((a, b) => 
      a.period.localeCompare(b.period)
    );
  }

  private forecastRevenue(historicalData: any[]) {
    if (historicalData.length < 3) {
      return { message: 'Insufficient data for forecasting' };
    }

    // Simple linear regression
    const n = historicalData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    historicalData.forEach((data, index) => {
      sumX += index;
      sumY += data.revenue;
      sumXY += index * data.revenue;
      sumX2 += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Forecast next 7 periods
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const x = n + i;
      forecast.push({
        period: i + 1,
        predictedRevenue: Math.max(0, intercept + slope * x),
      });
    }

    return {
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      forecast,
    };
  }

  private getPeakHourRecommendation(hour: number) {
    if (hour >= 12 && hour <= 14) {
      return 'Lunch rush: Ensure adequate staffing during 12 PM - 2 PM';
    } else if (hour >= 19 && hour <= 21) {
      return 'Dinner rush: Schedule more staff for 7 PM - 9 PM';
    } else if (hour >= 7 && hour <= 9) {
      return 'Morning rush: Optimize breakfast preparation';
    } else {
      return `Peak hour at ${hour}:00. Consider special promotions during this time.`;
    }
  }
}
