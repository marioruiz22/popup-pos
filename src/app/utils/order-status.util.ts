import { OrderStatus } from '../models/order';

/** User-facing order status labels. Backend/status values stay `draft` | `completed` | … */
export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'draft':
      return 'open';
    default:
      return status;
  }
}
