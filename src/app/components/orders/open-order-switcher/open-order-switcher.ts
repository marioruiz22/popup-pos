import { Component, input } from '@angular/core';
import { Order } from '../../../models/order';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-open-order-switcher',
  imports: [],
  templateUrl: './open-order-switcher.html',
  styleUrl: './open-order-switcher.scss',
})
export class OpenOrderSwitcher {
  showHeading = input(true);

  constructor(private orderService: OrderService) {}

  get openOrders(): Order[] {
    return this.orderService.getDraftOrders();
  }

  get currentOrderId(): string {
    return this.orderService.getCurrentOrder()?.id ?? '';
  }

  selectOrder(id: string): void {
    this.orderService.selectOrder(id);
  }

  getItemCount(order: Order): number {
    return this.orderService.getItemCount(order);
  }

  getTotal(order: Order): number {
    return this.orderService.getTotal(order);
  }

  orderLabel(order: Order): string {
    const name = order.customerName?.trim();
    if (name) {
      return name;
    }
    if (order.orderNumber != null) {
      return `#${order.orderNumber}`;
    }
    return 'Draft';
  }
}
