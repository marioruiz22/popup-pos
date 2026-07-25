import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { ProductGrid } from '../../components/products/product-grid/product-grid';
import { OpenOrderSwitcher } from '../../components/orders/open-order-switcher/open-order-switcher';
import { OpenOrderBubbles } from '../../components/orders/open-order-bubbles/open-order-bubbles';
import { OrderCartPanel } from '../../components/orders/order-cart-panel/order-cart-panel';
import { OrderEditor } from '../../components/orders/order-editor/order-editor';
import { OrderService } from '../../services/order.service';

const CHECKOUT_HISTORY_KEY = 'popupPosCheckout';

@Component({
  selector: 'app-pos-page',
  imports: [ProductGrid, OpenOrderSwitcher, OpenOrderBubbles, OrderCartPanel, OrderEditor],
  templateUrl: './pos.page.html',
  styleUrl: './pos.page.scss',
})
export class PosPage implements OnDestroy {
  private readonly orderService = inject(OrderService);

  readonly cartOpen = signal(false);
  private checkoutHistoryPushed = false;

  ngOnDestroy(): void {
    // Leaving Sell while checkout is open — clear our history marker without
    // calling back(), which could undo the route the user just navigated to.
    if (this.checkoutHistoryPushed && this.isCheckoutHistoryState(history.state)) {
      history.replaceState(null, '');
    }
    this.checkoutHistoryPushed = false;
  }

  @HostListener('window:popstate')
  onBrowserBack(): void {
    if (!this.cartOpen()) {
      return;
    }

    // History already moved back; just close checkout and stay on Sell.
    this.checkoutHistoryPushed = false;
    this.cartOpen.set(false);
  }

  createOrder(): void {
    this.orderService.createOrder();
  }

  openCart(): void {
    if (!this.orderService.getCurrentOrder()) {
      return;
    }

    this.cartOpen.set(true);

    if (!this.checkoutHistoryPushed) {
      history.pushState({ [CHECKOUT_HISTORY_KEY]: true }, '');
      this.checkoutHistoryPushed = true;
    }
  }

  closeCart(): void {
    if (!this.cartOpen() && !this.checkoutHistoryPushed) {
      return;
    }

    const shouldPopHistory =
      this.checkoutHistoryPushed && this.isCheckoutHistoryState(history.state);

    this.cartOpen.set(false);
    this.checkoutHistoryPushed = false;

    // Closing via × / complete / delete — remove the dummy history entry.
    // popstate will fire, but cart is already closed so onBrowserBack is a no-op.
    if (shouldPopHistory) {
      history.back();
    }
  }

  private isCheckoutHistoryState(state: unknown): boolean {
    return Boolean(
      state &&
        typeof state === 'object' &&
        (state as Record<string, unknown>)[CHECKOUT_HISTORY_KEY] === true
    );
  }
}
