import { Component, inject } from '@angular/core';
import { ProductService } from '../../../services/product.service';
import { Product } from '../../../models/product';
import { OrderService } from '../../../services/order.service';
import { nameInitial } from '../../../utils/image.util';

@Component({
  selector: 'app-product-grid',
  imports: [],
  templateUrl: './product-grid.html',
  styleUrl: './product-grid.scss',
})
export class ProductGrid {
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);

  readonly nameInitial = nameInitial;
  readonly products = this.productService.activeProducts;

  addProduct(product: Product): void {
    this.orderService.addProduct(product);
  }
}
