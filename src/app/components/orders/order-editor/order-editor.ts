import { Component } from '@angular/core';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order';

@Component({
  selector: 'app-order-editor',
  imports: [],
  templateUrl: './order-editor.html',
  styleUrl: './order-editor.scss'
})
export class OrderEditor {

  constructor(private orderService: OrderService) {}

  get order() {
    return this.orderService.getCurrentOrder();
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

  markPaid(): void {
    this.orderService.markPaid();
  }

  getTotal(): number {
    return this.orderService.getTotal();
  }
}