import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { api } from "./api";
import productsReducer from "./slices/productsSlice";
import inventoryReducer from "./slices/inventorySlice";
import costsReducer from "./slices/costsSlice";
import salesReducer from "./slices/salesSlice";
import notificationsReducer from "./slices/notificationsSlice";

export const store = configureStore({
  reducer: {
    // Add the RTK Query API reducer
    [api.reducerPath]: api.reducer,
    products: productsReducer,
    inventory: inventoryReducer,
    costs: costsReducer,
    sales: salesReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    })
      // Add the RTK Query middleware
      .concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
