import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { ProductGrid } from '../../components/products/product-grid/product-grid';
import { OpenOrderSwitcher } from '../../components/orders/open-order-switcher/open-order-switcher';
import { OpenOrderBubbles } from '../../components/orders/open-order-bubbles/open-order-bubbles';
import { OrderCartPanel } from '../../components/orders/order-cart-panel/order-cart-panel';
import { OrderEditor } from '../../components/orders/order-editor/order-editor';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { OrderService } from '../../services/order.service';
import { OverlayHistoryBridge } from '../../utils/overlay-history.util';

@Component({
  selector: 'app-pos-page',
  imports: [ProductGrid, OpenOrderSwitcher, OpenOrderBubbles, OrderCartPanel, OrderEditor],
  templateUrl: './pos.page.html',
  styleUrl: './pos.page.scss',
})
export class PosPage implements OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly checkoutHistory = new OverlayHistoryBridge('popupPosCheckout');

  readonly cartOpen = signal(false);

  ngOnDestroy(): void {
    this.checkoutHistory.clearOnDestroy();
  }

  @HostListener('window:popstate')
  onBrowserBack(): void {
    if (this.confirmDialog.isOpen() || this.confirmDialog.matchesHistory()) {
      return;
    }
    if (this.checkoutHistory.consumeIgnoredPopstate()) {
      return;
    }

    if (this.cartOpen()) {
      // Back from a layer above (e.g. confirm) lands on our entry — stay open.
      if (this.checkoutHistory.matchesState()) {
        this.checkoutHistory.adoptCurrentState();
        return;
      }
      this.checkoutHistory.closeFromPopstate();
      this.cartOpen.set(false);
      return;
    }

    // Forward onto a checkout history entry — reopen checkout.
    if (this.checkoutHistory.matchesState()) {
      if (this.orderService.getCurrentOrder()) {
        this.cartOpen.set(true);
        this.checkoutHistory.adoptCurrentState();
      } else {
        history.back();
      }
    }
  }

  createOrder(): void {
    this.orderService.createOrder();
  }

  openCart(): void {
    if (!this.orderService.getCurrentOrder()) {
      return;
    }
    this.cartOpen.set(true);
    this.checkoutHistory.push();
  }

  closeCart(): void {
    if (!this.cartOpen()) {
      return;
    }
    this.cartOpen.set(false);
    this.checkoutHistory.closeFromUi();
  }
}
