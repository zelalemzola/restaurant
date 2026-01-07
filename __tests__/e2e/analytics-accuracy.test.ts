/**
 * End-to-End Tests for Analytics Data Accuracy
 *
 * This test suite validates analytics calculations across different scenarios:
 * 1. Financial analytics (profit/loss calculations)
 * 2. Inventory analytics (turnover rates, usage patterns)
 * 3. Sales analytics (trends, popular products)
 * 4. Dashboard KPI accuracy
 * 5. Cross-scenario data consistency
 */

import mongoose from "mongoose";
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import {
  Product,
  ProductGroup,
  SalesTransaction,
  StockTransaction,
  CostOperation,
} from "@/lib/models";

// Import API route handlers
import { GET as getDashboardAnalytics } from "@/app/api/analytics/dashboard/route";
import { GET as getFinancialAnalytics } from "@/app/api/analytics/financial/route";
import { GET as getInventoryAnalytics } from "@/app/api/analytics/inventory/route";
import { GET as getSalesAnalytics } from "@/app/api/analytics/sales/route";

describe("E2E: Analytics Data Accuracy Across Scenarios", () => {
  let productGroupId: string;
  let stockProductId: string;
  let sellableProductId: string;
  let combinationProductId: string;
  let stockProductId: string;
  let sellableProductId: string;
  let combinationProductId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean up all test data
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await SalesTransaction.deleteMany({});
    await StockTransaction.deleteMany({});
    await CostOperation.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up and create fresh test data
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await SalesTransaction.deleteMany({});
    await StockTransaction.deleteMany({});
    await CostOperation.deleteMany({});

    await createTestData();
  });

  describe("1. Dashboard KPI Accuracy", () => {
    it("should calculate daily sales summary correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard"
      );
      const response = await getDashboardAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.dailySales).toBeDefined();
      expect(data.data.dailySales.totalRevenue).toBeGreaterThan(0);
      expect(data.data.dailySales.transactionCount).toBeGreaterThan(0);
    });

    it("should identify low stock items accurately", async () => {
      // Create a low stock item
      const lowStockProduct = new Product({
        name: "Low Stock Test Item",
        groupId: productGroupId,
        type: "stock",
        metric: "pieces",
        currentQuantity: 2, // Below minimum
        minStockLevel: 10,
        costPrice: 5.0,
      });
      await lowStockProduct.save();

      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard"
      );
      const response = await getDashboardAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.lowStockCount).toBeGreaterThan(0);
      expect(data.data.lowStockItems).toContainEqual(
        expect.objectContaining({
          name: "Low Stock Test Item",
          currentQuantity: 2,
          minStockLevel: 10,
        })
      );
    });

    it("should show recent transactions with correct data", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard"
      );
      const response = await getDashboardAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.recentTransactions).toBeDefined();
      expect(Array.isArray(data.data.recentTransactions)).toBe(true);

      if (data.data.recentTransactions.length > 0) {
        const transaction = data.data.recentTransactions[0];
        expect(transaction.totalAmount).toBeDefined();
        expect(transaction.paymentMethod).toBeDefined();
        expect(transaction.createdAt).toBeDefined();
      }
    });
  });

  describe("2. Financial Analytics Accuracy", () => {
    it("should calculate profit and loss correctly", async () => {
      const today = new Date().toISOString().split("T")[0];
      const request = new NextRequest(
        `http://localhost:3000/api/analytics/financial?startDate=${today}&endDate=${today}`
      );
      const response = await getFinancialAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.totalRevenue).toBeGreaterThan(0);
      expect(data.data.summary.totalCosts).toBeGreaterThan(0);
      expect(data.data.summary.netProfit).toBeDefined();

      // Verify calculation: netProfit = totalRevenue - totalCosts
      const expectedProfit =
        data.data.summary.totalRevenue - data.data.summary.totalCosts;
      expect(data.data.summary.netProfit).toBeCloseTo(expectedProfit, 2);
    });

    it("should include all cost categories in calculations", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/financial"
      );
      const response = await getFinancialAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.costBreakdown).toBeDefined();

      const costCategories = Object.keys(data.data.costBreakdown);
      expect(costCategories).toContain("rent");
      expect(costCategories).toContain("salary");
      expect(costCategories).toContain("utilities");
    });

    it("should calculate profit margins for combination items", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/financial"
      );
      const response = await getFinancialAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      if (data.data.productProfitability) {
        const combinationItemProfit = data.data.productProfitability.find(
          (item: any) => item.productId === combinationProductId
        );

        if (combinationItemProfit) {
          expect(combinationItemProfit.profitMargin).toBeDefined();
          expect(combinationItemProfit.profitMargin).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("3. Inventory Analytics Accuracy", () => {
    it("should calculate inventory turnover rates correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory"
      );
      const response = await getInventoryAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.turnoverRates).toBeDefined();
      expect(Array.isArray(data.data.turnoverRates)).toBe(true);

      if (data.data.turnoverRates.length > 0) {
        const turnoverItem = data.data.turnoverRates[0];
        expect(turnoverItem.productId).toBeDefined();
        expect(turnoverItem.turnoverRate).toBeDefined();
        expect(typeof turnoverItem.turnoverRate).toBe("number");
      }
    });

    it("should track stock usage patterns accurately", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory"
      );
      const response = await getInventoryAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.usagePatterns).toBeDefined();

      if (data.data.usagePatterns.length > 0) {
        const pattern = data.data.usagePatterns[0];
        expect(pattern.productId).toBeDefined();
        expect(pattern.averageDailyUsage).toBeDefined();
        expect(pattern.totalUsage).toBeDefined();
      }
    });

    it("should identify fast and slow moving items", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory"
      );
      const response = await getInventoryAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.movementAnalysis).toBeDefined();
      expect(data.data.movementAnalysis.fastMoving).toBeDefined();
      expect(data.data.movementAnalysis.slowMoving).toBeDefined();
      expect(Array.isArray(data.data.movementAnalysis.fastMoving)).toBe(true);
      expect(Array.isArray(data.data.movementAnalysis.slowMoving)).toBe(true);
    });
  });

  describe("4. Sales Analytics Accuracy", () => {
    it("should calculate sales trends correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/sales"
      );
      const response = await getSalesAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.trends).toBeDefined();
      expect(Array.isArray(data.data.trends)).toBe(true);

      if (data.data.trends.length > 0) {
        const trend = data.data.trends[0];
        expect(trend.date).toBeDefined();
        expect(trend.revenue).toBeDefined();
        expect(trend.transactionCount).toBeDefined();
      }
    });

    it("should rank popular products accurately", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/sales"
      );
      const response = await getSalesAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.popularProducts).toBeDefined();
      expect(Array.isArray(data.data.popularProducts)).toBe(true);

      if (data.data.popularProducts.length > 0) {
        const product = data.data.popularProducts[0];
        expect(product.productId).toBeDefined();
        expect(product.totalQuantitySold).toBeDefined();
        expect(product.totalRevenue).toBeDefined();
        expect(product.transactionCount).toBeDefined();
      }
    });

    it("should calculate payment method distribution correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/sales"
      );
      const response = await getSalesAnalytics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.paymentMethodDistribution).toBeDefined();

      const distribution = data.data.paymentMethodDistribution;
      const totalPercentage = Object.values(distribution).reduce(
        (sum: number, value: any) => sum + value.percentage,
        0
      );
      expect(totalPercentage).toBeCloseTo(100, 1); // Should sum to 100%
    });
  });

  describe("5. Cross-Scenario Data Consistency", () => {
    it("should maintain consistent revenue calculations across all analytics", async () => {
      // Get revenue from different endpoints
      const dashboardRequest = new NextRequest(
        "http://localhost:3000/api/analytics/dashboard"
      );
      const dashboardResponse = await getDashboardAnalytics(dashboardRequest);
      const dashboardData = await dashboardResponse.json();

      const financialRequest = new NextRequest(
        "http://localhost:3000/api/analytics/financial"
      );
      const financialResponse = await getFinancialAnalytics(financialRequest);
      const financialData = await financialResponse.json();

      const salesRequest = new NextRequest(
        "http://localhost:3000/api/analytics/sales"
      );
      const salesResponse = await getSalesAnalytics(salesRequest);
      const salesData = await salesResponse.json();

      // All should return successful responses
      expect(dashboardResponse.status).toBe(200);
      expect(financialResponse.status).toBe(200);
      expect(salesResponse.status).toBe(200);

      // Revenue calculations should be consistent
      const dashboardRevenue = dashboardData.data.dailySales.totalRevenue;
      const financialRevenue = financialData.data.summary.totalRevenue;
      const salesRevenue = salesData.data.summary.totalRevenue;

      expect(dashboardRevenue).toBeCloseTo(financialRevenue, 2);
      expect(financialRevenue).toBeCloseTo(salesRevenue, 2);
    });

    it("should maintain consistent product data across analytics", async () => {
      const inventoryRequest = new NextRequest(
        "http://localhost:3000/api/analytics/inventory"
      );
      const inventoryResponse = await getInventoryAnalytics(inventoryRequest);
      const inventoryData = await inventoryResponse.json();

      const salesRequest = new NextRequest(
        "http://localhost:3000/api/analytics/sales"
      );
      const salesResponse = await getSalesAnalytics(salesRequest);
      const salesData = await salesResponse.json();

      expect(inventoryResponse.status).toBe(200);
      expect(salesResponse.status).toBe(200);

      // Product IDs should be consistent across analytics
      if (
        inventoryData.data.turnoverRates.length > 0 &&
        salesData.data.popularProducts.length > 0
      ) {
        const inventoryProductIds = inventoryData.data.turnoverRates.map(
          (item: any) => item.productId
        );
        const salesProductIds = salesData.data.popularProducts.map(
          (item: any) => item.productId
        );

        // At least some products should appear in both analytics
        const commonProducts = inventoryProductIds.filter((id: string) =>
          salesProductIds.includes(id)
        );
        expect(commonProducts.length).toBeGreaterThan(0);
      }
    });

    it("should handle date range filtering consistently", async () => {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      // Test with same date range across different analytics
      const financialRequest = new NextRequest(
        `http://localhost:3000/api/analytics/financial?startDate=${yesterday}&endDate=${today}`
      );
      const financialResponse = await getFinancialAnalytics(financialRequest);
      const financialData = await financialResponse.json();

      const salesRequest = new NextRequest(
        `http://localhost:3000/api/analytics/sales?startDate=${yesterday}&endDate=${today}`
      );
      const salesResponse = await getSalesAnalytics(salesRequest);
      const salesData = await salesResponse.json();

      expect(financialResponse.status).toBe(200);
      expect(salesResponse.status).toBe(200);

      // Both should respect the date range filter
      expect(financialData.data.dateRange.startDate).toBe(yesterday);
      expect(financialData.data.dateRange.endDate).toBe(today);
      expect(salesData.data.dateRange.startDate).toBe(yesterday);
      expect(salesData.data.dateRange.endDate).toBe(today);
    });
  });
});

