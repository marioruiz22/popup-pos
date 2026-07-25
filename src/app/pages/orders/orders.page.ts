import { Component, computed, inject, signal } from '@angular/core';
import { Order } from '../../models/order';
import { OrderService } from '../../services/order.service';
import { OrderDetailPanel } from '../../components/orders/order-detail-panel/order-detail-panel';

export type OrdersRange = 'today' | 'week' | 'year' | 'all';

@Component({
  selector: 'app-orders-page',
  imports: [OrderDetailPanel],
  templateUrl: './orders.page.html',
  styleUrl: './orders.page.scss',
})
export class OrdersPage {
  private readonly orderService = inject(OrderService);

  private readonly rangeSignal = signal<OrdersRange>('today');
  showItemBreakdown = false;
  detailOrderId: string | null = null;

  readonly ranges: { id: OrdersRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'year', label: 'This year' },
    { id: 'all', label: 'All time' },
  ];

  readonly loadError = this.orderService.lastCompletedSyncError;

  readonly filteredOrders = computed(() =>
    this.orderService
      .completedOrdersList()
      .filter((order) => this.isInRange(order, this.rangeSignal()))
      .sort((a, b) => this.getOrderDate(b).getTime() - this.getOrderDate(a).getTime())
  );

  readonly orderCount = computed(() => this.filteredOrders().length);

  readonly totalSales = computed(() =>
    this.filteredOrders().reduce((total, order) => total + this.getTotal(order), 0)
  );

  readonly itemsSold = computed(() =>
    this.filteredOrders().reduce((total, order) => total + this.getItemCount(order), 0)
  );

  readonly totalTips = computed(() =>
    this.filteredOrders().reduce((total, order) => total + (order.tip ?? 0), 0)
  );

  /** Product sales after discounts, excluding tips. */
  readonly salesExcludingTips = computed(() =>
    this.filteredOrders().reduce((total, order) => {
      const tip = order.tip ?? 0;
      return total + Number((this.getTotal(order) - tip).toFixed(2));
    }, 0)
  );

  readonly totalCash = computed(() =>
    this.filteredOrders()
      .filter((order) => order.paymentMethod === 'cash')
      .reduce((total, order) => total + this.getTotal(order), 0)
  );

  readonly cashOrderCount = computed(
    () => this.filteredOrders().filter((order) => order.paymentMethod === 'cash').length
  );

  readonly totalMobile = computed(() =>
    this.filteredOrders()
      .filter((order) => order.paymentMethod === 'mobile')
      .reduce((total, order) => total + this.getTotal(order), 0)
  );

  readonly mobileOrderCount = computed(
    () => this.filteredOrders().filter((order) => order.paymentMethod === 'mobile').length
  );

  readonly itemBreakdown = computed(() => {
    const totals = new Map<string, { name: string; quantity: number; total: number }>();

    for (const order of this.filteredOrders()) {
      for (const item of order.items) {
        const existing = totals.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.total += item.price * item.quantity;
        } else {
          totals.set(item.productId, {
            name: item.name,
            quantity: item.quantity,
            total: item.price * item.quantity,
          });
        }
      }
    }

    return [...totals.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  });

  get range(): OrdersRange {
    return this.rangeSignal();
  }

  setRange(range: OrdersRange): void {
    this.rangeSignal.set(range);
  }

  toggleItemBreakdown(): void {
    this.showItemBreakdown = !this.showItemBreakdown;
  }

  openDetails(orderId: string): void {
    this.detailOrderId = orderId;
  }

  closeDetails(): void {
    this.detailOrderId = null;
  }

  getItemCount(order: Order): number {
    return this.orderService.getItemCount(order);
  }

  getTotal(order: Order): number {
    return this.orderService.getTotal(order);
  }

  getDiscount(order: Order): number {
    return order.discount ?? 0;
  }

  hasExtras(order: Order): boolean {
    return this.getDiscount(order) > 0 || (order.tip ?? 0) > 0;
  }

  paymentLabel(order: Order): string {
    if (order.paymentMethod === 'cash') {
      return 'Cash';
    }
    if (order.paymentMethod === 'mobile') {
      return 'Mobile';
    }
    return 'Unspecified';
  }

  formatDate(order: Order): string {
    return this.getOrderDate(order).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private isInRange(order: Order, range: OrdersRange): boolean {
    if (range === 'all') {
      return true;
    }

    const date = this.getOrderDate(order);
    const now = new Date();

    if (range === 'today') {
      return date >= this.startOfDay(now);
    }

    if (range === 'week') {
      return date >= this.startOfWeek(now);
    }

    return date.getFullYear() === now.getFullYear();
  }

  private getOrderDate(order: Order): Date {
    return order.completedAt ?? order.createdAt;
  }

  private startOfDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private startOfWeek(date: Date): Date {
    const start = this.startOfDay(date);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return start;
  }
}
