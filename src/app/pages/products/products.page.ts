import { Component } from '@angular/core';
import { ProductManagement } from '../../components/products/product-management/product-management';

@Component({
  selector: 'app-products-page',
  imports: [ProductManagement],
  templateUrl: './products.page.html',
  styleUrl: './products.page.scss',
})
export class ProductsPage {}
