/**
 * End-to-End Tests for Complete Sales Process
 *
 * This test suite validates the entire sales workflow:
 * 1. Product selection and availability checking
 * 2. Sales transaction creation with multiple items
 * 3. Payment method processing
 * 4. Inventory updates for combination items
 * 5. Sales transaction history and retrieval
 * 6. Revenue calculation and tracking
 */

import mongoose from "mongoose";
import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Product, ProductGroup, SalesTransaction } from "@/lib/models";

// Import API route handlers
import { GET as getProducts } from "@/app/api/products/route";
import {
  POST as createSalesTransaction,
  GET as getSalesTransactions,
} from "@/app/api/sales/transactions/route";

describe("E2E: Complete Sales Process Workflow", () => {
  let productGroupId: string;
  let sellableProductId: string;
  let combinationProductId: string;
  let stockProductId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean up all test data
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await SalesTransaction.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up and create fresh test data
    await Product.deleteMany({});
    await ProductGroup.deleteMany({});
    await SalesTransaction.deleteMany({});

    await createTestProducts();
  });

  describe("1. Product Selection and Availability", () => {
    it("should retrieve available sellable and combination products", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/products?type=sellable"
      );
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(1);
      expect(data.data.products[0].type).toBe("sellable");
    });

    it("should retrieve combination products for sales", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/products?type=combination"
      );
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.products).toHaveLength(1);
      expect(data.data.products[0].type).toBe("combination");
      expect(data.data.products[0].sellingPrice).toBeDefined();
    });

    it("should not include stock-only products in sales selection", async () => {
      const request = new NextRequest("http://localhost:3000/api/products");
      const response = await getProducts(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const stockOnlyProducts = data.data.products.filter(
        (p: any) => p.type === "stock"
      );
      expect(stockOnlyProducts).toHaveLength(1);

      // Stock products should not have selling price
      expect(stockOnlyProducts[0].sellingPrice).toBeUndefined();
    });
  });

  describe("2. Sales Transaction Creation", () => {
    it("should create a single-item sales transaction", async () => {
      const saleData = {
        items: [
          {
            productId: sellableProductId,
            quantity: 2,
            unitPrice: 15.99,
          },
        ],
        paymentMethod: "Cash",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions",
        {
          method: "POST",
          body: JSON.stringify(saleData),
        }
      );

      const response = await createSalesTransaction(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.totalAmount).toBe(31.98); // 2 * 15.99
      expect(data.data.paymentMethod).toBe("Cash");
    });

    it("should create a multi-item sales transaction", async () => {
      const saleData = {
        items: [
          {
            productId: sellableProductId,
            quantity: 1,
            unitPrice: 15.99,
          },
          {
            productId: combinationProductId,
            quantity: 3,
            unitPrice: 12.0,
          },
        ],
        paymentMethod: "CBE",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions",
        {
          method: "POST",
          body: JSON.stringify(saleData),
        }
      );

      const response = await createSalesTransaction(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(2);
      expect(data.data.totalAmount).toBe(51.99); // 15.99 + (3 * 12.00)
      expect(data.data.paymentMethod).toBe("CBE");
    });

    it("should validate payment method options", async () => {
      const saleData = {
        items: [
          {
            productId: sellableProductId,
            quantity: 1,
            unitPrice: 15.99,
          },
        ],
        paymentMethod: "InvalidMethod",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions",
        {
          method: "POST",
          body: JSON.stringify(saleData),
        }
      );

      const response = await createSalesTransaction(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("3. Payment Method Processing", () => {
    const paymentMethods = [
      "CBE",
      "Abyssinia",
      "Zemen",
      "Awash",
      "Telebirr",
      "Cash",
      "POS",
    ];

    paymentMethods.forEach((method) => {
      it(`should process ${method} payment method`, async () => {
        const saleData = {
          items: [
            {
              productId: sellableProductId,
              quantity: 1,
              unitPrice: 15.99,
            },
          ],
          paymentMethod: method,
        };

        const request = new NextRequest(
          "http://localhost:3000/api/sales/transactions",
          {
            method: "POST",
            body: JSON.stringify(saleData),
          }
        );

        const response = await createSalesTransaction(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.success).toBe(true);
        expect(data.data.paymentMethod).toBe(method);
      });
    });
  });

  describe("4. Inventory Updates for Combination Items", () => {
    it("should update inventory when combination item is sold", async () => {
      // Get initial quantity
      const initialProduct = await Product.findById(combinationProductId);
      const initialQuantity = initialProduct?.currentQuantity || 0;

      const saleData = {
        items: [
          {
            productId: combinationProductId,
            quantity: 5,
            unitPrice: 12.0,
          },
        ],
        paymentMethod: "Cash",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions",
        {
          method: "POST",
          body: JSON.stringify(saleData),
        }
      );

      const response = await createSalesTransaction(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Verify inventory was updated
      const updatedProduct = await Product.findById(combinationProductId);
      expect(updatedProduct?.currentQuantity).toBe(initialQuantity - 5);
    });

    it("should not update inventory for sellable-only items", async () => {
      // Get initial quantity
      const initialProduct = await Product.findById(sellableProductId);
      const initialQuantity = initialProduct?.currentQuantity || 0;

      const saleData = {
        items: [
          {
            productId: sellableProductId,
            quantity: 2,
            unitPrice: 15.99,
          },
        ],
        paymentMethod: "Cash",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions",
        {
          method: "POST",
          body: JSON.stringify(saleData),
        }
      );

      const response = await createSalesTransaction(request);
      expect(response.status).toBe(201);

      // Verify inventory was NOT updated for sellable-only items
      const updatedProduct = await Product.findById(sellableProductId);
      expect(updatedProduct?.currentQuantity).toBe(initialQuantity);
    });

    it("should prevent sale if combination item has insufficient stock", async () => {
      // Try to sell more than available
      const saleData = {
        items: [
          {
            productId: combinationProductId,
            quantity: 100, // More than the 25 available
            unitPrice: 12.0,
          },
        ],
        paymentMethod: "Cash",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions",
        {
          method: "POST",
          body: JSON.stringify(saleData),
        }
      );

      const response = await createSalesTransaction(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INSUFFICIENT_STOCK");
    });
  });

  describe("5. Sales Transaction History", () => {
    beforeEach(async () => {
      // Create some test transactions
      await createTestTransactions();
    });

    it("should retrieve sales transaction history", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions"
      );
      const response = await getSalesTransactions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions).toHaveLength(3);
      expect(data.data.summary).toBeDefined();
      expect(data.data.summary.totalTransactions).toBe(3);
    });

    it("should filter transactions by date range", async () => {
      const today = new Date().toISOString().split("T")[0];
      const request = new NextRequest(
        `http://localhost:3000/api/sales/transactions?startDate=${today}&endDate=${today}`
      );
      const response = await getSalesTransactions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactions.length).toBeGreaterThan(0);
    });

    it("should filter transactions by payment method", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions?paymentMethod=Cash"
      );
      const response = await getSalesTransactions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      const cashTransactions = data.data.transactions.filter(
        (t: any) => t.paymentMethod === "Cash"
      );
      expect(cashTransactions.length).toBeGreaterThan(0);
    });
  });

  describe("6. Revenue Calculation and Tracking", () => {
    beforeEach(async () => {
      await createTestTransactions();
    });

    it("should calculate total revenue correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions"
      );
      const response = await getSalesTransactions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.totalRevenue).toBeGreaterThan(0);

      // Verify calculation
      const expectedRevenue = data.data.transactions.reduce(
        (sum: number, t: any) => sum + t.totalAmount,
        0
      );
      expect(data.data.summary.totalRevenue).toBe(expectedRevenue);
    });

    it("should track payment method distribution", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/sales/transactions"
      );
      const response = await getSalesTransactions(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary.paymentMethodDistribution).toBeDefined();

      const distribution = data.data.summary.paymentMethodDistribution;
      expect(distribution.Cash).toBeGreaterThan(0);
      expect(distribution.CBE).toBeGreaterThan(0);
    });
  });
});

// Helper functions
async function createTestProducts() {
  // Create product group
  const group = new ProductGroup({
    name: "E2E Sales Test Group",
    description: "Group for sales testing",
  });
  const savedGroup = await group.save();
  productGroupId = savedGroup._id.toString();

  // Create stock product (not sellable)
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

async function createTestTransactions() {
  // Create test sales transactions
  const transactions = [
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
          quantity: 1,
          unitPrice: 12.0,
          totalPrice: 12.0,
        },
      ],
      totalAmount: 12.0,
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
          quantity: 2,
          unitPrice: 12.0,
          totalPrice: 24.0,
        },
      ],
      totalAmount: 39.99,
      paymentMethod: "POS",
    },
  ];

  for (const transactionData of transactions) {
    const transaction = new SalesTransaction(transactionData);
    await transaction.save();
  }
}
