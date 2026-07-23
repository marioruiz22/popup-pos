import { Component } from '@angular/core';
import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { ProductEditorPanel } from '../../components/products/product-editor-panel/product-editor-panel';
import { nameInitial } from '../../utils/image.util';

@Component({
  selector: 'app-products-page',
  imports: [ProductEditorPanel],
  templateUrl: './products.page.html',
  styleUrl: './products.page.scss',
})
export class ProductsPage {
  readonly productInitial = nameInitial;

  editorOpen = false;
  editingProductId: string | null = null;

  constructor(private productService: ProductService) {}

  get products(): Product[] {
    return this.productService.getAllProducts();
  }

  openNewProduct(): void {
    this.editingProductId = null;
    this.editorOpen = true;
  }

  openProduct(product: Product): void {
    this.editingProductId = product.id;
    this.editorOpen = true;
  }

  closeEditor(): void {
    this.editorOpen = false;
    this.editingProductId = null;
  }
}
