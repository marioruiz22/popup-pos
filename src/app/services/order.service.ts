import { Injectable } from '@angular/core';
import { Order } from '../models/order';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private nextOrderNumber = 1;

  private orders: Order[] = [this.createNewOrder()];

  private currentOrderId = this.orders[0].id;

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
    return order;
  }

  selectOrder(id: string): void {
    this.currentOrderId = id;
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
  }

  markPaid(): void {
    const order = this.getCurrentOrder();

    if (order.status === 'open') {
      order.status = 'paid';
    }
  }

  increaseQuantity(productId: string): void {
    const item = this.findItem(productId);
    if (item) {
      item.quantity++;
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
    }
  }

  removeItem(productId: string): void {
    const order = this.getCurrentOrder();
    order.items = order.items.filter((item) => item.productId !== productId);
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
}
