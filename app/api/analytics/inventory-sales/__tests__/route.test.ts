// Inventory and Sales Analytics API tests
import { NextRequest } from "next/server";
import { GET } from "../route";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import {
  Product,
  ProductGroup,
  SalesTransaction,
  StockTransaction,
} from "@/lib/models";

describe("Inventory and Sales Analytics API Tests", () => {
  let productGroupId: string;
  let productId: string;

  beforeAll(async () => {
    await connectDB();

    // Create test product group
    const group = new ProductGroup({
      name: "Test Analytics Group",
      description: "Test group for analytics testing",
    });
    const savedGroup = await group.save();
    productGroupId = savedGroup._id.toString();

    // Create test product
    const product = new Product({
      name: "Test Analytics Product",
      groupId: productGroupId,
      type: "combination",
      metric: "kg",
      currentQuantity: 50,
      minStockLevel: 10,
      costPrice: 8.5,
      sellingPrice: 15.0,
    });
    const savedProduct = await product.save();
    productId = savedProduct._id.toString();
  });

  afterAll(async () => {
    // Clean up test data
    await SalesTransaction.deleteMany({});
    await StockTransaction.deleteMany({});
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await mongoose.connection.close();
  });

  describe("GET /api/analytics/inventory-sales", () => {
    beforeEach(async () => {
      // Create test sales transaction
      const salesTransaction = new SalesTransaction({
        items: [
          {
            productId: new mongoose.Types.ObjectId(productId),
            quantity: 2,
            unitPrice: 15.0,
            totalPrice: 30.0,
          },
        ],
        totalAmount: 30.0,
        paymentMethod: "Cash",
        userId: new mongoose.Types.ObjectId(),
      });
      await salesTransaction.save();

      // Create test stock transaction
      const stockTransaction = new StockTransaction({
        productId: new mongoose.Types.ObjectId(productId),
        type: "usage",
        quantity: -5,
        previousQuantity: 50,
        newQuantity: 45,
        reason: "Test usage",
        userId: new mongoose.Types.ObjectId(),
      });
      await stockTransaction.save();
    });

    afterEach(async () => {
      await SalesTransaction.deleteMany({});
      await StockTransaction.deleteMany({});
    });

    it("should fetch inventory and sales analytics successfully", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=daily"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.salesTrends).toBeDefined();
      expect(data.data.popularProducts).toBeDefined();
      expect(data.data.paymentMethodDistribution).toBeDefined();
      expect(data.data.inventoryTurnover).toBeDefined();
      expect(data.data.stockUsagePatterns).toBeDefined();
    });

    it("should return sales trends data", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=daily"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.salesTrends.byPeriod).toBeInstanceOf(Array);
      expect(data.data.salesTrends.byProduct).toBeInstanceOf(Array);
    });

    it("should return popular products data", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=daily"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.popularProducts.byQuantity).toBeInstanceOf(Array);
      expect(data.data.popularProducts.byRevenue).toBeInstanceOf(Array);
    });

    it("should return payment method distribution", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=daily"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.paymentMethodDistribution).toBeInstanceOf(Array);
    });

    it("should return inventory turnover data", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=daily"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.inventoryTurnover.byProduct).toBeInstanceOf(Array);
      expect(data.data.inventoryTurnover.summary).toBeDefined();
      expect(
        data.data.inventoryTurnover.summary.totalProducts
      ).toBeGreaterThanOrEqual(0);
    });

    it("should return stock usage patterns", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=daily"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.stockUsagePatterns.byPeriod).toBeInstanceOf(Array);
      expect(data.data.stockUsagePatterns.byProduct).toBeInstanceOf(Array);
    });

    it("should handle different period parameters", async () => {
      const periods = ["daily", "weekly", "monthly"];

      for (const period of periods) {
        const request = new NextRequest(
          `http://localhost:3000/api/analytics/inventory-sales?startDate=2024-01-01&endDate=2024-12-31&period=${period}`
        );
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it("should use default date range when no dates provided", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/analytics/inventory-sales"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
