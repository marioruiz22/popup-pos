import { Component } from '@angular/core';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../models/product';
import { OrderService } from '../../../services/order.service';
import { nameInitial } from '../../../utils/image.util';

@Component({
  selector: 'app-product-grid',
  imports: [],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.scss'
})
export class ProductGrid {
  readonly nameInitial = nameInitial;

  constructor(
    private productService: ProductService,
    private orderService: OrderService
  ) {}

  get products(): Product[] {
    return this.productService.getProducts();
  }

  addProduct(product: Product) {
    this.orderService.addProduct(product);
  }
}