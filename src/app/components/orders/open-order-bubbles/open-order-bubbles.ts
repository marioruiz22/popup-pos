import { Component, output } from '@angular/core';
import { Order } from '../../../models/order';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-open-order-bubbles',
  imports: [],
  templateUrl: './open-order-bubbles.html',
  styleUrl: './open-order-bubbles.scss',
})
export class OpenOrderBubbles {
  openCart = output<void>();

  constructor(private orderService: OrderService) {}

  get openOrders(): Order[] {
    return this.orderService.getOpenOrders();
  }

  get currentOrderId(): string {
    return this.orderService.getCurrentOrder()?.id ?? '';
  }

  get hasOpenOrders(): boolean {
    return this.openOrders.length > 0;
  }

  onOrderClick(id: string): void {
    if (id === this.currentOrderId) {
      this.openCart.emit();
      return;
    }

    this.orderService.selectOrder(id);
  }

  createOrder(): void {
    this.orderService.createOrder();
  }

  getItemCount(order: Order): number {
    return this.orderService.getItemCount(order);
  }

  getTotal(order: Order): number {
    return this.orderService.getTotal(order);
  }
}
