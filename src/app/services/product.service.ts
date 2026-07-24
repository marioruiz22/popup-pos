import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { Product } from '../models/product';
import { FIRESTORE } from '../firebase/firebase.providers';
import { PopupSessionService } from './popup-session.service';

export interface ProductInput {
  name: string;
  price: number;
  imageUrl?: string;
  active: boolean;
}

interface ProductDoc {
  name: string;
  price: number;
  imageUrl?: string;
  active: boolean;
}

/**
 * Product catalog for the current popup.
 * Source of truth: Firestore `popups/{popupId}/products/{productId}`.
 */
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly firestore = inject(FIRESTORE);
  private readonly popupSession = inject(PopupSessionService);

  private readonly catalog = signal<Product[]>([]);
  private readonly errorMessage = signal<string | null>(null);
  private unsubscribe: Unsubscribe | null = null;
  private boundPopupId: string | null = null;

  /** Active products for the POS grid (reactive). */
  readonly activeProducts = computed(() =>
    this.sortByName(this.catalog().filter((product) => product.active))
  );

  /** All products for management UI (reactive). */
  readonly allProducts = computed(() => this.sortByName([...this.catalog()]));

  readonly lastError = computed(() => this.errorMessage());

  constructor() {
    effect(() => {
      const popupId = this.popupSession.currentPopupId();
      untracked(() => this.bindToPopup(popupId));
    });
  }

  getProducts(): Product[] {
    return this.activeProducts();
  }

  getAllProducts(): Product[] {
    return this.allProducts();
  }

  getProductById(id: string): Product | undefined {
    return this.catalog().find((product) => product.id === id);
  }

  async addProduct(input: ProductInput): Promise<Product | null> {
    const popupId = this.popupSession.getPopupId();
    if (!popupId) {
      this.errorMessage.set('Join a popup before managing products.');
      return null;
    }

    const product = this.toProduct(crypto.randomUUID(), input);
    if (!product) {
      return null;
    }

    try {
      await setDoc(this.productDocRef(popupId, product.id), this.toDoc(product));
      this.upsertLocal(product);
      this.errorMessage.set(null);
      return product;
    } catch {
      this.errorMessage.set('Could not save product. Check your connection and try again.');
      return null;
    }
  }

  async updateProduct(id: string, input: ProductInput): Promise<Product | null> {
    const popupId = this.popupSession.getPopupId();
    if (!popupId) {
      this.errorMessage.set('Join a popup before managing products.');
      return null;
    }

    if (!this.catalog().some((product) => product.id === id)) {
      return null;
    }

    const product = this.toProduct(id, input);
    if (!product) {
      return null;
    }

    try {
      await setDoc(this.productDocRef(popupId, product.id), this.toDoc(product));
      this.upsertLocal(product);
      this.errorMessage.set(null);
      return product;
    } catch {
      this.errorMessage.set('Could not update product. Check your connection and try again.');
      return null;
    }
  }

  async setProductActive(id: string, active: boolean): Promise<void> {
    const existing = this.getProductById(id);
    if (!existing) {
      return;
    }

    await this.updateProduct(id, {
      name: existing.name,
      price: existing.price,
      imageUrl: existing.imageUrl,
      active,
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    const popupId = this.popupSession.getPopupId();
    if (!popupId) {
      this.errorMessage.set('Join a popup before managing products.');
      return false;
    }

    if (!this.catalog().some((product) => product.id === id)) {
      return false;
    }

    try {
      await deleteDoc(this.productDocRef(popupId, id));
      this.catalog.update((products) => products.filter((product) => product.id !== id));
      this.errorMessage.set(null);
      return true;
    } catch {
      this.errorMessage.set('Could not delete product. Check your connection and try again.');
      return false;
    }
  }

  private bindToPopup(popupId: string | null): void {
    if (popupId === this.boundPopupId && this.unsubscribe) {
      return;
    }

    this.teardownListener();
    this.boundPopupId = popupId;
    this.errorMessage.set(null);

    if (!popupId) {
      this.catalog.set([]);
      return;
    }

    try {
      const productsRef = collection(this.firestore, 'popups', popupId, 'products');
      this.unsubscribe = onSnapshot(
        productsRef,
        (snapshot) => {
          const products: Product[] = snapshot.docs.map((productDoc) =>
            this.fromDoc(productDoc.id, productDoc.data() as ProductDoc)
          );
          this.catalog.set(products);
          this.errorMessage.set(null);
        },
        () => {
          // Keep last known catalog if we had one; otherwise empty.
          this.errorMessage.set('Could not load products from the cloud.');
          if (this.boundPopupId !== popupId) {
            return;
          }
          if (this.catalog().length === 0) {
            this.catalog.set([]);
          }
        }
      );
    } catch {
      this.catalog.set([]);
      this.errorMessage.set('Could not load products from the cloud.');
    }
  }

  private teardownListener(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private productDocRef(popupId: string, productId: string) {
    return doc(this.firestore, 'popups', popupId, 'products', productId);
  }

  private upsertLocal(product: Product): void {
    this.catalog.update((products) => {
      const index = products.findIndex((item) => item.id === product.id);
      if (index === -1) {
        return [...products, product];
      }
      const next = [...products];
      next[index] = product;
      return next;
    });
  }

  private toProduct(id: string, input: ProductInput): Product | null {
    const name = input.name.trim();
    if (!name || Number.isNaN(input.price) || input.price < 0) {
      return null;
    }

    const imageUrl = input.imageUrl?.trim();

    return {
      id,
      name,
      price: input.price,
      imageUrl: imageUrl || undefined,
      active: input.active,
    };
  }

  private toDoc(product: Product): ProductDoc {
    const docData: ProductDoc = {
      name: product.name,
      price: product.price,
      active: product.active,
    };

    if (product.imageUrl) {
      docData.imageUrl = product.imageUrl;
    }

    return docData;
  }

  private fromDoc(id: string, data: ProductDoc): Product {
    return {
      id,
      name: typeof data.name === 'string' ? data.name : '',
      price: typeof data.price === 'number' ? data.price : 0,
      imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : undefined,
      active: data.active !== false,
    };
  }

  private sortByName(products: Product[]): Product[] {
    return products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }
}
