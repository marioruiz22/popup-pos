import { ChangeDetectorRef, Component, OnDestroy, OnInit, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductInput, ProductService } from '../../../services/product.service';
import { fileToProductImageDataUrl, nameInitial } from '../../../utils/image.util';

@Component({
  selector: 'app-product-editor-panel',
  imports: [FormsModule],
  templateUrl: './product-editor-panel.html',
  styleUrl: './product-editor-panel.scss',
})
export class ProductEditorPanel implements OnInit, OnDestroy {
  productId = input<string | null>(null);
  closed = output<void>();
  saved = output<void>();

  imageError = '';
  imageProcessing = false;
  form: ProductInput = this.createEmptyForm();

  constructor(
    private productService: ProductService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    document.body.classList.add('checkout-open');
    this.loadProduct();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('checkout-open');
  }

  get isEditing(): boolean {
    return this.productId() !== null;
  }

  get title(): string {
    return this.isEditing ? 'Edit Product' : 'New Product';
  }

  get hasImage(): boolean {
    return Boolean(this.form.imageUrl?.trim());
  }

  get imageInitial(): string {
    return nameInitial(this.form.name);
  }

  close(): void {
    this.closed.emit();
  }

  submit(): void {
    if (this.imageProcessing) {
      return;
    }

    const productId = this.productId();
    const result = productId
      ? this.productService.updateProduct(productId, this.form)
      : this.productService.addProduct(this.form);

    if (result) {
      this.saved.emit();
      this.close();
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

  private loadProduct(): void {
    const productId = this.productId();
    if (!productId) {
      this.form = this.createEmptyForm();
      return;
    }

    const product = this.productService.getProductById(productId);
    if (!product) {
      this.close();
      return;
    }

    this.form = {
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl ?? '',
      active: product.active,
    };
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
