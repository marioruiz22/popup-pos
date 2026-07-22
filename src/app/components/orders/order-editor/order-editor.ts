import { Component, DoCheck, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order } from '../../../models/order';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-order-editor',
  imports: [FormsModule],
  templateUrl: './order-editor.html',
  styleUrl: './order-editor.scss',
})
export class OrderEditor implements DoCheck {
  showHeading = input(true);
  showCompleteButton = input(true);
  showDeleteButton = input(false);
  deleteAnyStatus = input(false);
  completeButtonLabel = input('Complete Order');

  customerName = '';

  private trackedOrderId = '';

  constructor(private orderService: OrderService) {}

  ngDoCheck(): void {
    const order = this.order;

    if (!order) {
      this.trackedOrderId = '';
      this.customerName = '';
      return;
    }

    if (order.id !== this.trackedOrderId) {
      this.trackedOrderId = order.id;
      this.customerName = order.customerName ?? '';
    }
  }

  get order(): Order | null {
    return this.orderService.getCurrentOrder();
  }

  get isEditable(): boolean {
    return this.order?.status === 'open';
  }

  saveCustomerName(): void {
    this.orderService.setCustomerName(this.customerName);
  }

  increaseQuantity(productId: string): void {
    this.orderService.increaseQuantity(productId);
  }

  decreaseQuantity(productId: string): void {
    this.orderService.decreaseQuantity(productId);
  }

  removeItem(productId: string): void {
    this.orderService.removeItem(productId);
  }

  completeOrder(): void {
    this.orderService.markPaid();
  }

  deleteOrder(): void {
    const order = this.order;
    if (!order) {
      return;
    }

    this.orderService.deleteOrder(order.id);
    this.trackedOrderId = '';
    this.customerName = '';
  }

  getTotal(): number {
    return this.orderService.getTotal();
  }
}