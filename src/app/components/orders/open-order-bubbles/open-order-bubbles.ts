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
  private shouldScrollToActive = true;
  private lastOrderCount = 0;

  constructor(private orderService: OrderService) {}

  ngAfterViewChecked(): void {
    const orderCount = this.openOrders.length;

    if (orderCount !== this.lastOrderCount) {
      this.lastOrderCount = orderCount;
      this.shouldScrollToActive = true;
    }

    if (!this.shouldScrollToActive) {
      return;
    }

    const scrollEl = this.bubblesScroll()?.nativeElement;
    if (!scrollEl) {
      return;
    }

    const activeBubble = scrollEl.querySelector<HTMLElement>('.order-bubble.active');
    if (!activeBubble) {
      return;
    }

    this.scrollBubbleIntoView(scrollEl, activeBubble);
    this.shouldScrollToActive = false;
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
    this.shouldScrollToActive = true;
  }

  getItemCount(order: Order): number {
    return this.orderService.getItemCount(order);
  }

  getTotal(order: Order): number {
    return this.orderService.getTotal(order);
  }

  bubbleLabel(order: Order): string {
    const name = order.customerName?.trim();
    return name || `#${order.orderNumber}`;
  }

  private scrollBubbleIntoView(scrollEl: HTMLElement, bubble: HTMLElement): void {
    const scrollRect = scrollEl.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const delta =
      bubbleRect.left - scrollRect.left - (scrollRect.width - bubbleRect.width) / 2;

    scrollEl.scrollLeft += delta;
  }
}
