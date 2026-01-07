// RTK Query API configuration
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  Product,
  ProductGroup,
  StockTransaction,
  SalesTransaction,
  CostOperation,
  CreateProductRequest,
  CreateSalesTransactionRequest,
  CreateStockTransactionRequest,
  CreateCostOperationRequest,
} from "@/types";
import type {
  Notification,
  CreateNotificationRequest,
} from "@/types/notification";

// Import API response types directly
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Pagination types
interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Define the base API
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: [
    "Product",
    "ProductGroup",
    "StockTransaction",
    "SalesTransaction",
    "CostOperation",
    "Notification",
    "Analytics",
  ],
  endpoints: (builder) => ({
    // Product Groups
    getProductGroups: builder.query<ApiResponse<ProductGroup[]>, void>({
      query: () => "/product-groups",
      providesTags: ["ProductGroup"],
    }),
    getProductGroup: builder.query<ApiResponse<ProductGroup>, string>({
      query: (id) => `/product-groups/${id}`,
      providesTags: (result, error, id) => [{ type: "ProductGroup", id }],
    }),
    createProductGroup: builder.mutation<
      ApiResponse<ProductGroup>,
      { name: string; description?: string }
    >({
      query: (body) => ({
        url: "/product-groups",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProductGroup"],
    }),
    updateProductGroup: builder.mutation<
      ApiResponse<ProductGroup>,
      { id: string; data: { name: string; description?: string } }
    >({
      query: ({ id, data }) => ({
        url: `/product-groups/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ProductGroup", id },
        "ProductGroup",
      ],
    }),
    deleteProductGroup: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/product-groups/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductGroup"],
    }),

    // Products
    getProducts: builder.query<
      ApiResponse<{
        products: Product[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>,
      PaginationParams & { search?: string; groupId?: string; type?: string }
    >({
      query: (params) => ({
        url: "/products",
        params,
      }),
      providesTags: ["Product"],
    }),
    getProduct: builder.query<ApiResponse<Product>, string>({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),
    createProduct: builder.mutation<ApiResponse<Product>, CreateProductRequest>(
      {
        query: (body) => ({
          url: "/products",
          method: "POST",
          body,
        }),
        invalidatesTags: ["Product", "Analytics"],
      }
    ),
    updateProduct: builder.mutation<
      ApiResponse<Product>,
      { id: string; data: Partial<CreateProductRequest> }
    >({
      query: ({ id, data }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        "Analytics",
      ],
    }),
    deleteProduct: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Product", "Analytics"],
    }),
    bulkUpdateProducts: builder.mutation<
      ApiResponse<{ modifiedCount: number }>,
      {
        productIds: string[];
        updates: {
          groupId?: string;
          stockAdjustment?: {
            adjustment: number;
            reason: string;
          };
          costPriceAdjustment?: {
            type: "percentage" | "fixed";
            value: number;
          };
          sellingPriceAdjustment?: {
            type: "percentage" | "fixed";
            value: number;
          };
          archived?: boolean;
        };
      }
    >({
      query: (body) => ({
        url: "/products/bulk-update",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Product", "Analytics"],
    }),

    // Stock Transactions
    getStockTransactions: builder.query<
      ApiResponse<PaginatedResponse<StockTransaction>>,
      PaginationParams & { productId?: string }
    >({
      query: (params) => ({
        url: "/stock-transactions",
        params,
      }),
      providesTags: ["StockTransaction"],
    }),
    createStockTransaction: builder.mutation<
      ApiResponse<StockTransaction>,
      CreateStockTransactionRequest
    >({
      query: (body) => ({
        url: "/stock-transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "StockTransaction",
        "Product",
        "Analytics",
        "Notification",
      ],
    }),

    // Sales Transactions
    getSalesTransactions: builder.query<
      ApiResponse<PaginatedResponse<SalesTransaction>>,
      PaginationParams
    >({
      query: (params) => ({
        url: "/sales-transactions",
        params,
      }),
      providesTags: ["SalesTransaction"],
    }),
    createSalesTransaction: builder.mutation<
      ApiResponse<SalesTransaction>,
      CreateSalesTransactionRequest
    >({
      query: (body) => ({
        url: "/sales-transactions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SalesTransaction", "Product", "Analytics"],
    }),

    // Cost Operations
    getCostOperations: builder.query<
      ApiResponse<{
        costOperations: CostOperation[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>,
      PaginationParams & {
        category?: string;
        type?: string;
        startDate?: string;
        endDate?: string;
      }
    >({
      query: (params) => ({
        url: "/costs",
        params,
      }),
      providesTags: ["CostOperation"],
    }),
    getCostOperation: builder.query<ApiResponse<CostOperation>, string>({
      query: (id) => `/costs/${id}`,
      providesTags: (result, error, id) => [{ type: "CostOperation", id }],
    }),
    createCostOperation: builder.mutation<
      ApiResponse<CostOperation>,
      CreateCostOperationRequest
    >({
      query: (body) => ({
        url: "/costs",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CostOperation", "Analytics"],
    }),
    updateCostOperation: builder.mutation<
      ApiResponse<CostOperation>,
      { id: string; data: CreateCostOperationRequest }
    >({
      query: ({ id, data }) => ({
        url: `/costs/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "CostOperation", id },
        "CostOperation",
        "Analytics",
      ],
    }),
    deleteCostOperation: builder.mutation<
      ApiResponse<{ message: string }>,
      string
    >({
      query: (id) => ({
        url: `/costs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["CostOperation", "Analytics"],
    }),

    // Notifications
    getNotifications: builder.query<
      ApiResponse<{
        notifications: Notification[];
        unreadCount: number;
        pagination: {
          limit: number;
          skip: number;
          total: number;
        };
      }>,
      { unreadOnly?: boolean; type?: string; userId?: string }
    >({
      query: (params) => ({
        url: "/notifications",
        params: {
          ...params,
          userId: params?.userId || "system", // Default to system user
        },
      }),
      providesTags: ["Notification"],
    }),
    createNotification: builder.mutation<
      ApiResponse<Notification>,
      CreateNotificationRequest
    >({
      query: (body) => ({
        url: "/notifications",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Notification"],
    }),
    markNotificationAsRead: builder.mutation<
      ApiResponse<Notification>,
      { id: string; read: boolean }
    >({
      query: ({ id, read }) => ({
        url: `/notifications/${id}`,
        method: "PATCH",
        body: { read },
      }),
      invalidatesTags: ["Notification"],
    }),
    markAllNotificationsAsRead: builder.mutation<
      ApiResponse<{ modifiedCount: number }>,
      void
    >({
      query: () => ({
        url: "/notifications/mark-all-read",
        method: "PATCH",
      }),
      invalidatesTags: ["Notification"],
    }),
    deleteNotification: builder.mutation<ApiResponse<{ id: string }>, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notification"],
    }),

    // Inventory Stock Levels
    getStockLevels: builder.query<
      ApiResponse<{
        stockLevels: Array<{
          _id: string;
          name: string;
          type: "stock" | "sellable" | "combination";
          metric: string;
          currentQuantity: number;
          minStockLevel: number;
          isLowStock: boolean;
          stockStatus: "in-stock" | "low-stock" | "out-of-stock";
          group: {
            _id: string;
            name: string;
          };
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
        summary: {
          totalItems: number;
          lowStockItems: number;
          outOfStockItems: number;
          inStockItems: number;
        };
      }>,
      {
        page?: number;
        limit?: number;
        search?: string;
        type?: string;
        groupId?: string;
        stockStatus?: string;
      }
    >({
      query: (params) => ({
        url: "/inventory/stock-levels",
        params,
      }),
      providesTags: ["Product", "StockTransaction"],
    }),
    adjustStock: builder.mutation<
      ApiResponse<StockTransaction>,
      {
        productId: string;
        newQuantity: number;
        reason: string;
      }
    >({
      query: (body) => ({
        url: "/inventory/adjustment",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Product",
        "StockTransaction",
        "Analytics",
        "Notification",
      ],
    }),
    recordStockUsage: builder.mutation<
      ApiResponse<StockTransaction>,
      {
        productId: string;
        quantity: number;
        reason?: string;
      }
    >({
      query: (body) => ({
        url: "/inventory/usage",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Product",
        "StockTransaction",
        "Analytics",
        "Notification",
      ],
    }),
    recordBulkStockUsage: builder.mutation<
      ApiResponse<StockTransaction[]>,
      {
        items: Array<{
          productId: string;
          quantity: number;
          reason?: string;
        }>;
      }
    >({
      query: (body) => ({
        url: "/inventory/usage",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Product",
        "StockTransaction",
        "Analytics",
        "Notification",
      ],
    }),

    // Dashboard Analytics
    getDashboardData: builder.query<
      ApiResponse<{
        dailySales: {
          amount: number;
          transactionCount: number;
        };
        weeklySales: {
          amount: number;
          transactionCount: number;
        };
        lowStockCount: number;
        unreadNotifications: number;
        totalProducts: number;
        recentTransactions: Array<{
          _id: string;
          totalAmount: number;
          paymentMethod: string;
          itemCount: number;
          createdAt: string;
          items: Array<{
            productName: string;
            quantity: number;
            totalPrice: number;
          }>;
        }>;
      }>,
      void
    >({
      query: () => "/dashboard",
      providesTags: ["Analytics"],
    }),

    // Financial Analytics
    getFinancialAnalytics: builder.query<
      ApiResponse<{
        revenue: {
          total: number;
          byPeriod: Array<{ date: string; amount: number }>;
          byPaymentMethod: Array<{
            method: string;
            amount: number;
            percentage: number;
          }>;
        };
        costs: {
          total: number;
          byPeriod: Array<{ date: string; amount: number }>;
          byCategory: Array<{
            category: string;
            amount: number;
            percentage: number;
          }>;
        };
        profit: {
          total: number;
          margin: number;
          byPeriod: Array<{
            date: string;
            revenue: number;
            costs: number;
            profit: number;
            margin: number;
          }>;
        };
        combinationItems: {
          profitMargins: Array<{
            productId: string;
            productName: string;
            costPrice: number;
            sellingPrice: number;
            margin: number;
            marginPercentage: number;
            totalSold: number;
            totalProfit: number;
          }>;
        };
      }>,
      {
        startDate?: string;
        endDate?: string;
        period?: string;
      }
    >({
      query: (params) => ({
        url: "/analytics",
        params,
      }),
      providesTags: ["Analytics"],
    }),

    // Inventory and Sales Analytics
    getInventorySalesAnalytics: builder.query<
      ApiResponse<{
        salesTrends: {
          byPeriod: Array<{
            date: string;
            totalSales: number;
            transactionCount: number;
            averageOrderValue: number;
          }>;
          byProduct: Array<{
            productId: string;
            productName: string;
            totalQuantitySold: number;
            totalRevenue: number;
            transactionCount: number;
            averagePrice: number;
          }>;
        };
        popularProducts: {
          byQuantity: Array<{
            productId: string;
            productName: string;
            productType: string;
            totalQuantitySold: number;
            totalRevenue: number;
            transactionCount: number;
            rank: number;
          }>;
          byRevenue: Array<{
            productId: string;
            productName: string;
            productType: string;
            totalQuantitySold: number;
            totalRevenue: number;
            transactionCount: number;
            rank: number;
          }>;
        };
        paymentMethodDistribution: Array<{
          method: string;
          transactionCount: number;
          totalAmount: number;
          percentage: number;
          averageTransactionValue: number;
        }>;
        inventoryTurnover: {
          byProduct: Array<{
            productId: string;
            productName: string;
            productType: string;
            currentStock: number;
            averageStock: number;
            totalUsage: number;
            turnoverRate: number;
            daysToTurnover: number;
            stockStatus: string;
          }>;
          summary: {
            averageTurnoverRate: number;
            fastMovingItems: number;
            slowMovingItems: number;
            totalProducts: number;
          };
        };
        stockUsagePatterns: {
          byPeriod: Array<{
            date: string;
            totalUsage: number;
            usageTransactions: number;
            topUsedProducts: Array<{
              productName: string;
              quantity: number;
            }>;
          }>;
          byProduct: Array<{
            productId: string;
            productName: string;
            totalUsage: number;
            usageFrequency: number;
            averageUsagePerTransaction: number;
            lastUsedDate: string;
          }>;
        };
      }>,
      {
        startDate?: string;
        endDate?: string;
        period?: string;
      }
    >({
      query: (params) => ({
        url: "/analytics/inventory-sales",
        params,
      }),
      providesTags: ["Analytics"],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useGetProductGroupsQuery,
  useGetProductGroupQuery,
  useCreateProductGroupMutation,
  useUpdateProductGroupMutation,
  useDeleteProductGroupMutation,
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkUpdateProductsMutation,
  useGetStockTransactionsQuery,
  useCreateStockTransactionMutation,
  useGetSalesTransactionsQuery,
  useCreateSalesTransactionMutation,
  useGetCostOperationsQuery,
  useGetCostOperationQuery,
  useCreateCostOperationMutation,
  useUpdateCostOperationMutation,
  useDeleteCostOperationMutation,
  useGetNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useGetStockLevelsQuery,
  useAdjustStockMutation,
  useRecordStockUsageMutation,
  useRecordBulkStockUsageMutation,
  useGetDashboardDataQuery,
  useGetFinancialAnalyticsQuery,
  useGetInventorySalesAnalyticsQuery,
} = api;
