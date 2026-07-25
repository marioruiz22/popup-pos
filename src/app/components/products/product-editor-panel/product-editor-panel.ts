import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { ProductInput, ProductService } from '../../../services/product.service';
import { fileToProductImageDataUrl, nameInitial } from '../../../utils/image.util';
import { isDesktopViewport } from '../../../utils/viewport.util';

@Component({
  selector: 'app-product-editor-panel',
  imports: [FormsModule],
  templateUrl: './product-editor-panel.html',
  styleUrl: './product-editor-panel.scss',
})
export class ProductEditorPanel implements OnInit, OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly confirmDialog = inject(ConfirmDialogService);

  productId = input<string | null>(null);
  closed = output<void>();
  saved = output<void>();
  deleted = output<void>();

  imageError = '';
  imageProcessing = false;
  form: {
    name: string;
    price: number | null;
    imageUrl: string;
    active: boolean;
  } = this.createEmptyForm();

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

  get canSave(): boolean {
    if (this.imageProcessing) {
      return false;
    }

    const name = this.form.name.trim();
    const price = this.form.price;
    return Boolean(name) && price != null && !Number.isNaN(price) && price >= 0;
  }

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (isDesktopViewport()) {
      this.close();
    }
  }

  async deleteProduct(): Promise<void> {
    const productId = this.productId();
    if (!productId) {
      return;
    }

    const product = this.productService.getProductById(productId);
    if (!product) {
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete product',
      message: `Delete "${product.name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) {
      return;
    }

    if (await this.productService.deleteProduct(productId)) {
      this.deleted.emit();
      this.close();
    }
  }

  async submit(): Promise<void> {
    if (!this.canSave) {
      return;
    }

    const input: ProductInput = {
      name: this.form.name,
      price: this.form.price!,
      imageUrl: this.form.imageUrl,
      active: this.form.active,
    };

    const productId = this.productId();
    const result = productId
      ? await this.productService.updateProduct(productId, input)
      : await this.productService.addProduct(input);

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

  clearPrice(): void {
    this.form = {
      ...this.form,
      price: null,
    };
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

  private createEmptyForm() {
    return {
      name: '',
      price: null as number | null,
      imageUrl: '',
      active: true,
    };
  }
}