// Helper function to create comprehensive test data
async function createTestData() {
  // Create product group
  const group = new ProductGroup({
    name: "Analytics Test Group",
    description: "Group for analytics testing",
  });
  const savedGroup = await group.save();
  productGroupId = savedGroup._id.toString();

  // Create test products
  const stockProduct = new Product({
    name: "Analytics Stock Item",
    groupId: productGroupId,
    type: "stock",
    metric: "kg",
    currentQuantity: 100,
    minStockLevel: 10,
    costPrice: 5.5,
  });
  const savedStockProduct = await stockProduct.save();
  stockProductId = savedStockProduct._id.toString();

  const sellableProduct = new Product({
    name: "Analytics Sellable Item",
    groupId: productGroupId,
    type: "sellable",
    metric: "pieces",
    currentQuantity: 50,
    minStockLevel: 5,
    sellingPrice: 15.99,
  });
  const savedSellableProduct = await sellableProduct.save();
  sellableProductId = savedSellableProduct._id.toString();

  const combinationProduct = new Product({
    name: "Analytics Combination Item",
    groupId: productGroupId,
    type: "combination",
    metric: "liters",
    currentQuantity: 25,
    minStockLevel: 3,
    costPrice: 8.0,
    sellingPrice: 12.0,
  });
  const savedCombinationProduct = await combinationProduct.save();
  combinationProductId = savedCombinationProduct._id.toString();

  // Create test sales transactions
  const salesTransactions = [
    {
      items: [
        {
          productId: sellableProductId,
          quantity: 2,
          unitPrice: 15.99,
          totalPrice: 31.98,
        },
      ],
      totalAmount: 31.98,
      paymentMethod: "Cash",
    },
    {
      items: [
        {
          productId: combinationProductId,
          quantity: 3,
          unitPrice: 12.0,
          totalPrice: 36.0,
        },
      ],
      totalAmount: 36.0,
      paymentMethod: "CBE",
    },
    {
      items: [
        {
          productId: sellableProductId,
          quantity: 1,
          unitPrice: 15.99,
          totalPrice: 15.99,
        },
        {
          productId: combinationProductId,
          quantity: 1,
          unitPrice: 12.0,
          totalPrice: 12.0,
        },
      ],
      totalAmount: 27.99,
      paymentMethod: "POS",
    },
  ];

  for (const transactionData of salesTransactions) {
    const transaction = new SalesTransaction(transactionData);
    await transaction.save();
  }

  // Create test stock transactions
  const stockTransactions = [
    {
      productId: stockProductId,
      type: "usage",
      quantity: 10,
      previousQuantity: 100,
      newQuantity: 90,
      reason: "Analytics test usage",
    },
    {
      productId: combinationProductId,
      type: "sale",
      quantity: 4,
      previousQuantity: 25,
      newQuantity: 21,
      reason: "Sales transaction",
    },
  ];

  for (const transactionData of stockTransactions) {
    const transaction = new StockTransaction(transactionData);
    await transaction.save();
  }

  // Create test cost operations
  const costOperations = [
    {
      description: "Monthly Rent",
      amount: 2000,
      category: "rent",
      type: "recurring",
      recurringPeriod: "monthly",
      date: new Date(),
    },
    {
      description: "Staff Salary",
      amount: 3000,
      category: "salary",
      type: "recurring",
      recurringPeriod: "monthly",
      date: new Date(),
    },
    {
      description: "Electricity Bill",
      amount: 150,
      category: "utilities",
      type: "one-time",
      date: new Date(),
    },
  ];

  for (const costData of costOperations) {
    const cost = new CostOperation(costData);
    await cost.save();
  }
}
