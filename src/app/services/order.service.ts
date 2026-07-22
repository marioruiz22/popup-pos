import { Injectable } from '@angular/core';
import { Order } from '../models/order';
import { Product } from '../models/product';

const STORAGE_KEY = 'popup-pos-orders';

interface StoredOrders {
  orders: Order[];
  currentOrderId: string;
  nextOrderNumber: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private nextOrderNumber = 1;

  private orders: Order[] = [];

  private currentOrderId = '';

  constructor() {
    this.load();
  }

  getOrders(): Order[] {
    return this.orders;
  }

  getCurrentOrder(): Order {
    return this.orders.find((order) => order.id === this.currentOrderId)!;
  }

  createOrder(): Order {
    const order = this.createNewOrder();
    this.orders.push(order);
    this.currentOrderId = order.id;
    this.save();
    return order;
  }

  selectOrder(id: string): void {
    this.currentOrderId = id;
    this.save();
  }

  addProduct(product: Product): void {
    const order = this.getCurrentOrder();

    if (order.status !== 'open') {
      return;
    }

    const existingItem = order.items.find((item) => item.productId === product.id);

    if (existingItem) {
      existingItem.quantity++;
    } else {
      order.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      });
    }

    this.save();
  }

  markPaid(): void {
    const order = this.getCurrentOrder();

    if (order.status === 'open') {
      order.status = 'paid';
      this.save();
    }
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
    order.items = order.items.filter((item) => item.productId !== productId);
    this.save();
  }

  getTotal(order?: Order): number {
    const target = order ?? this.getCurrentOrder();

    return target.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  private findItem(productId: string) {
    return this.getCurrentOrder().items.find((item) => item.productId === productId);
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

        if (Array.isArray(data.orders) && data.orders.length > 0) {
          this.orders = data.orders.map((order) => ({
            ...order,
            createdAt: new Date(order.createdAt),
          }));
          this.nextOrderNumber = Math.max(
            data.nextOrderNumber ?? 1,
            ...this.orders.map((order) => order.orderNumber + 1)
          );
          this.currentOrderId =
            this.orders.find((order) => order.id === data.currentOrderId)?.id ??
            this.orders[0].id;
          return;
        }
      } catch {
        // Fall through to defaults when stored data is invalid.
      }
    }

    this.orders = [this.createNewOrder()];
    this.currentOrderId = this.orders[0].id;
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
