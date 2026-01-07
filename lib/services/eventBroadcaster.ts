import { store } from "@/lib/store";
import {
  productAdded,
  productUpdated,
  productDeleted,
  productQuantityUpdated,
} from "@/lib/store/slices/productsSlice";
import {
  inventoryUpdated,
  quantityChanged,
} from "@/lib/store/slices/inventorySlice";
import {
  costOperationAdded,
  costOperationUpdated,
  costOperationDeleted,
} from "@/lib/store/slices/costsSlice";
import {
  saleTransactionAdded,
  saleTransactionUpdated,
  saleTransactionDeleted,
} from "@/lib/store/slices/salesSlice";
import { notificationReceived } from "@/lib/store/slices/notificationsSlice";

export type CRUDOperation = "create" | "update" | "delete";
export type EntityType =
  | "product"
  | "inventory"
  | "cost"
  | "sale"
  | "notification";

export interface BroadcastEvent {
  entity: EntityType;
  operation: CRUDOperation;
  data: any;
  timestamp: number;
  userId?: string;
}

class EventBroadcaster {
  private listeners: Map<string, Array<(event: BroadcastEvent) => void>> =
    new Map();

  // Subscribe to events
  subscribe(eventType: string, callback: (event: BroadcastEvent) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  // Unsubscribe from events
  unsubscribe(eventType: string, callback: (event: BroadcastEvent) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Broadcast event to all listeners
  broadcast(event: BroadcastEvent) {
    // Update Redux store based on event
    this.updateStore(event);

    // Notify all listeners
    const allListeners = this.listeners.get("*") || [];
    const specificListeners =
      this.listeners.get(`${event.entity}:${event.operation}`) || [];
    const entityListeners = this.listeners.get(event.entity) || [];

    [...allListeners, ...specificListeners, ...entityListeners].forEach(
      (callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error("Error in event listener:", error);
        }
      }
    );
  }

  // Update Redux store based on event
  private updateStore(event: BroadcastEvent) {
    const { entity, operation, data } = event;

    switch (entity) {
      case "product":
        switch (operation) {
          case "create":
            store.dispatch(productAdded(data));
            break;
          case "update":
            store.dispatch(productUpdated(data));
            break;
          case "delete":
            store.dispatch(productDeleted(data.id || data._id));
            break;
        }
        break;

      case "inventory":
        switch (operation) {
          case "update":
            if (data.type === "quantity_change") {
              store.dispatch(
                quantityChanged({
                  productId: data.productId,
                  newQuantity: data.newQuantity,
                  change: data.change,
                  type: data.changeType,
                })
              );
            } else {
              store.dispatch(inventoryUpdated(data));
            }
            break;
        }
        break;

      case "cost":
        switch (operation) {
          case "create":
            store.dispatch(costOperationAdded(data));
            break;
          case "update":
            store.dispatch(costOperationUpdated(data));
            break;
          case "delete":
            store.dispatch(costOperationDeleted(data.id || data._id));
            break;
        }
        break;

      case "sale":
        switch (operation) {
          case "create":
            store.dispatch(saleTransactionAdded(data));
            break;
          case "update":
            store.dispatch(saleTransactionUpdated(data));
            break;
          case "delete":
            store.dispatch(saleTransactionDeleted(data.id || data._id));
            break;
        }
        break;

      case "notification":
        if (operation === "create") {
          store.dispatch(notificationReceived(data));
        }
        break;
    }
  }

  // Convenience methods for common operations
  broadcastProductCreated(product: any, userId?: string) {
    this.broadcast({
      entity: "product",
      operation: "create",
      data: product,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastProductUpdated(product: any, userId?: string) {
    this.broadcast({
      entity: "product",
      operation: "update",
      data: product,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastProductDeleted(productId: string, userId?: string) {
    this.broadcast({
      entity: "product",
      operation: "delete",
      data: { id: productId },
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastInventoryUpdated(inventoryData: any, userId?: string) {
    this.broadcast({
      entity: "inventory",
      operation: "update",
      data: inventoryData,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastQuantityChanged(
    productId: string,
    newQuantity: number,
    change: number,
    changeType: string,
    userId?: string
  ) {
    this.broadcast({
      entity: "inventory",
      operation: "update",
      data: {
        type: "quantity_change",
        productId,
        newQuantity,
        change,
        changeType,
      },
      timestamp: Date.now(),
      userId,
    });

    // Also update product quantity in products store
    store.dispatch(
      productQuantityUpdated({ id: productId, quantity: newQuantity })
    );
  }

  broadcastCostCreated(cost: any, userId?: string) {
    this.broadcast({
      entity: "cost",
      operation: "create",
      data: cost,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastCostUpdated(cost: any, userId?: string) {
    this.broadcast({
      entity: "cost",
      operation: "update",
      data: cost,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastCostDeleted(costId: string, userId?: string) {
    this.broadcast({
      entity: "cost",
      operation: "delete",
      data: { id: costId },
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastSaleCreated(sale: any, userId?: string) {
    this.broadcast({
      entity: "sale",
      operation: "create",
      data: sale,
      timestamp: Date.now(),
      userId,
    });
  }

  broadcastNotification(notification: any) {
    this.broadcast({
      entity: "notification",
      operation: "create",
      data: notification,
      timestamp: Date.now(),
    });
  }
}

// Create singleton instance
export const eventBroadcaster = new EventBroadcaster();

// Hook for components to use the event broadcaster
export function useEventBroadcaster() {
  return eventBroadcaster;
}
