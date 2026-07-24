import { Component, OnDestroy, OnInit, input, output } from '@angular/core';
import { OrderEditor } from '../order-editor/order-editor';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-order-detail-panel',
  imports: [OrderEditor],
  templateUrl: './order-detail-panel.html',
  styleUrl: './order-detail-panel.scss',
})
export class OrderDetailPanel implements OnInit, OnDestroy {
  orderId = input.required<string>();
  closed = output<void>();

  constructor(private orderService: OrderService) {}

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

  deleteOrder(): void {
    const order = this.order;
    if (!order) {
      return;
    }

    const label =
      order.orderNumber != null ? `order #${order.orderNumber}` : 'this order';
    const confirmed = confirm(`Delete ${label}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.orderService.deleteOrder(order.id);
    this.close();
  }

  reopenOrder(): void {
    const order = this.order;
    if (!order) {
      return;
    }

    this.orderService.reopenOrder(order.id);
    this.close();
  }
}
