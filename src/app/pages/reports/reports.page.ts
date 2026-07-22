import { Component } from '@angular/core';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-reports-page',
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
})
export class ReportsPage {
  constructor(private orderService: OrderService) {}

  get completedOrderCount(): number {
    return this.orderService.getCompletedOrders().length;
  }

  get paymentTotal(): number {
    return this.orderService.getPaidOrdersTotal();
  }

  get itemTypeTotals() {
    return this.orderService.getItemTypeTotals();
  }
}
