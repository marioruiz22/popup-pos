import { OrderItem } from './order-item';

export type OrderStatus = 'open' | 'paid' | 'cancelled';

export interface Order {
  id: string;
  customerName?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
}