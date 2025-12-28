// Basic Product model tests
import mongoose from "mongoose";
import Product from "../Product";
import ProductGroup from "../ProductGroup";
import connectDB from "../../mongodb";

// Mock data for testing
const mockProductGroup = {
  name: "Test Group",
  description: "Test group description",
};

const mockStockProduct = {
  name: "Test Stock Item",
  type: "stock" as const,
  metric: "kg",
  currentQuantity: 100,
  minStockLevel: 10,
  costPrice: 5.5,
};

const mockSellableProduct = {
  name: "Test Sellable Item",
  type: "sellable" as const,
  metric: "pieces",
  currentQuantity: 50,
  minStockLevel: 5,
  sellingPrice: 15.99,
};

const mockCombinationProduct = {
  name: "Test Combination Item",
  type: "combination" as const,
  metric: "liters",
  currentQuantity: 25,
  minStockLevel: 3,
  costPrice: 8.0,
  sellingPrice: 12.0,
};

describe("Product Model Tests", () => {
  let productGroupId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();

    // Create a test product group
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
    // Clean up products after each test
    await Product.deleteMany({});
  });

  describe("Stock Product Creation", () => {
    it("should create a stock product with valid data", async () => {
      const productData = {
        ...mockStockProduct,
        groupId: productGroupId,
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name).toBe(mockStockProduct.name);
      expect(savedProduct.type).toBe("stock");
      expect(savedProduct.costPrice).toBe(mockStockProduct.costPrice);
      expect(savedProduct.sellingPrice).toBeUndefined();
    });

    it("should require cost price for stock products", async () => {
      const productData = {
        ...mockStockProduct,
        groupId: productGroupId,
        costPrice: undefined,
      };

      const product = new Product(productData);

      try {
        await product.save();
        fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.name).toBe("ValidationError");
      }
    });
  });

  describe("Sellable Product Creation", () => {
    it("should create a sellable product with valid data", async () => {
      const productData = {
        ...mockSellableProduct,
        groupId: productGroupId,
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name).toBe(mockSellableProduct.name);
      expect(savedProduct.type).toBe("sellable");
      expect(savedProduct.sellingPrice).toBe(mockSellableProduct.sellingPrice);
      expect(savedProduct.costPrice).toBeUndefined();
    });
  });

  describe("Combination Product Creation", () => {
    it("should create a combination product with both prices", async () => {
      const productData = {
        ...mockCombinationProduct,
        groupId: productGroupId,
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name).toBe(mockCombinationProduct.name);
      expect(savedProduct.type).toBe("combination");
      expect(savedProduct.costPrice).toBe(mockCombinationProduct.costPrice);
      expect(savedProduct.sellingPrice).toBe(
        mockCombinationProduct.sellingPrice
      );
    });
  });

  describe("Product Validation", () => {
    it("should validate required fields", async () => {
      const product = new Product({});

      try {
        await product.save();
        fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.name).toBe("ValidationError");
        expect(error.errors.name).toBeDefined();
        expect(error.errors.groupId).toBeDefined();
        expect(error.errors.type).toBeDefined();
        expect(error.errors.metric).toBeDefined();
      }
    });

    it("should validate product type enum", async () => {
      const productData = {
        name: "Test Product",
        groupId: productGroupId,
        type: "invalid-type",
        metric: "kg",
        currentQuantity: 10,
        minStockLevel: 5,
      };

      const product = new Product(productData);

      try {
        await product.save();
        fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.name).toBe("ValidationError");
        expect(error.errors.type).toBeDefined();
      }
    });

    it("should validate non-negative quantities", async () => {
      const productData = {
        name: "Test Product",
        groupId: productGroupId,
        type: "stock",
        metric: "kg",
        currentQuantity: -5,
        minStockLevel: -2,
        costPrice: 10,
      };

      const product = new Product(productData);

      try {
        await product.save();
        fail("Should have thrown validation error");
      } catch (error: any) {
        expect(error.name).toBe("ValidationError");
        expect(error.errors.currentQuantity).toBeDefined();
        expect(error.errors.minStockLevel).toBeDefined();
      }
    });
  });

  describe("Custom Metrics", () => {
    it("should accept various custom metrics", async () => {
      const customMetrics = ["kg", "liters", "pieces", "boxes", "custom-unit"];

      for (const metric of customMetrics) {
        const productData = {
          name: `Test Product ${metric}`,
          groupId: productGroupId,
          type: "stock" as const,
          metric,
          currentQuantity: 10,
          minStockLevel: 2,
          costPrice: 5,
        };

        const product = new Product(productData);
        const savedProduct = await product.save();

        expect(savedProduct.metric).toBe(metric);

        // Clean up for next iteration
        await Product.findByIdAndDelete(savedProduct._id);
      }
    });
  });
});

// Export for potential use in other test files
export {
  mockProductGroup,
  mockStockProduct,
  mockSellableProduct,
  mockCombinationProduct,
};
