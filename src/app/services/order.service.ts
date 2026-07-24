import { Injectable } from '@angular/core';
import { Order, PaymentMethod } from '../models/order';
import { Product } from '../models/product';
import { SettingsService } from './settings.service';

const STORAGE_KEY = 'popup-pos-orders';

interface StoredOrders {
  orders: Order[];
  currentOrderId: string;
  nextOrderNumber: number;
}

export interface PaymentDetails {
  paymentMethod: PaymentMethod;
  amountReceived?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private nextOrderNumber = 1;

  private orders: Order[] = [];

  private currentOrderId = '';

  constructor(private settingsService: SettingsService) {
    this.load();
  }

  getOrders(): Order[] {
    return this.orders;
  }

  getOpenOrders(): Order[] {
    return this.orders.filter((order) => order.status === 'open');
  }

  getCompletedOrders(): Order[] {
    return this.orders.filter((order) => order.status === 'paid');
  }

  getCurrentOrder(): Order | null {
    if (!this.currentOrderId) {
      return null;
    }

    return this.orders.find((order) => order.id === this.currentOrderId) ?? null;
  }

  createOrder(): Order {
    const order = this.createNewOrder();
    this.orders.push(order);
    this.currentOrderId = order.id;
    this.save();
    return order;
  }

  selectOrder(id: string): void {
    if (this.orders.some((order) => order.id === id)) {
      this.currentOrderId = id;
      this.save();
    }
  }

