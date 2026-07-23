import { AfterViewChecked, Component, ElementRef, output, viewChild } from '@angular/core';
import { Order } from '../../../models/order';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-open-order-bubbles',
  imports: [],
  templateUrl: './open-order-bubbles.html',
  styleUrl: './open-order-bubbles.scss',
})
export class OpenOrderBubbles implements AfterViewChecked {
  openCart = output<void>();

  private readonly bubblesScroll = viewChild<ElementRef<HTMLElement>>('bubblesScroll');
  private shouldScrollToEnd = true;
  private lastOrderCount = 0;

  constructor(private orderService: OrderService) {}

  ngAfterViewChecked(): void {
    const orderCount = this.openOrders.length;

    if (orderCount !== this.lastOrderCount) {
      this.lastOrderCount = orderCount;
      this.shouldScrollToEnd = true;
    }

    if (!this.shouldScrollToEnd) {
      return;
    }

    const el = this.bubblesScroll()?.nativeElement;
    if (el) {
      el.scrollLeft = el.scrollWidth;
      this.shouldScrollToEnd = false;
    }
  }

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
    this.shouldScrollToEnd = true;
  }

  getItemCount(order: Order): number {
    return this.orderService.getItemCount(order);
  }

  getTotal(order: Order): number {
    return this.orderService.getTotal(order);
  }
}
