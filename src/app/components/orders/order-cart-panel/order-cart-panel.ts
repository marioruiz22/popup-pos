import { Component, output } from '@angular/core';
import { OrderEditor } from '../order-editor/order-editor';

@Component({
  selector: 'app-order-cart-panel',
  imports: [OrderEditor],
  templateUrl: './order-cart-panel.html',
  styleUrl: './order-cart-panel.scss',
})
export class OrderCartPanel {
  closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  onOrderCompleted(): void {
    this.close();
  }

  onOrderDeleted(): void {
    this.close();
  }
}
