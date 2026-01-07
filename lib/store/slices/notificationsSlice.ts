import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  _id: string;
  type:
    | "product_created"
    | "product_updated"
    | "product_deleted"
    | "cost_created"
    | "cost_updated"
    | "cost_deleted"
    | "inventory_updated"
    | "sale_created"
    | "low_stock"
    | "system";
  title: string;
  message: string;
  data?: any;
  userId: string;
  read: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  createdAt: string;
  expiresAt?: string;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  loading: false,
  error: null,
  lastUpdated: 0,
};

// Async thunks
export const fetchNotifications = createAsyncThunk(
  "notifications/fetchNotifications",
  async (params?: {
    unreadOnly?: boolean;
    category?: string;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.unreadOnly) searchParams.append("unreadOnly", "true");
    if (params?.category) searchParams.append("category", params.category);
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const response = await fetch(
      `/api/notifications?${searchParams.toString()}`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const markNotificationAsRead = createAsyncThunk(
  "notifications/markAsRead",
  async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: "PUT",
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return notificationId;
  }
);

export const markAllAsRead = createAsyncThunk(
  "notifications/markAllAsRead",
  async () => {
    const response = await fetch("/api/notifications/mark-all-read", {
      method: "PUT",
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return data.data;
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteNotification",
  async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error.message);
    }

    return notificationId;
  }
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Real-time update actions
    notificationReceived: (state, action: PayloadAction<Notification>) => {
      state.items.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
      state.lastUpdated = Date.now();
    },
    notificationUpdated: (state, action: PayloadAction<Notification>) => {
      const index = state.items.findIndex(
        (item) => item._id === action.payload._id
      );
      if (index !== -1) {
        const wasUnread = !state.items[index].read;
        const isUnread = !action.payload.read;

        state.items[index] = action.payload;

        // Update unread count
        if (wasUnread && !isUnread) {
          state.unreadCount -= 1;
        } else if (!wasUnread && isUnread) {
          state.unreadCount += 1;
        }

        state.lastUpdated = Date.now();
      }
    },
    notificationRemoved: (state, action: PayloadAction<string>) => {
      const notification = state.items.find(
        (item) => item._id === action.payload
      );
      if (notification) {
        state.items = state.items.filter((item) => item._id !== action.payload);
        if (!notification.read) {
          state.unreadCount -= 1;
        }
        state.lastUpdated = Date.now();
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.notifications || action.payload;
        state.unreadCount = state.items.filter((item) => !item.read).length;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch notifications";
      })
      // Mark as read
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.items.find(
          (item) => item._id === action.payload
        );
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount -= 1;
          state.lastUpdated = Date.now();
        }
      })
      // Mark all as read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.items.forEach((item) => {
          item.read = true;
        });
        state.unreadCount = 0;
        state.lastUpdated = Date.now();
      })
      // Delete notification
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.items.find(
          (item) => item._id === action.payload
        );
        if (notification) {
          state.items = state.items.filter(
            (item) => item._id !== action.payload
          );
          if (!notification.read) {
            state.unreadCount -= 1;
          }
          state.lastUpdated = Date.now();
        }
      });
  },
});

export const {
  notificationReceived,
  notificationUpdated,
  notificationRemoved,
  clearError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
