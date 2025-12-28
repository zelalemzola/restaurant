/**
 * End-to-End Tests for Complete Inventory Management Workflow
 *
 * This test suite validates the entire inventory management process:
 * 1. Product group creation
 * 2. Product creation with different types (stock, sellable, combination)
 * 3. Stock level monitoring and notifications
 * 4. Stock usage recording
 * 5. Stock adjustments
 * 6. Bulk operations
 */

import mongoose from "mongoose";
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import {
  Product,
  ProductGroup,
  StockTransaction,
  Notification,
} from "@/lib/models";

// Import API route handlers
import {
  GET as getProducts,
  POST as createProduct,
} from "@/app/api/products/route";
import {
  GET as getProductGroups,
  POST as createProductGroup,
} from "@/app/api/product-groups/route";
import { POST as recordStockUsage } from "@/app/api/inventory/usage/route";
import { POST as adjustStock } from "@/app/api/inventory/adjustment/route";
import { GET as getStockLevels } from "@/app/api/inventory/stock-levels/route";
import { GET as getNotifications } from "@/app/api/notifications/route";
import { PATCH as bulkUpdateProducts } from "@/app/api/products/bulk-update/route";

describe("E2E: Complete Inventory Management Workflow", () => {
  let productGroupId: string;
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
    await StockTransaction.deleteMany({});
    await Notification.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up before each test
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await StockTransaction.deleteMany({});
    await Notification.deleteMany({});
  });

  describe("1. Product Group Management", () => {
    it("should create a product group successfully", async () => {
      const groupData = {
        name: "E2E Test Group",
        description: "Test group for E2E inventory management",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/product-groups",
        {
          method: "POST",
          body: JSON.stringify(groupData),
        }
      );

      const response = await createProductGroup(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(groupData.name);

      productGroupId = data.data._id;
    });

    it("should retrieve product groups", async () => {
      // First create a group
      const group = new ProductGroup({
        name: "Test Group",
        description: "Test description",
      });
      const savedGroup = await group.save();
      productGroupId = savedGroup._id.toString();

      const request = new NextRequest(
        "http://localhost:3000/api/product-groups"
      );
      const response = await getProductGroups(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe("Test Group");
    });
  });

  describe("2. Product Creation and Management", () => {
    beforeEach(async () => {
      // Create a product group for testing
      const group = new ProductGroup({
        name: "E2E Product Group",
        description: "Group for product testing",
      });
      const savedGroup = await group.save();
      productGroupId = savedGroup._id.toString();
    });

    it("should create stock, sellable, and combination products", async () => {
      // Create stock product
      const stockProductData = {
        name: "E2E Stock Item",
        groupId: productGroupId,
        type: "stock",
        metric: "kg",
        currentQuantity: 100,
        minStockLevel: 10,
        costPrice: 5.5,
      };

      let request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(stockProductData),
      });

      let response = await createProduct(request);
      let data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("stock");
      stockProductId = data.data._id;

      // Create sellable product
      const sellableProductData = {
        name: "E2E Sellable Item",
        groupId: productGroupId,
        type: "sellable",
        metric: "pieces",
        currentQuantity: 50,
        minStockLevel: 5,
        sellingPrice: 15.99,
      };

      request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(sellableProductData),
      });

      response = await createProduct(request);
      data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("sellable");
      sellableProductId = data.data._id;

      // Create combination product
      const combinationProductData = {
        name: "E2E Combination Item",
        groupId: productGroupId,
        type: "combination",
        metric: "liters",
        currentQuantity: 25,
        minStockLevel: 3,
        costPrice: 8.0,
        sellingPrice: 12.0,
      };

      request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(combinationProductData),
      });

      response = await createProduct(request);
      data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("combination");
      expect(data.data.costPrice).toBe(8.0);
      expect(data.data.sellingPrice).toBe(12.0);
      combinationProductId = data.data._id;
    });

    it("should retrieve all created products", async () => {
      // Create test products first
      await createTestProducts();

      const request = new NextRequest("http://localhost:3000/api/products");
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(3);

      const productTypes = data.data.products.map((p: any) => p.type);
      expect(productTypes).toContain("stock");
      expect(productTypes).toContain("sellable");
      expect(productTypes).toContain("combination");
    });
  });

  describe("3. Stock Level Monitoring", () => {
    beforeEach(async () => {
      await createTestProducts();
    });

    it("should retrieve current stock levels", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/inventory/stock-levels"
      );
      const response = await getStockLevels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.stockLevels).toHaveLength(3);
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.totalItems).toBe(3);
    });

    it("should identify low stock items", async () => {
      // Create a product with low stock
      const lowStockProduct = new Product({
        name: "Low Stock Item",
        groupId: productGroupId,
        type: "stock",
        metric: "pieces",
        currentQuantity: 2, // Below minimum
        minStockLevel: 10,
        costPrice: 5.0,
      });
      await lowStockProduct.save();

      const request = new NextRequest(
        "http://localhost:3000/api/inventory/stock-levels"
      );
      const response = await getStockLevels(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.lowStockItems).toBeGreaterThan(0);

      const lowStockItem = data.data.stockLevels.find(
        (item: any) => item.stockStatus === "low-stock"
      );
      expect(lowStockItem).toBeDefined();
    });
  });

  describe("4. Stock Usage Recording", () => {
    beforeEach(async () => {
      await createTestProducts();
    });

    it("should record stock usage and update quantities", async () => {
      const usageData = {
        productId: stockProductId,
        quantity: 15,
        reason: "E2E test usage",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/inventory/usage",
        {
          method: "POST",
          body: JSON.stringify(usageData),
        }
      );

      const response = await recordStockUsage(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("usage");
      expect(data.data.quantity).toBe(15);

      // Verify product quantity was updated
      const updatedProduct = await Product.findById(stockProductId);
      expect(updatedProduct?.currentQuantity).toBe(85); // 100 - 15
    });

    it("should prevent negative stock quantities", async () => {
      const excessiveUsageData = {
        productId: stockProductId,
        quantity: 150, // More than available (100)
        reason: "Excessive usage test",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/inventory/usage",
        {
          method: "POST",
          body: JSON.stringify(excessiveUsageData),
        }
      );

      const response = await recordStockUsage(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INSUFFICIENT_STOCK");
    });
  });

  describe("5. Stock Adjustments", () => {
    beforeEach(async () => {
      await createTestProducts();
    });

    it("should adjust stock levels with proper tracking", async () => {
      const adjustmentData = {
        productId: stockProductId,
        newQuantity: 120,
        reason: "E2E inventory adjustment",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/inventory/adjustment",
        {
          method: "POST",
          body: JSON.stringify(adjustmentData),
        }
      );

      const response = await adjustStock(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.type).toBe("adjustment");
      expect(data.data.newQuantity).toBe(120);

      // Verify product quantity was updated
      const updatedProduct = await Product.findById(stockProductId);
      expect(updatedProduct?.currentQuantity).toBe(120);
    });
  });

  describe("6. Low Stock Notifications", () => {
    it("should generate notifications for low stock items", async () => {
      // Create a product that will trigger low stock notification
      const lowStockProduct = new Product({
        name: "Low Stock Notification Test",
        groupId: productGroupId,
        type: "stock",
        metric: "pieces",
        currentQuantity: 15,
        minStockLevel: 10,
        costPrice: 5.0,
      });
      const savedProduct = await lowStockProduct.save();

      // Record usage that brings it below minimum
      const usageData = {
        productId: savedProduct._id.toString(),
        quantity: 10, // This should bring it to 5, below minimum of 10
        reason: "Usage to trigger low stock",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/inventory/usage",
        {
          method: "POST",
          body: JSON.stringify(usageData),
        }
      );

      await recordStockUsage(request);

      // Check if notification was created
      const notificationsRequest = new NextRequest(
        "http://localhost:3000/api/notifications"
      );
      const notificationsResponse = await getNotifications(
        notificationsRequest
      );
      const notificationsData = await notificationsResponse.json();

      expect(notificationsResponse.status).toBe(200);
      expect(notificationsData.success).toBe(true);
      expect(notificationsData.data.length).toBeGreaterThan(0);

      const lowStockNotification = notificationsData.data.find(
        (n: any) =>
          n.type === "low-stock" && n.productId === savedProduct._id.toString()
      );
      expect(lowStockNotification).toBeDefined();
    });
  });

  describe("7. Bulk Operations", () => {
    beforeEach(async () => {
      await createTestProducts();
    });

    it("should perform bulk stock adjustments", async () => {
      const bulkUpdateData = {
        productIds: [stockProductId, combinationProductId],
        updates: {
          stockAdjustment: {
            adjustment: 10,
            reason: "Bulk adjustment test",
          },
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/products/bulk-update",
        {
          method: "PATCH",
          body: JSON.stringify(bulkUpdateData),
        }
      );

      const response = await bulkUpdateProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.modifiedCount).toBe(2);

      // Verify products were updated
      const updatedStockProduct = await Product.findById(stockProductId);
      const updatedCombinationProduct = await Product.findById(
        combinationProductId
      );

      expect(updatedStockProduct?.currentQuantity).toBe(110); // 100 + 10
      expect(updatedCombinationProduct?.currentQuantity).toBe(35); // 25 + 10
    });

    it("should perform bulk price updates", async () => {
      const bulkPriceUpdateData = {
        productIds: [stockProductId, combinationProductId],
        updates: {
          costPriceAdjustment: {
            type: "percentage",
            value: 10, // 10% increase
          },
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/products/bulk-update",
        {
          method: "PATCH",
          body: JSON.stringify(bulkPriceUpdateData),
        }
      );

      const response = await bulkUpdateProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify prices were updated
      const updatedStockProduct = await Product.findById(stockProductId);
      const updatedCombinationProduct = await Product.findById(
        combinationProductId
      );

      expect(updatedStockProduct?.costPrice).toBeCloseTo(6.05); // 5.50 * 1.10
      expect(updatedCombinationProduct?.costPrice).toBeCloseTo(8.8); // 8.00 * 1.10
    });
  });
});

// Helper function to create test products
async function createTestProducts() {
  // Create product group
  const group = new ProductGroup({
    name: "E2E Test Group",
    description: "Test group for E2E testing",
  });
  const savedGroup = await group.save();
  productGroupId = savedGroup._id.toString();

  // Create stock product
  const stockProduct = new Product({
    name: "E2E Stock Item",
    groupId: productGroupId,
    type: "stock",
    metric: "kg",
    currentQuantity: 100,
    minStockLevel: 10,
    costPrice: 5.5,
  });
  const savedStockProduct = await stockProduct.save();
  stockProductId = savedStockProduct._id.toString();

  // Create sellable product
  const sellableProduct = new Product({
    name: "E2E Sellable Item",
    groupId: productGroupId,
    type: "sellable",
    metric: "pieces",
    currentQuantity: 50,
    minStockLevel: 5,
    sellingPrice: 15.99,
  });
  const savedSellableProduct = await sellableProduct.save();
  sellableProductId = savedSellableProduct._id.toString();

  // Create combination product
  const combinationProduct = new Product({
    name: "E2E Combination Item",
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
}
