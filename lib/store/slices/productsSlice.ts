import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Product {
  _id: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  currentQuantity: number;
  minStockLevel: number;
  type: "sellable" | "ingredient";
  metric: string;
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductsState {
  items: Product[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

const initialState: ProductsState = {
  items: [],
  loading: false,
  error: null,
  lastUpdated: 0,
};

// Async thunks for API calls
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (params?: { search?: string; type?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append("search", params.search);
    if (params?.type) searchParams.append("type", params.type);
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const response = await fetch(`/api/products?${searchParams.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data.products;
  }
);

export const createProduct = createAsyncThunk(
  "products/createProduct",
  async (productData: Omit<Product, "_id" | "createdAt" | "updatedAt">) => {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id: string) => {
    const response = await fetch(`/api/products/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return id;
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    // Real-time update actions
    productAdded: (state, action: PayloadAction<Product>) => {
      state.items.push(action.payload);
      state.lastUpdated = Date.now();
    },
    productUpdated: (state, action: PayloadAction<Product>) => {
      const index = state.items.findIndex(
        (item) => item._id === action.payload._id
      );
      if (index !== -1) {
        state.items[index] = action.payload;
        state.lastUpdated = Date.now();
      }
    },
    productDeleted: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((item) => item._id !== action.payload);
      state.lastUpdated = Date.now();
    },
    // Inventory updates
    productQuantityUpdated: (
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) => {
      const product = state.items.find(
        (item) => item._id === action.payload.id
      );
      if (product) {
        product.currentQuantity = action.payload.quantity;
        state.lastUpdated = Date.now();
      }
    },
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch products";
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create product";
      })
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.lastUpdated = Date.now();
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update product";
      })
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.filter((item) => item._id !== action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to delete product";
      });
  },
});

export const {
  productAdded,
  productUpdated,
  productDeleted,
  productQuantityUpdated,
  clearError,
} = productsSlice.actions;

export default productsSlice.reducer;
