import { prisma } from '../../config/prisma';

export class DashboardService {
  async getKpis(outletId?: string, businessId?: string) {
    const isAll = !outletId || outletId === 'all';
    
    // Create base filter. If 'all' is selected, query across all outlets under the business
    const outletFilter = isAll
      ? { outlet: { businessId: businessId || undefined } }
      : { outletId };

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // 1. Calculate Current Month (MTD) Revenue
    const currentOrders = await prisma.order.findMany({
      where: {
        ...outletFilter,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfCurrentMonth },
        deletedAt: null,
      },
      select: {
        id: true,
        totalPaise: true,
      },
    });

    const totalRevenuePaise = currentOrders.reduce((sum, o) => sum + o.totalPaise, 0);

    // 2. Calculate Previous Month Revenue (for comparison)
    const previousOrders = await prisma.order.findMany({
      where: {
        ...outletFilter,
        status: { not: 'CANCELLED' },
        createdAt: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        totalPaise: true,
      },
    });

    const previousRevenuePaise = previousOrders.reduce((sum, o) => sum + o.totalPaise, 0);

    let revenueChange = "0.0%";
    let isRevenuePositive = true;
    if (previousRevenuePaise > 0) {
      const diffPct = ((totalRevenuePaise - previousRevenuePaise) / previousRevenuePaise) * 100;
      revenueChange = `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%`;
      isRevenuePositive = diffPct >= 0;
    } else if (totalRevenuePaise > 0) {
      revenueChange = "+100.0%";
      isRevenuePositive = true;
    }

