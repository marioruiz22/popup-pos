import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Product } from '../../../models/product';
import { ProductInput, ProductService } from '../../../services/product.service';
import { fileToProductImageDataUrl } from '../../../utils/image.util';

@Component({
  selector: 'app-product-management',
  imports: [FormsModule],
  templateUrl: './product-management.html',
  styleUrl: './product-management.scss',
})
export class ProductManagement {
  editingId: string | null = null;
  imageError = '';
  imageProcessing = false;

  form: ProductInput = this.createEmptyForm();

  constructor(
    private productService: ProductService,
    private changeDetector: ChangeDetectorRef
  ) {}

  get products(): Product[] {
    return this.productService.getAllProducts();
  }

  get isEditing(): boolean {
    return this.editingId !== null;
  }

  get hasImage(): boolean {
    return Boolean(this.form.imageUrl?.trim());
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
    this.imageError = '';
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

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.imageError = '';
    this.imageProcessing = true;
    this.changeDetector.detectChanges();

    try {
      this.form = {
        ...this.form,
        imageUrl: await fileToProductImageDataUrl(file),
      };
    } catch {
      this.imageError = 'Could not use that image. Try another photo.';
    } finally {
      this.imageProcessing = false;
      this.changeDetector.detectChanges();
    }
  }

  clearImage(): void {
    this.form = {
      ...this.form,
      imageUrl: '',
    };
    this.imageError = '';
  }

  private resetForm(): void {
    this.editingId = null;
    this.imageError = '';
    this.imageProcessing = false;
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
