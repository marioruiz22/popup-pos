import { OrderItem } from './order-item';

/**
 * Order lifecycle:
 * draft (local only) → completed (Firestore) → reopen → draft (same id) → complete again (update same doc)
 */
export type OrderStatus = 'draft' | 'completed' | 'cancelled';

export type PaymentMethod = 'cash' | 'mobile';

export interface Order {
  /** Internal primary identifier. Always present. Use this in components/services. */
  id: string;
  /**
   * Display-only order number. Assigned on first completion.
   * Absent for never-completed drafts. Preserved across reopen → complete again.
   */
  orderNumber?: number;
  customerName?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  /** Set when the order is completed (payment taken). */
  completedAt?: Date;
  discount?: number;
  tip?: number;
  paymentMethod?: PaymentMethod;
  amountReceived?: number;
  changeDue?: number;
  /** Device that completed the order (from Settings). */
  deviceName?: string;
  /**
   * Popup this completed order belongs to (from join session).
   * TODO(firebase): Required for Security Rules and per-popup daily order numbers.
   */
  popupId?: string;
  /**
   * Local sticky tab letter for open drafts (A, B, C…).
   * Assigned on create; reused when freed. Not synced to Firestore.
   */
  tabLetter?: string;
}
