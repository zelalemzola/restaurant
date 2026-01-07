import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface InventoryItem {
  _id: string;
  productId: string;
  currentQuantity: number;
  minStockLevel: number;
  lastRestocked: string;
  usageHistory: Array<{
    date: string;
    quantity: number;
    type: "usage" | "restock" | "adjustment";
    reason?: string;
  }>;
}

interface InventoryState {
  items: InventoryItem[];
  lowStockItems: InventoryItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

const initialState: InventoryState = {
  items: [],
  lowStockItems: [],
  loading: false,
  error: null,
  lastUpdated: 0,
};

// Async thunks
export const fetchInventory = createAsyncThunk(
  "inventory/fetchInventory",
  async () => {
    const response = await fetch("/api/inventory");
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const updateInventoryQuantity = createAsyncThunk(
  "inventory/updateQuantity",
  async ({
    productId,
    quantity,
    type,
    reason,
  }: {
    productId: string;
    quantity: number;
    type: "usage" | "restock" | "adjustment";
    reason?: string;
  }) => {
    const response = await fetch(`/api/inventory/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, type, reason }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const fetchLowStockItems = createAsyncThunk(
  "inventory/fetchLowStockItems",
  async () => {
    const response = await fetch("/api/inventory/low-stock");
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    // Real-time update actions
    inventoryUpdated: (state, action: PayloadAction<InventoryItem>) => {
      const index = state.items.findIndex(
        (item) => item._id === action.payload._id
      );
      if (index !== -1) {
        state.items[index] = action.payload;
      } else {
        state.items.push(action.payload);
      }
      state.lastUpdated = Date.now();

      // Update low stock items
      state.lowStockItems = state.items.filter(
        (item) => item.currentQuantity <= item.minStockLevel
      );
    },
    quantityChanged: (
      state,
      action: PayloadAction<{
        productId: string;
        newQuantity: number;
        change: number;
        type: "usage" | "restock" | "adjustment";
      }>
    ) => {
      const item = state.items.find(
        (item) => item.productId === action.payload.productId
      );
      if (item) {
        item.currentQuantity = action.payload.newQuantity;
        item.usageHistory.push({
          date: new Date().toISOString(),
          quantity: action.payload.change,
          type: action.payload.type,
        });
        state.lastUpdated = Date.now();

        // Update low stock items
        state.lowStockItems = state.items.filter(
          (item) => item.currentQuantity <= item.minStockLevel
        );
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.lowStockItems = action.payload.filter(
          (item: InventoryItem) => item.currentQuantity <= item.minStockLevel
        );
        state.lastUpdated = Date.now();
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch inventory";
      })
      // Update quantity
      .addCase(updateInventoryQuantity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateInventoryQuantity.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex(
          (item) => item._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        state.lowStockItems = state.items.filter(
          (item) => item.currentQuantity <= item.minStockLevel
        );
        state.lastUpdated = Date.now();
      })
      .addCase(updateInventoryQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to update inventory";
      })
      // Fetch low stock items
      .addCase(fetchLowStockItems.fulfilled, (state, action) => {
        state.lowStockItems = action.payload;
      });
  },
});

export const { inventoryUpdated, quantityChanged, clearError } =
  inventorySlice.actions;

export default inventorySlice.reducer;
