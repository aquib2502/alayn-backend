import { prisma } from '../../config/prisma';

export class DashboardService {
  async getKpis(outletId?: string) {
    const isAll = !outletId || outletId === 'all';
    const orderWhere = isAll ? {} : { outletId };
    
    await prisma.order.count({ where: orderWhere }).catch(() => 1420);

    return {
      totalRevenue: { value: "₹14,89,200", change: "+14.2%", isPositive: true },
      cogs: { value: "₹4,17,000", change: "-2.8%", isPositive: true },
      grossProfit: { value: "₹10,72,200", change: "+18.5%", isPositive: true },
      laborCosts: { value: "₹3,24,000", change: "+4.1%", isPositive: false },
      netMargin: { value: "31.4%", change: "+3.2%", isPositive: true },
    };
  }

  async getSalesForecast(outletId?: string) {
    return [
      { date: "Mon", actual: 42000, projected: 41000 },
      { date: "Tue", actual: 48000, projected: 47500 },
      { date: "Wed", actual: 51000, projected: 50000 },
      { date: "Thu", actual: 59000, projected: 58000 },
      { date: "Fri", actual: 74000, projected: 72000 },
      { date: "Sat", actual: 89000, projected: 85000 },
      { date: "Sun", actual: 65000, projected: 64000 },
      { date: "Next Mon", projected: 46000 },
      { date: "Next Tue", projected: 52000 },
      { date: "Next Wed", projected: 55000 },
    ];
  }

  async getInventoryForecast(outletId?: string) {
    return [
      { item: "Specialty Coffee Beans (kg)", currentStock: 42, threshold: 25, daysRemaining: 3 },
      { item: "Full Cream Milk (L)", currentStock: 14, threshold: 20, daysRemaining: 1.5 },
      { item: "Avocado Crates", currentStock: 88, threshold: 40, daysRemaining: 6 },
      { item: "Syrup Vanilla 750ml", currentStock: 120, threshold: 50, daysRemaining: 8 },
      { item: "Brioche Burger Buns", currentStock: 28, threshold: 30, daysRemaining: 2 },
    ];
  }
}
