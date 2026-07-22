import { Injectable } from '@angular/core';
import { Order } from '../models/order';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private orders: Order[] = [];

  getOrders(): Order[] {
    return this.orders;
  }

  createOrder(): Order {
    const order: Order = {
      id: crypto.randomUUID(),
      items: [],
      status: 'open',
      createdAt: new Date()
    };

    this.orders.push(order);

    return order;
  }

  addProduct(order: Order, product: Product): void {
    const existingItem = order.items.find(
      item => item.productId === product.id
    );

    if (existingItem) {
      existingItem.quantity++;
    } else {
      order.items.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      });
    }
  }

  getTotal(order: Order): number {
    return order.items.reduce(
      (total, item) =>
        total + item.price * item.quantity,
      0
    );
  }
}