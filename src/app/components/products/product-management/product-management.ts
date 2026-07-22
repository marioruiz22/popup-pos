import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../models/product';
import { ProductInput, ProductService } from '../../../services/product.service';

@Component({
  selector: 'app-product-management',
  imports: [FormsModule],
  templateUrl: './product-management.html',
  styleUrl: './product-management.scss',
})
export class ProductManagement {
  editingId: string | null = null;

  form: ProductInput = this.createEmptyForm();

  constructor(private productService: ProductService) {}

  get products(): Product[] {
    return this.productService.getAllProducts();
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  submit(): void {
    if (this.editingId) {
      const updated = this.productService.updateProduct(this.editingId, this.form);
      if (updated) {
        this.resetForm();
      }
      return;
    }

    const created = this.productService.addProduct(this.form);
    if (created) {
      this.resetForm();
    }
  }

  editProduct(product: Product): void {
    this.editingId = product.id;
    this.form = {
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl ?? '',
      active: product.active,
    };
  }

  cancelEdit(): void {
    this.resetForm();
  }

  toggleActive(product: Product): void {
    this.productService.setProductActive(product.id, !product.active);

    if (this.editingId === product.id) {
      this.form.active = product.active;
    }
  }

  private resetForm(): void {
    this.editingId = null;
    this.form = this.createEmptyForm();
  }

  private createEmptyForm(): ProductInput {
    return {
      name: '',
      price: 0,
      imageUrl: '',
      active: true,
    };
  }
}
