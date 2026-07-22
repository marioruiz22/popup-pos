import { Injectable } from '@angular/core';
import { Order } from '../models/order';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private orders: Order[] = [
    this.createNewOrder()
  ];

  private currentOrderId = this.orders[0].id;

  getOrders(): Order[] {
    return this.orders;
  }

  getCurrentOrder(): Order {
    return this.orders.find(
      order => order.id === this.currentOrderId
    )!;
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

  getTotal(order?: Order): number {
    const target = order ?? this.getCurrentOrder();

    return target.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  private createNewOrder(): Order {
    return {
      id: crypto.randomUUID(),
      items: [],
      status: 'open',
      createdAt: new Date()
    };
  }
}