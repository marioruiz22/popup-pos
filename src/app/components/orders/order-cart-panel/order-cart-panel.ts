import { Component, OnDestroy, OnInit, inject, output } from '@angular/core';
import { OrderEditor } from '../order-editor/order-editor';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { OrderService } from '../../../services/order.service';
import { isDesktopViewport } from '../../../utils/viewport.util';

@Component({
  selector: 'app-order-cart-panel',
  imports: [OrderEditor],
  templateUrl: './order-cart-panel.html',
  styleUrl: './order-cart-panel.scss',
})
export class OrderCartPanel implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  closed = output<void>();

  ngOnInit(): void {
    document.body.classList.add('checkout-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('checkout-open');
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (isDesktopViewport()) {
      this.close();
    }
  }

  async deleteOrder(): Promise<void> {
    const order = this.orderService.getCurrentOrder();
    if (!order) {
      return;
    }

    const label =
      order.orderNumber != null ? `order #${order.orderNumber}` : 'this draft order';
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete order',
      message: `Delete ${label}? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    await this.orderService.deleteOrder(order.id);
    this.close();
  }

  onOrderCompleted(): void {
    this.close();
  }
}
