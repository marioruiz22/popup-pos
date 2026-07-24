import { Component } from '@angular/core';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order';

@Component({
  selector: 'app-order-list',
  imports: [],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss'
})
export class OrderList {

  orders: Order[];

  constructor(private orderService: OrderService) {
    this.orders = this.orderService.getDraftOrders();
  }

  createOrder() {
    this.orderService.createOrder();
  }

  selectOrder(id: string) {
    this.orderService.selectOrder(id);
  }
}