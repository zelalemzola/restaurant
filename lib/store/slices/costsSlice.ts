import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface CostOperation {
  _id: string;
  type: "inventory" | "operational" | "overhead";
  category: string;
  amount: number;
  description: string;
  date: string;
  relatedEntity?: {
    type: "product" | "operation" | "general";
    id: string;
    name: string;
  };
  createdBy: string;
  createdAt: string;
}

export interface CostSummary {
  totalCosts: number;
  inventoryCosts: number;
  operationalCosts: number;
  overheadCosts: number;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

interface CostsState {
  operations: CostOperation[];
  summary: CostSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

const initialState: CostsState = {
  operations: [],
  summary: null,
  loading: false,
  error: null,
  lastUpdated: 0,
};

// Async thunks
export const fetchCostOperations = createAsyncThunk(
  "costs/fetchOperations",
  async (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    category?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.type) searchParams.append("type", params.type);
    if (params?.category) searchParams.append("category", params.category);
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const response = await fetch(`/api/costs?${searchParams.toString()}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data.operations;
  }
);

export const createCostOperation = createAsyncThunk(
  "costs/createOperation",
  async (
    operationData: Omit<CostOperation, "_id" | "createdAt" | "createdBy">
  ) => {
    const response = await fetch("/api/costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(operationData),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const fetchCostSummary = createAsyncThunk(
  "costs/fetchSummary",
  async (dateRange?: { startDate: string; endDate: string }) => {
    const searchParams = new URLSearchParams();
    if (dateRange?.startDate)
      searchParams.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) searchParams.append("endDate", dateRange.endDate);

    const response = await fetch(
      `/api/costs/summary?${searchParams.toString()}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

const costsSlice = createSlice({
  name: "costs",
  initialState,
  reducers: {
    // Real-time update actions
    costOperationAdded: (state, action: PayloadAction<CostOperation>) => {
      state.operations.unshift(action.payload);
      state.lastUpdated = Date.now();

      // Update summary if available
      if (state.summary) {
        state.summary.totalCosts += action.payload.amount;

        switch (action.payload.type) {
          case "inventory":
            state.summary.inventoryCosts += action.payload.amount;
            break;
          case "operational":
            state.summary.operationalCosts += action.payload.amount;
            break;
          case "overhead":
            state.summary.overheadCosts += action.payload.amount;
            break;
        }
      }
    },
    costOperationUpdated: (state, action: PayloadAction<CostOperation>) => {
      const index = state.operations.findIndex(
        (op) => op._id === action.payload._id
      );
      if (index !== -1) {
        const oldAmount = state.operations[index].amount;
        const oldType = state.operations[index].type;

        state.operations[index] = action.payload;
        state.lastUpdated = Date.now();

        // Update summary if available
        if (state.summary) {
          // Remove old amount
          state.summary.totalCosts -= oldAmount;
          switch (oldType) {
            case "inventory":
              state.summary.inventoryCosts -= oldAmount;
              break;
            case "operational":
              state.summary.operationalCosts -= oldAmount;
              break;
            case "overhead":
              state.summary.overheadCosts -= oldAmount;
              break;
          }

          // Add new amount
          state.summary.totalCosts += action.payload.amount;
          switch (action.payload.type) {
            case "inventory":
              state.summary.inventoryCosts += action.payload.amount;
              break;
            case "operational":
              state.summary.operationalCosts += action.payload.amount;
              break;
            case "overhead":
              state.summary.overheadCosts += action.payload.amount;
              break;
          }
        }
      }
    },
    costOperationDeleted: (state, action: PayloadAction<string>) => {
      const operation = state.operations.find(
        (op) => op._id === action.payload
      );
      if (operation) {
        state.operations = state.operations.filter(
          (op) => op._id !== action.payload
        );
        state.lastUpdated = Date.now();

        // Update summary if available
        if (state.summary) {
          state.summary.totalCosts -= operation.amount;
          switch (operation.type) {
            case "inventory":
              state.summary.inventoryCosts -= operation.amount;
              break;
            case "operational":
              state.summary.operationalCosts -= operation.amount;
              break;
            case "overhead":
              state.summary.overheadCosts -= operation.amount;
              break;
          }
        }
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch operations
      .addCase(fetchCostOperations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCostOperations.fulfilled, (state, action) => {
        state.loading = false;
        state.operations = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchCostOperations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch cost operations";
      })
      // Create operation
      .addCase(createCostOperation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCostOperation.fulfilled, (state, action) => {
        state.loading = false;
        state.operations.unshift(action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(createCostOperation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create cost operation";
      })
      // Fetch summary
      .addCase(fetchCostSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.lastUpdated = Date.now();
      });
  },
});

export const {
  costOperationAdded,
  costOperationUpdated,
  costOperationDeleted,
  clearError,
} = costsSlice.actions;

export default costsSlice.reducer;