    // 3. Calculate COGS (Cost of Goods Sold)
    // Gather recipe ingredient costs for all items sold in the current month
    let cogsPaise = 0;
    if (currentOrders.length > 0) {
      const orderIds = currentOrders.map((o) => o.id);
      const orderItems = await prisma.orderItem.findMany({
        where: {
          orderId: { in: orderIds },
        },
        include: {
          menuItem: {
            include: {
              recipes: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      });

      for (const item of orderItems) {
        const recipes = item.menuItem.recipes || [];
        let itemIngredientCostPaise = 0;
        for (const rec of recipes) {
          const cost = rec.item.unitCostPaise;
          const qty = Number(rec.quantityPerUnit);
          itemIngredientCostPaise += Math.round(qty * cost);
        }
        cogsPaise += itemIngredientCostPaise * item.quantity;
      }
    }

    // Add cost of logged waste in the current month
    const currentWaste = await prisma.wasteLog.findMany({
      where: {
        ...outletFilter,
        createdAt: { gte: startOfCurrentMonth },
      },
      select: {
        costAtLoggingPaise: true,
      },
    });
    const wasteCostPaise = currentWaste.reduce((sum, w) => sum + w.costAtLoggingPaise, 0);
    cogsPaise += wasteCostPaise;

    // Calculate COGS change compared to previous month
    let previousCogsPaise = 0;
    if (previousOrders.length > 0) {
      const prevOrderIds = previousOrders.map((o) => o.id);
      const prevOrderItems = await prisma.orderItem.findMany({
        where: {
          orderId: { in: prevOrderIds },
        },
        include: {
          menuItem: {
            include: {
              recipes: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      });

      for (const item of prevOrderItems) {
        const recipes = item.menuItem.recipes || [];
        let itemIngredientCostPaise = 0;
        for (const rec of recipes) {
          const cost = rec.item.unitCostPaise;
          const qty = Number(rec.quantityPerUnit);
          itemIngredientCostPaise += Math.round(qty * cost);
        }
        previousCogsPaise += itemIngredientCostPaise * item.quantity;
      }
    }

    const prevWaste = await prisma.wasteLog.findMany({
      where: {
        ...outletFilter,
        createdAt: {
          gte: startOfPreviousMonth,
          lte: endOfPreviousMonth,
        },
      },
      select: {
        costAtLoggingPaise: true,
      },
    });
    previousCogsPaise += prevWaste.reduce((sum, w) => sum + w.costAtLoggingPaise, 0);

    let cogsChange = "0.0%";
    let isCogsPositive = true; // For COGS, positive change means a reduction in cost (good)
    if (previousCogsPaise > 0) {
      const diffPct = ((cogsPaise - previousCogsPaise) / previousCogsPaise) * 100;
      cogsChange = `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%`;
      isCogsPositive = diffPct <= 0; // standard indicator: negative change (cost reduction) is positive
    }

    // 4. Calculate Gross Profit
    const grossProfitPaise = Math.max(0, totalRevenuePaise - cogsPaise);
    const previousGrossProfitPaise = Math.max(0, previousRevenuePaise - previousCogsPaise);

    let grossProfitChange = "0.0%";
    let isGrossProfitPositive = true;
    if (previousGrossProfitPaise > 0) {
      const diffPct = ((grossProfitPaise - previousGrossProfitPaise) / previousGrossProfitPaise) * 100;
      grossProfitChange = `${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%`;
      isGrossProfitPositive = diffPct >= 0;
    } else if (grossProfitPaise > 0) {
      grossProfitChange = "+100.0%";
      isGrossProfitPositive = true;
    }

    // 5. Calculate Active Staff Count
    const activeStaffCount = await prisma.employee.count({
      where: {
        ...outletFilter,
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    // Compare with previous month active staff
    const previousStaffCount = await prisma.employee.count({
      where: {
        ...outletFilter,
        status: 'ACTIVE',
        createdAt: { lte: endOfPreviousMonth },
        deletedAt: null,
      },
    });

    const diffStaff = activeStaffCount - previousStaffCount;
    const laborChange = `${diffStaff >= 0 ? "+" : ""}${diffStaff}`;
    const isLaborPositive = diffStaff >= 0;

    // 6. Calculate Net Margin % (Profit Margin % = Gross Profit / Total Revenue)
    let netMarginVal = "0.0%";
    let marginChange = "0.0%";
    let isMarginPositive = true;

    if (totalRevenuePaise > 0) {
      const marginPct = (grossProfitPaise / totalRevenuePaise) * 100;
      netMarginVal = `${marginPct.toFixed(1)}%`;
      isMarginPositive = marginPct >= 0;

      // Calculate change in margin percent
      if (previousRevenuePaise > 0) {
        const prevGrossProfitPaise = Math.max(0, previousRevenuePaise - previousCogsPaise);
        const prevMarginPct = (prevGrossProfitPaise / previousRevenuePaise) * 100;
        const diffMargin = marginPct - prevMarginPct;
        marginChange = `${diffMargin >= 0 ? "+" : ""}${diffMargin.toFixed(1)}%`;
      }
    }

    // Format currency helper
    const formatCurrency = (paise: number) => 
      `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

    return {
      totalRevenue: { value: formatCurrency(totalRevenuePaise), change: revenueChange, isPositive: isRevenuePositive },
      cogs: { value: formatCurrency(cogsPaise), change: cogsChange, isPositive: isCogsPositive },
      grossProfit: { value: formatCurrency(grossProfitPaise), change: grossProfitChange, isPositive: isGrossProfitPositive },
      laborCosts: { value: `${activeStaffCount} Staff`, change: laborChange, isPositive: isLaborPositive },
      netMargin: { value: netMarginVal, change: marginChange, isPositive: isMarginPositive },
    };
  }

  async getSalesForecast(outletId?: string, businessId?: string) {
    const isAll = !outletId || outletId === 'all';
    const outletFilter = isAll
      ? { outlet: { businessId: businessId || undefined } }
      : { outletId };

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    // Fetch last 7 days of completed sales
    const last7DaysData: { dateLabel: string; actual: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      
      const dayOrders = await prisma.order.findMany({
        where: {
          ...outletFilter,
          status: { not: 'CANCELLED' },
          createdAt: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
        },
        select: { totalPaise: true }
      });
      
      const revenue = dayOrders.reduce((sum, o) => sum + o.totalPaise, 0) / 100; // in Rupees
      const dateLabel = days[d.getDay()];
      last7DaysData.push({
        dateLabel,
        actual: Math.round(revenue),
      });
    }

    // Moving average for projection
    const totalActualRevenue = last7DaysData.reduce((sum, item) => sum + item.actual, 0);
    const avgRevenue = last7DaysData.length > 0 ? totalActualRevenue / last7DaysData.length : 0;

    // Generate output array with actual and projected values
    const result = last7DaysData.map(item => ({
      date: item.dateLabel,
      actual: item.actual,
      projected: item.actual > 0 ? Math.round(item.actual * 0.95) : 0,
    }));

    // Add next 3 days projections
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const label = `Next ${days[futureDate.getDay()]}`;
      result.push({
        date: label,
        actual: 0,
        projected: Math.round(avgRevenue > 0 ? avgRevenue * (1 + (i * 0.02)) : 0),
      });
    }

    return result;
  }

  async getInventoryForecast(outletId?: string, businessId?: string) {
    const isAll = !outletId || outletId === 'all';
    const outletFilter = isAll
      ? { outlet: { businessId: businessId || undefined } }
      : { outletId };

    const items = await prisma.item.findMany({
      where: {
        ...outletFilter,
        deletedAt: null,
      },
      include: {
        batches: {
          where: {
            expiryDate: { gte: new Date() }
          }
        }
      },
      take: 10,
    });

    return items.map(item => {
      const currentStock = item.batches.reduce((sum, batch) => sum + Number(batch.quantity), 0);
      const threshold = Number(item.reorderThreshold);
      
      // Calculate projected days remaining based on threshold ratios
      let daysRemaining = 0;
      if (currentStock > 0) {
        daysRemaining = threshold > 0 ? (currentStock / threshold) * 5 : 10;
      }
      
      return {
        item: `${item.name} (${item.unit})`,
        currentStock,
        threshold,
        daysRemaining: parseFloat(daysRemaining.toFixed(1)),
      };
    });
  }
}
