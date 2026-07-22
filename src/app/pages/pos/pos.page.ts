import { Component } from '@angular/core';
import { ProductGrid } from '../../components/products/product-grid/product-grid';
import { OpenOrderSwitcher } from '../../components/orders/open-order-switcher/open-order-switcher';
import { OrderEditor } from '../../components/orders/order-editor/order-editor';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-pos-page',
  imports: [ProductGrid, OpenOrderSwitcher, OrderEditor],
  templateUrl: './pos.page.html',
  styleUrl: './pos.page.scss',
})
export class PosPage {
  constructor(private orderService: OrderService) {}

  get hasOpenOrders(): boolean {
    return this.orderService.getOpenOrders().length > 0;
  }

  createOrder(): void {
    this.orderService.createOrder();
  }
}