  addProduct(product: Product): void {
    let order = this.getCurrentOrder();

    if (!order || order.status !== 'open') {
      order = this.createOrder();
    }

    const existingItem = order.items.find((item) => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity++;
      if (product.imageUrl) {
        existingItem.imageUrl = product.imageUrl;
      }
    } else {
      order.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      });
    }

    this.save();
  }

  markPaid(details: PaymentDetails): void {
    const order = this.getCurrentOrder();

    if (order?.status !== 'open' || order.items.length === 0) {
      return;
    }

    const total = this.getTotal(order);

    if (details.paymentMethod === 'cash') {
      const amountReceived = details.amountReceived ?? 0;
      if (amountReceived < total) {
        return;
      }

      order.paymentMethod = 'cash';
      order.amountReceived = amountReceived;
      order.changeDue = Number((amountReceived - total).toFixed(2));
    } else {
      order.paymentMethod = 'mobile';
      order.amountReceived = total;
      order.changeDue = 0;
    }

    order.status = 'paid';
    order.paidAt = new Date();
    const deviceName = this.settingsService.getDeviceName().trim();
    order.deviceName = deviceName || undefined;
    this.selectNextOpenOrder();
    this.save();
  }

  reopenOrder(id: string): void {
    const order = this.orders.find((item) => item.id === id);

    if (order?.status === 'paid') {
      order.status = 'open';
      order.paymentMethod = undefined;
      order.amountReceived = undefined;
      order.changeDue = undefined;
      order.paidAt = undefined;
      order.deviceName = undefined;
      this.currentOrderId = id;
      this.save();
    }
  }

  getOrderById(id: string): Order | null {
    return this.orders.find((order) => order.id === id) ?? null;
  }

  setCustomerName(name: string, orderId?: string): void {
    const order = orderId
      ? this.orders.find((item) => item.id === orderId)
      : this.getCurrentOrder();

    if (!order) {
      return;
    }

    const trimmed = name.trim();
    order.customerName = trimmed || undefined;
    this.save();
  }

  deleteOrder(id: string): void {
    const index = this.orders.findIndex((order) => order.id === id);
    if (index === -1) {
      return;
    }

    this.orders.splice(index, 1);

    if (this.currentOrderId === id) {
      const nextOpen = this.orders.find((order) => order.status === 'open');
      this.currentOrderId = nextOpen?.id ?? this.orders[0]?.id ?? '';
    }

    this.save();
  }

  getPaidOrdersTotal(): number {
    return this.getCompletedOrders().reduce(
      (total, order) => total + this.getTotal(order),
      0
    );
  }

  getPaymentMethodTotals(): { method: PaymentMethod | 'unknown'; count: number; total: number }[] {
    const totals = new Map<PaymentMethod | 'unknown', { count: number; total: number }>();

    for (const order of this.getCompletedOrders()) {
      const method = order.paymentMethod ?? 'unknown';
      const existing = totals.get(method) ?? { count: 0, total: 0 };
      existing.count += 1;
      existing.total += this.getTotal(order);
      totals.set(method, existing);
    }

    return (['cash', 'mobile', 'unknown'] as const)
      .filter((method) => totals.has(method))
      .map((method) => ({
        method,
        count: totals.get(method)!.count,
        total: totals.get(method)!.total,
      }));
  }

  getItemTypeTotals(): { name: string; quantity: number; total: number }[] {
    const totals = new Map<string, { name: string; quantity: number; total: number }>();

    for (const order of this.getCompletedOrders()) {
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

    return [...totals.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  increaseQuantity(productId: string): void {
    const item = this.findItem(productId);
    if (item) {
      item.quantity++;
      this.save();
    }
  }

  decreaseQuantity(productId: string): void {
    const item = this.findItem(productId);
    if (!item) {
      return;
    }

    if (item.quantity <= 1) {
      this.removeItem(productId);
    } else {
      item.quantity--;
      this.save();
    }
  }

  removeItem(productId: string): void {
    const order = this.getCurrentOrder();
    if (!order) {
      return;
    }

    order.items = order.items.filter((item) => item.productId !== productId);
    this.save();
  }

  setDiscount(amount: number): void {
    const order = this.getCurrentOrder();
    if (!order || order.status !== 'open') {
      return;
    }

    const subtotal = this.getSubtotal(order);
    const discount = Math.max(0, Math.min(subtotal, Number(amount) || 0));
    order.discount = Number(discount.toFixed(2)) || undefined;
    this.save();
  }

  setTip(amount: number): void {
    const order = this.getCurrentOrder();
    if (!order || order.status !== 'open') {
      return;
    }

    const tip = Math.max(0, Number(amount) || 0);
    order.tip = Number(tip.toFixed(2)) || undefined;
    this.save();
  }

  getSubtotal(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    if (!target) {
      return 0;
    }

    return target.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  getDiscount(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    return target?.discount ?? 0;
  }

  getTip(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    return target?.tip ?? 0;
  }

  getTotal(order?: Order): number {
    const target = order ?? this.getCurrentOrder();
    if (!target) {
      return 0;
    }

    const subtotal = this.getSubtotal(target);
    const discount = Math.min(this.getDiscount(target), subtotal);
    const tip = this.getTip(target);
    return Number((subtotal - discount + tip).toFixed(2));
  }

  getItemCount(order: Order): number {
    return order.items.reduce((count, item) => count + item.quantity, 0);
  }

  private selectNextOpenOrder(): void {
    const nextOpen = this.orders.find((order) => order.status === 'open');
    this.currentOrderId = nextOpen?.id ?? '';
  }

  private findItem(productId: string) {
    return this.getCurrentOrder()?.items.find((item) => item.productId === productId);
  }

  private createNewOrder(): Order {
    return {
      id: crypto.randomUUID(),
      orderNumber: this.nextOrderNumber++,
      items: [],
      status: 'open',
      createdAt: new Date(),
    };
  }

  private load(): void {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const data = JSON.parse(raw) as StoredOrders;

        if (Array.isArray(data.orders)) {
          this.orders = data.orders.map((order) => ({
            ...order,
            createdAt: new Date(order.createdAt),
            paidAt: order.paidAt ? new Date(order.paidAt) : undefined,
          }));
          this.nextOrderNumber = Math.max(
            data.nextOrderNumber ?? 1,
            ...this.orders.map((order) => order.orderNumber + 1),
            1
          );

          const savedCurrent = this.orders.find((order) => order.id === data.currentOrderId);
          this.currentOrderId = savedCurrent?.id ?? '';
          this.save();
          return;
        }
      } catch {
        // Fall through to defaults when stored data is invalid.
      }
    }

    this.orders = [];
    this.currentOrderId = '';
    this.save();
  }

  private save(): void {
    const data: StoredOrders = {
      orders: this.orders,
      currentOrderId: this.currentOrderId,
      nextOrderNumber: this.nextOrderNumber,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}
