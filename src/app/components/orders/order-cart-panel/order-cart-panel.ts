import { Component, OnDestroy, OnInit, output } from '@angular/core';
import { OrderEditor } from '../order-editor/order-editor';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-order-cart-panel',
  imports: [OrderEditor],
  templateUrl: './order-cart-panel.html',
  styleUrl: './order-cart-panel.scss',
})
export class OrderCartPanel implements OnInit, OnDestroy {
  closed = output<void>();

  constructor(private orderService: OrderService) {}

  ngOnInit(): void {
    document.body.classList.add('checkout-open');
  }

  ngOnDestroy(): void {
    document.body.classList.remove('checkout-open');
  }

  close(): void {
    this.closed.emit();
  }

  deleteOrder(): void {
    const order = this.orderService.getCurrentOrder();
    if (!order) {
      return;
    }

    const confirmed = confirm(`Delete order #${order.orderNumber}? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    this.orderService.deleteOrder(order.id);
    this.close();
  }

  onOrderCompleted(): void {
    this.close();
  }
}
