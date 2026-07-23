import { Component, DoCheck, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, PaymentMethod } from '../../../models/order';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-order-editor',
  imports: [FormsModule],
  templateUrl: './order-editor.html',
  styleUrl: './order-editor.scss',
  host: {
    '[class.touch-friendly]': 'touchFriendly()',
  },
})
export class OrderEditor implements DoCheck {
  showHeading = input(true);
  showCompleteButton = input(true);
  showDeleteButton = input(false);
  deleteAnyStatus = input(false);
  touchFriendly = input(false);
  completeButtonLabel = input('Complete Order');

  orderCompleted = output<void>();
  orderDeleted = output<void>();

  customerName = '';
  paymentMethod: PaymentMethod = 'cash';
  amountReceived: number | null = null;

  readonly quickAmounts = [5, 10, 20];

  private trackedOrderId = '';

  constructor(private orderService: OrderService) {}

  ngDoCheck(): void {
    const order = this.order;

    if (!order) {
      this.trackedOrderId = '';
      this.customerName = '';
      this.resetPayment();
      return;
    }

    if (order.id !== this.trackedOrderId) {
      this.trackedOrderId = order.id;
      this.customerName = order.customerName ?? '';
      this.resetPayment();
    }
  }

  get order(): Order | null {
    return this.orderService.getCurrentOrder();
  }

  get isEditable(): boolean {
    return this.order?.status === 'open';
  }

  get orderTotal(): number {
    return this.orderService.getTotal();
  }

  get changeDue(): number {
    if (this.paymentMethod !== 'cash' || this.amountReceived === null) {
      return 0;
    }

    return Math.max(0, Number((this.amountReceived - this.orderTotal).toFixed(2)));
  }

  get canComplete(): boolean {
    if (!this.order || this.order.items.length === 0) {
      return false;
    }

    if (this.paymentMethod === 'mobile') {
      return true;
    }

    return this.amountReceived !== null && this.amountReceived >= this.orderTotal;
  }

  saveCustomerName(): void {
    this.orderService.setCustomerName(this.customerName);
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;

    if (method === 'mobile') {
      this.amountReceived = null;
    }
  }

  setExactAmount(): void {
    this.amountReceived = this.orderTotal;
  }

  setQuickAmount(amount: number): void {
    this.amountReceived = amount;
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
    if (!this.canComplete) {
      return;
    }

    this.orderService.markPaid({
      paymentMethod: this.paymentMethod,
      amountReceived: this.paymentMethod === 'cash' ? (this.amountReceived ?? undefined) : undefined,
    });
    this.resetPayment();
    this.orderCompleted.emit();
  }

  deleteOrder(): void {
    const order = this.order;
    if (!order) {
      return;
    }

    this.orderService.deleteOrder(order.id);
    this.trackedOrderId = '';
    this.customerName = '';
    this.resetPayment();
    this.orderDeleted.emit();
  }

  getTotal(): number {
    return this.orderService.getTotal();
  }

  private resetPayment(): void {
    this.paymentMethod = 'cash';
    this.amountReceived = null;
  }
}
