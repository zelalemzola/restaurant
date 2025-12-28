// Product API routes tests
import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { PUT, DELETE } from "../[id]/route";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { Product, ProductGroup } from "@/lib/models";

// Mock data
const mockProductGroup = {
  name: "Test API Group",
  description: "Test group for API testing",
};

const mockProductData = {
  name: "Test API Product",
  type: "combination" as const,
  metric: "kg",
  currentQuantity: 50,
  minStockLevel: 10,
  costPrice: 8.5,
  sellingPrice: 15.0,
};

describe("Products API Tests", () => {
  let productGroupId: string;
  let createdProductId: string;

  beforeAll(async () => {
    await connectDB();

    // Create test product group
    const group = new ProductGroup(mockProductGroup);
    const savedGroup = await group.save();
    productGroupId = savedGroup._id.toString();
  });

  afterAll(async () => {
    // Clean up test data
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up products after each test (except the one we need for update/delete tests)
    if (createdProductId) {
      await Product.findByIdAndDelete(createdProductId);
      createdProductId = "";
    }
  });

  describe("GET /api/products", () => {
    beforeEach(async () => {
      // Create test products
      const product1 = new Product({
        ...mockProductData,
        name: "Product 1",
        groupId: productGroupId,
      });
      const product2 = new Product({
        ...mockProductData,
        name: "Product 2",
        type: "stock",
        sellingPrice: undefined,
        groupId: productGroupId,
      });

      await product1.save();
      await product2.save();
    });

    afterEach(async () => {
      await Product.deleteMany({});
    });

    it("should fetch all products successfully", async () => {
      const request = new NextRequest("http://localhost:3000/api/products");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(2);
      expect(data.data.pagination).toBeDefined();
    });

    it("should filter products by type", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/products?type=stock"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(1);
      expect(data.data.products[0].type).toBe("stock");
    });

    it("should search products by name", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/products?search=Product 1"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(1);
      expect(data.data.products[0].name).toBe("Product 1");
    });
  });

  describe("POST /api/products", () => {
    it("should create a new product successfully", async () => {
      const productData = {
        ...mockProductData,
        groupId: productGroupId,
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(productData.name);
      expect(data.data.type).toBe(productData.type);

      // Store for cleanup
      createdProductId = data.data._id;
    });

    it("should validate required fields", async () => {
      const invalidData = {
        name: "", // Invalid: empty name
        groupId: productGroupId,
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate product group exists", async () => {
      const invalidGroupId = new mongoose.Types.ObjectId().toString();
      const productData = {
        ...mockProductData,
        groupId: invalidGroupId,
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_GROUP");
    });

    it("should prevent duplicate product names in same group", async () => {
      // Create first product
      const product1 = new Product({
        ...mockProductData,
        groupId: productGroupId,
      });
      await product1.save();

      // Try to create duplicate
      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify({
          ...mockProductData,
          groupId: productGroupId,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("DUPLICATE_NAME");

      // Cleanup
      await Product.findByIdAndDelete(product1._id);
    });
  });

  describe("Product Type Validation", () => {
    it("should require cost price for stock products", async () => {
      const stockData = {
        name: "Stock Product",
        groupId: productGroupId,
        type: "stock",
        metric: "kg",
        currentQuantity: 10,
        minStockLevel: 2,
        // Missing costPrice
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(stockData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should require selling price for sellable products", async () => {
      const sellableData = {
        name: "Sellable Product",
        groupId: productGroupId,
        type: "sellable",
        metric: "pieces",
        currentQuantity: 20,
        minStockLevel: 5,
        // Missing sellingPrice
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(sellableData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should require both prices for combination products", async () => {
      const combinationData = {
        name: "Combination Product",
        groupId: productGroupId,
        type: "combination",
        metric: "liters",
        currentQuantity: 15,
        minStockLevel: 3,
        costPrice: 5.0,
        // Missing sellingPrice
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(combinationData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("Custom Metrics Validation", () => {
    it("should accept various custom metrics", async () => {
      const customMetrics = ["kg", "liters", "pieces", "boxes", "custom-unit"];

      for (const metric of customMetrics) {
        const productData = {
          name: `Product with ${metric}`,
          groupId: productGroupId,
          type: "stock" as const,
          metric,
          currentQuantity: 10,
          minStockLevel: 2,
          costPrice: 5.5,
        };

        const request = new NextRequest("http://localhost:3000/api/products", {
          method: "POST",
          body: JSON.stringify(productData),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.metric).toBe(metric);

        // Cleanup
        await Product.findByIdAndDelete(data.data._id);
      }
    });

    it("should validate metric is not empty", async () => {
      const productData = {
        name: "Product with empty metric",
        groupId: productGroupId,
        type: "stock",
        metric: "", // Empty metric
        currentQuantity: 10,
        minStockLevel: 2,
        costPrice: 5.5,
      };

      const request = new NextRequest("http://localhost:3000/api/products", {
        method: "POST",
        body: JSON.stringify(productData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});

// Helper function to create test request
function createTestRequest(url: string, method: string = "GET", body?: any) {
  const options: RequestInit = { method };
  if (body) {
    options.body = JSON.stringify(body);
  }
  return new NextRequest(url, options);
}

export { createTestRequest };
