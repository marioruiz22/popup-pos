import { Component, HostListener, OnDestroy, inject, signal } from '@angular/core';
import { Product } from '../../models/product';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ProductService } from '../../services/product.service';
import { ProductEditorPanel } from '../../components/products/product-editor-panel/product-editor-panel';
import { nameInitial } from '../../utils/image.util';
import { OverlayHistoryBridge } from '../../utils/overlay-history.util';

@Component({
  selector: 'app-products-page',
  imports: [ProductEditorPanel],
  templateUrl: './products.page.html',
  styleUrl: './products.page.scss',
})
export class ProductsPage implements OnDestroy {
  private readonly productService = inject(ProductService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly editorHistory = new OverlayHistoryBridge('popupPosProductEditor');

  readonly productInitial = nameInitial;
  readonly products = this.productService.allProducts;
  readonly loadError = this.productService.lastError;

  readonly editorOpen = signal(false);
  editingProductId: string | null = null;
  private lastEditingProductId: string | null = null;

  ngOnDestroy(): void {
    this.editorHistory.clearOnDestroy();
  }

  @HostListener('window:popstate')
  onBrowserBack(): void {
    if (this.confirmDialog.isOpen() || this.confirmDialog.matchesHistory()) {
      return;
    }
    if (this.editorHistory.consumeIgnoredPopstate()) {
      return;
    }

    if (this.editorOpen()) {
      if (this.editorHistory.matchesState()) {
        this.editorHistory.adoptCurrentState();
        return;
      }
      this.editorHistory.closeFromPopstate();
      this.editorOpen.set(false);
      this.editingProductId = null;
      return;
    }

    if (this.editorHistory.matchesState()) {
      this.editingProductId = this.lastEditingProductId;
      this.editorOpen.set(true);
      this.editorHistory.adoptCurrentState();
    }
  }

  openNewProduct(): void {
    this.lastEditingProductId = null;
    this.editingProductId = null;
    this.editorOpen.set(true);
    this.editorHistory.push();
  }

  openProduct(product: Product): void {
    this.lastEditingProductId = product.id;
    this.editingProductId = product.id;
    this.editorOpen.set(true);
    this.editorHistory.push();
  }

  closeEditor(): void {
    if (!this.editorOpen()) {
      return;
    }
    this.editorOpen.set(false);
    this.editingProductId = null;
    this.editorHistory.closeFromUi();
  }
}
