import { OrderItem } from './order-item';

export type OrderStatus = 'open' | 'paid' | 'cancelled';

export type PaymentMethod = 'cash' | 'mobile';

export interface Order {
  id: string;
  orderNumber: number;
  customerName?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
  discount?: number;
  tip?: number;
  paymentMethod?: PaymentMethod;
  amountReceived?: number;
  changeDue?: number;
}
