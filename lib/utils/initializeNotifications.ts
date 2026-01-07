import { lowStockMonitor } from "@/lib/services/lowStockMonitor";
import { notificationService } from "@/lib/services/NotificationService";

/**
 * Initialize notifications for existing low stock items
 * This should be called when the app starts or when needed
 */
export async function initializeNotifications() {
  try {
    console.log("Initializing notifications for existing low stock items...");

    // Get all low stock items
    const lowStockItems = await lowStockMonitor.getLowStockItems();

    if (lowStockItems.length === 0) {
      console.log("No low stock items found");
      return { success: true, created: 0, total: 0 };
    }

    console.log(`Found ${lowStockItems.length} low stock items`);

    let createdCount = 0;

    // Create notifications for each low stock item that doesn't already have one
    for (const item of lowStockItems) {
      try {
        // Check if notification already exists
        const existingNotifications =
          await notificationService.getActiveLowStockNotifications();
        const hasActiveNotification = existingNotifications.some(
          (notification) => notification.data?.productId === item._id
        );

        if (!hasActiveNotification) {
          await notificationService.createLowStockNotification(
            item._id,
            item.name,
            item.currentQuantity,
            item.minStockLevel,
            item.metric,
            item.urgencyLevel
          );
          createdCount++;
          console.log(
            `Created notification for ${item.name} (${item.currentQuantity}/${item.minStockLevel} ${item.metric})`
          );
        } else {
          console.log(`Notification already exists for ${item.name}`);
        }
      } catch (error) {
        console.error(`Error creating notification for ${item.name}:`, error);
      }
    }

    console.log(
      `Notification initialization complete: ${createdCount}/${lowStockItems.length} notifications created`
    );

    return {
      success: true,
      created: createdCount,
      total: lowStockItems.length,
    };
  } catch (error) {
    console.error("Error initializing notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check and create notification for a specific product
 */
export async function checkProductNotification(productId: string) {
  try {
    await lowStockMonitor.checkProductStockLevel(productId);
    return { success: true };
  } catch (error) {
    console.error(
      `Error checking notification for product ${productId}:`,
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
