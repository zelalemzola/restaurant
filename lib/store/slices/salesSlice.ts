import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface SaleTransaction {
  _id: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentMethod: "cash" | "card" | "digital";
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  createdBy: string;
  createdAt: string;
}

export interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  dailyTrend: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
}

interface SalesState {
  transactions: SaleTransaction[];
  summary: SalesSummary | null;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

const initialState: SalesState = {
  transactions: [],
  summary: null,
  loading: false,
  error: null,
  lastUpdated: 0,
};

// Async thunks
export const fetchSalesTransactions = createAsyncThunk(
  "sales/fetchTransactions",
  async (params?: {
    startDate?: string;
    endDate?: string;
    paymentMethod?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append("startDate", params.startDate);
    if (params?.endDate) searchParams.append("endDate", params.endDate);
    if (params?.paymentMethod)
      searchParams.append("paymentMethod", params.paymentMethod);
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const response = await fetch(
      `/api/sales/transactions?${searchParams.toString()}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data.transactions;
  }
);

export const createSaleTransaction = createAsyncThunk(
  "sales/createTransaction",
  async (
    transactionData: Omit<SaleTransaction, "_id" | "createdAt" | "createdBy">
  ) => {
    const response = await fetch("/api/sales/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transactionData),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const fetchSalesSummary = createAsyncThunk(
  "sales/fetchSummary",
  async (dateRange?: { startDate: string; endDate: string }) => {
    const searchParams = new URLSearchParams();
    if (dateRange?.startDate)
      searchParams.append("startDate", dateRange.startDate);
    if (dateRange?.endDate) searchParams.append("endDate", dateRange.endDate);

    const response = await fetch(
      `/api/sales/summary?${searchParams.toString()}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    // Real-time update actions
    saleTransactionAdded: (state, action: PayloadAction<SaleTransaction>) => {
      state.transactions.unshift(action.payload);
      state.lastUpdated = Date.now();

      // Update summary if available
      if (state.summary) {
        state.summary.totalRevenue += action.payload.totalAmount;
        state.summary.totalTransactions += 1;
        state.summary.averageOrderValue =
          state.summary.totalRevenue / state.summary.totalTransactions;
      }
    },
    saleTransactionUpdated: (state, action: PayloadAction<SaleTransaction>) => {
      const index = state.transactions.findIndex(
        (tx) => tx._id === action.payload._id
      );
      if (index !== -1) {
        const oldAmount = state.transactions[index].totalAmount;
        state.transactions[index] = action.payload;
        state.lastUpdated = Date.now();

        // Update summary if available
        if (state.summary) {
          state.summary.totalRevenue =
            state.summary.totalRevenue - oldAmount + action.payload.totalAmount;
          state.summary.averageOrderValue =
            state.summary.totalRevenue / state.summary.totalTransactions;
        }
      }
    },
    saleTransactionDeleted: (state, action: PayloadAction<string>) => {
      const transaction = state.transactions.find(
        (tx) => tx._id === action.payload
      );
      if (transaction) {
        state.transactions = state.transactions.filter(
          (tx) => tx._id !== action.payload
        );
        state.lastUpdated = Date.now();

        // Update summary if available
        if (state.summary) {
          state.summary.totalRevenue -= transaction.totalAmount;
          state.summary.totalTransactions -= 1;
          if (state.summary.totalTransactions > 0) {
            state.summary.averageOrderValue =
              state.summary.totalRevenue / state.summary.totalTransactions;
          } else {
            state.summary.averageOrderValue = 0;
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
      // Fetch transactions
      .addCase(fetchSalesTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchSalesTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch sales transactions";
      })
      // Create transaction
      .addCase(createSaleTransaction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSaleTransaction.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions.unshift(action.payload);
        state.lastUpdated = Date.now();
      })
      .addCase(createSaleTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to create sale transaction";
      })
      // Fetch summary
      .addCase(fetchSalesSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.lastUpdated = Date.now();
      });
  },
});

export const {
  saleTransactionAdded,
  saleTransactionUpdated,
  saleTransactionDeleted,
  clearError,
} = salesSlice.actions;

export default salesSlice.reducer;
