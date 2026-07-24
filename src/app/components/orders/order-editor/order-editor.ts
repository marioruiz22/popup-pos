import { Component, DoCheck, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Order, PaymentMethod } from '../../../models/order';
import { OrderItem } from '../../../models/order-item';
import { OrderService } from '../../../services/order.service';
import { ProductService } from '../../../services/product.service';
import { nameInitial } from '../../../utils/image.util';

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
  readonly nameInitial = nameInitial;

  showHeading = input(true);
  showCompleteButton = input(true);
  showDeleteButton = input(false);
  deleteAnyStatus = input(false);
  touchFriendly = input(false);
  completeButtonLabel = input('Complete Order');
  /** When set, loads that order by UUID (e.g. completed order details). Otherwise uses the current draft. */
  orderId = input<string | null>(null);

  orderCompleted = output<void>();
  orderDeleted = output<void>();

  customerName = '';
  paymentMethod: PaymentMethod = 'cash';
  amountReceived: number | null = null;
  discountInput: number | null = null;
  tipInput: number | null = null;

  readonly quickAmounts = [5, 10, 20];

  private trackedOrderId = '';

  constructor(
    private orderService: OrderService,
    private productService: ProductService
  ) {}

  ngDoCheck(): void {
    const order = this.order;

    if (!order) {
      this.trackedOrderId = '';
      this.customerName = '';
      this.resetPayment();
      this.discountInput = null;
      this.tipInput = null;
      return;
    }

    if (order.id !== this.trackedOrderId) {
      this.trackedOrderId = order.id;
      this.customerName = order.customerName ?? '';
      this.discountInput = order.discount ?? null;
      this.tipInput = order.tip ?? null;
      this.resetPayment();
    }
  }

  get order(): Order | null {
    const id = this.orderId();
    if (id) {
      return this.orderService.getOrderById(id);
    }
    return this.orderService.getCurrentOrder();
  }

  get isEditable(): boolean {
    return this.order?.status === 'draft';
  }

  get orderHeading(): string {
    const order = this.order;
    if (!order) {
      return '';
    }
    if (order.orderNumber != null) {
      return `Order #${order.orderNumber}`;
    }
    return 'Draft order';
  }

  get itemCount(): number {
    return this.order ? this.orderService.getItemCount(this.order) : 0;
  }

  get subtotal(): number {
    return this.orderService.getSubtotal();
  }

  get discount(): number {
    return this.orderService.getDiscount();
  }

  get tip(): number {
    return this.orderService.getTip();
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

  get canAddChangeAsTip(): boolean {
    return this.paymentMethod === 'cash' && this.changeDue > 0;
  }

  get isCashReceivedInsufficient(): boolean {
    return (
      this.paymentMethod === 'cash' &&
      (this.amountReceived === null || this.amountReceived < this.orderTotal)
    );
  }

  get cashReceivedHint(): string {
    if (this.amountReceived === null) {
      return 'Enter cash received to continue';
    }

    if (this.amountReceived < this.orderTotal) {
      return 'Cash received is less than total';
    }

    return '';
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

  getItemImage(item: OrderItem): string | undefined {
    return item.imageUrl ?? this.productService.getProductById(item.productId)?.imageUrl;
  }

  saveCustomerName(): void {
    this.orderService.setCustomerName(this.customerName);
  }

  saveDiscount(): void {
    this.orderService.setDiscount(this.discountInput ?? 0);
    this.discountInput = this.order?.discount ?? null;
  }

  saveTip(): void {
    this.orderService.setTip(this.tipInput ?? 0);
    this.tipInput = this.order?.tip ?? null;
  }

  clearDiscount(): void {
    this.discountInput = null;
    this.orderService.setDiscount(0);
  }

  clearTip(): void {
    this.tipInput = null;
    this.orderService.setTip(0);
  }

  clearAmountReceived(): void {
    this.amountReceived = null;
  }

  addChangeAsTip(): void {
    if (!this.canAddChangeAsTip) {
      return;
    }

    const nextTip = Number((this.tip + this.changeDue).toFixed(2));
    this.orderService.setTip(nextTip);
    this.tipInput = nextTip || null;
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

    this.orderService.completeOrder({
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

    const label =
      order.orderNumber != null ? `order #${order.orderNumber}` : 'this draft order';
    const confirmed = confirm(`Delete ${label}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.orderService.deleteOrder(order.id);
    this.trackedOrderId = '';
    this.customerName = '';
    this.discountInput = null;
    this.tipInput = null;
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
