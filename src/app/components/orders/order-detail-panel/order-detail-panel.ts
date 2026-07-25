import { Component, OnDestroy, OnInit, inject, input, output } from '@angular/core';
import { OrderEditor } from '../order-editor/order-editor';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { OrderService } from '../../../services/order.service';
import { isDesktopViewport } from '../../../utils/viewport.util';

@Component({
  selector: 'app-order-detail-panel',
  imports: [OrderEditor],
  templateUrl: './order-detail-panel.html',
  styleUrl: './order-detail-panel.scss',
})
export class OrderDetailPanel implements OnInit, OnDestroy {
  private readonly orderService = inject(OrderService);
  private readonly confirmDialog = inject(ConfirmDialogService);

  orderId = input.required<string>();
  closed = output<void>();

  ngOnInit(): void {
    document.body.classList.add('checkout-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('checkout-open');
  }

  get order() {
    return this.orderService.getOrderById(this.orderId());
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
    const order = this.order;
    if (!order) {
      return;
    }

    const label =
      order.orderNumber != null ? `order #${order.orderNumber}` : 'this order';
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

  async reopenOrder(): Promise<void> {
    const order = this.order;
    if (!order) {
      return;
    }

    await this.orderService.reopenOrder(order.id);
    this.close();
  }
}
