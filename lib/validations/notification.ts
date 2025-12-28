// Notification validation schemas using Zod
import { z } from 'zod';

export const notificationTypeSchema = z.enum(['low-stock', 'system', 'alert']);

export const createNotificationSchema = z.object({
  type: notificationTypeSchema,
  title: z.string().min(1, 'Title is required').trim(),
  message: z.string().min(1, 'Message is required').trim(),
  productId: z.string().optional()
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean()
});