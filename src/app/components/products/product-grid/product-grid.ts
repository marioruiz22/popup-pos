import { Component } from '@angular/core';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../models/product';
import { OrderService } from '../../../services/order.service';

@Component({
  selector: 'app-product-grid',
  imports: [],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.scss'
})
export class ProductGrid {

  products: Product[];

  constructor(
    private productService: ProductService,
    private orderService: OrderService
  ) {
    this.products = this.productService.getProducts();
  }

  addProduct(product: Product) {
    this.orderService.addProduct(product);
  }
}