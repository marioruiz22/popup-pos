import { Component } from '@angular/core';
import { Order } from '../../models/order';
import { OrderEditor } from '../../components/orders/order-editor/order-editor';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders-page',
  imports: [OrderEditor],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss',
})
export class OrdersPage {
  constructor(private orderService: OrderService) {}

  get openOrders(): Order[] {
    return this.orderService.getOpenOrders();
  }

  get completedOrders(): Order[] {
    return this.orderService.getCompletedOrders();
  }

  get selectedOrder(): Order | null {
    return this.orderService.getCurrentOrder();
  }

  selectOrder(id: string): void {
    this.orderService.selectOrder(id);
  }

  reopenOrder(id: string): void {
    this.orderService.reopenOrder(id);
  }

  getItemCount(order: Order): number {
    return this.orderService.getItemCount(order);
  }

  getTotal(order: Order): number {
    return this.orderService.getTotal(order);
  }
}
