import {
  AfterViewChecked,
  Component,
  ElementRef,
  computed,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { Order } from '../../../models/order';
import { OrderService } from '../../../services/order.service';
import { accentColorForTabLetter } from '../../../utils/order-accent.util';

@Component({
  selector: 'app-open-order-bubbles',
  imports: [],
  templateUrl: './open-order-bubbles.html',
  styleUrl: './open-order-bubbles.scss',
})
export class OpenOrderBubbles implements AfterViewChecked {
  private readonly orderService = inject(OrderService);

  openCart = output<void>();

  readonly openOrders = this.orderService.draftOrdersList;
  readonly currentOrderId = this.orderService.activeDraftOrderId;
  readonly hasOpenOrders = computed(() => this.openOrders().length > 0);

  private readonly bubblesScroll = viewChild<ElementRef<HTMLElement>>('bubblesScroll');
  private shouldScrollToActive = true;
  private lastOrderCount = 0;

  ngAfterViewChecked(): void {
    const orderCount = this.openOrders().length;

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

  onOrderClick(id: string): void {
    if (id === this.currentOrderId()) {
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

  /** Name or reopened #; otherwise the sticky tab letter chip is shown. */
  bubbleLabel(order: Order): string {
    const name = order.customerName?.trim();
    if (name) {
      return name;
    }
    if (order.orderNumber != null) {
      return `#${order.orderNumber}`;
    }
    return '';
  }

  showTabChip(order: Order): boolean {
    return !this.bubbleLabel(order) && Boolean(order.tabLetter);
  }

  tabAccent(order: Order): string {
    return accentColorForTabLetter(order.tabLetter ?? 'A');
  }

  bubbleAriaLabel(order: Order): string {
    const label = this.bubbleLabel(order);
    if (label) {
      return label;
    }
    if (order.tabLetter) {
      return `Tab ${order.tabLetter}`;
    }
    const count = this.getItemCount(order);
    return count > 0 ? `Open order, ${count} items` : 'Open order';
  }

  private scrollBubbleIntoView(scrollEl: HTMLElement, bubble: HTMLElement): void {
    const scrollRect = scrollEl.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const delta =
      bubbleRect.left - scrollRect.left - (scrollRect.width - bubbleRect.width) / 2;

    scrollEl.scrollLeft += delta;
  }
}
