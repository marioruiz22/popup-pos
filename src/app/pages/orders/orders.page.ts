import { Component } from '@angular/core';
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
  range: OrdersRange = 'today';
  showItemBreakdown = false;
  detailOrderId: string | null = null;

  readonly ranges: { id: OrdersRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This week' },
    { id: 'year', label: 'This year' },
    { id: 'all', label: 'All time' },
  ];

  constructor(private orderService: OrderService) {}

  get filteredOrders(): Order[] {
    return this.orderService
      .getCompletedOrders()
      .filter((order) => this.isInRange(order))
      .sort((a, b) => this.getOrderDate(b).getTime() - this.getOrderDate(a).getTime());
  }

  get orderCount(): number {
    return this.filteredOrders.length;
  }

  get totalSales(): number {
    return this.filteredOrders.reduce((total, order) => total + this.getTotal(order), 0);
  }

  get itemsSold(): number {
    return this.filteredOrders.reduce((total, order) => total + this.getItemCount(order), 0);
  }

  get totalTips(): number {
    return this.filteredOrders.reduce((total, order) => total + (order.tip ?? 0), 0);
  }

  get itemBreakdown(): { name: string; quantity: number; total: number }[] {
    const totals = new Map<string, { name: string; quantity: number; total: number }>();

    for (const order of this.filteredOrders) {
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
  }

  setRange(range: OrdersRange): void {
    this.range = range;
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

  private isInRange(order: Order): boolean {
    if (this.range === 'all') {
      return true;
    }

    const date = this.getOrderDate(order);
    const now = new Date();

    if (this.range === 'today') {
      return date >= this.startOfDay(now);
    }

    if (this.range === 'week') {
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
