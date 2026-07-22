import { Component } from '@angular/core';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order';

@Component({
  selector: 'app-order-editor',
  imports: [],
  templateUrl: './order-editor.html',
  styleUrl: './order-editor.scss'
})
export class OrderEditor {

  constructor(private orderService: OrderService) {}

  get order() {
    return this.orderService.getCurrentOrder();
  }

  getTotal(): number {
    return this.orderService.getTotal();
  }
}