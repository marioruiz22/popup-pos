import { Component } from '@angular/core';
import { ProductGrid } from '../../components/products/product-grid/product-grid';
import { OpenOrderSwitcher } from '../../components/orders/open-order-switcher/open-order-switcher';
import { OpenOrderBubbles } from '../../components/orders/open-order-bubbles/open-order-bubbles';
import { OrderCartPanel } from '../../components/orders/order-cart-panel/order-cart-panel';
import { OrderEditor } from '../../components/orders/order-editor/order-editor';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-pos-page',
  imports: [ProductGrid, OpenOrderSwitcher, OpenOrderBubbles, OrderCartPanel, OrderEditor],
  templateUrl: './pos.page.html',
  styleUrl: './pos.page.scss',
})
export class PosPage {
  cartOpen = false;

  constructor(private orderService: OrderService) {}

  createOrder(): void {
    this.orderService.createOrder();
  }

  openCart(): void {
    if (this.orderService.getCurrentOrder()) {
      this.cartOpen = true;
    }
  }

  closeCart(): void {
    this.cartOpen = false;
  }
}
