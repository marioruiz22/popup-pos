import { Component, signal } from '@angular/core';
import { ProductGrid } from './components/products/product-grid/product-grid';
import { OrderEditor } from './components/orders/order-editor/order-editor';
import { OrderList } from './components/orders/order-list/order-list';

@Component({
  selector: 'app-root',
  imports: [
    ProductGrid,
    OrderEditor,
    OrderList
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('popup-pos');
}