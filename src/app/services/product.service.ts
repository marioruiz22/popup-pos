import { Injectable } from '@angular/core';
import { Product } from '../models/product';

const STORAGE_KEY = 'popup-pos-products';

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'taco',
    name: 'Taco',
    price: 3,
    active: true,
  },
  {
    id: 'burrito',
    name: 'Burrito',
    price: 8,
    active: true,
  },
  {
    id: 'soda',
    name: 'Soda',
    price: 2,
    active: true,
  },
  {
    id: 'cookie',
    name: 'Cookie',
    price: 1,
    active: true,
  },
];

export interface ProductInput {
  name: string;
  price: number;
  imageUrl?: string;
  active: boolean;
}

/**
 * Product catalog.
 * Today: localStorage. Later: Firestore is the source of truth.
 */
@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private products: Product[] = [];

  constructor() {
    this.loadProducts();
  }

  getProducts(): Product[] {
    return this.sortByName(this.products.filter((product) => product.active));
  }

  getAllProducts(): Product[] {
    return this.sortByName([...this.products]);
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((product) => product.id === id);
  }

  addProduct(input: ProductInput): Product | null {
    const product = this.toProduct(crypto.randomUUID(), input);
    if (!product) {
      return null;
    }

    this.products.push(product);
    this.persistProducts();
    return product;
  }

  updateProduct(id: string, input: ProductInput): Product | null {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) {
      return null;
    }

    const product = this.toProduct(id, input);
    if (!product) {
      return null;
    }

    this.products[index] = product;
    this.persistProducts();
    return product;
  }

  setProductActive(id: string, active: boolean): void {
    const product = this.products.find((item) => item.id === id);
    if (!product) {
      return;
    }

    product.active = active;
    this.persistProducts();
  }

  deleteProduct(id: string): boolean {
    const index = this.products.findIndex((product) => product.id === id);
    if (index === -1) {
      return false;
    }

    this.products.splice(index, 1);
    this.persistProducts();
    return true;
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

  private sortByName(products: Product[]): Product[] {
    return products.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  /**
   * Loads the product catalog into memory.
   * TODO(firebase): Replace localStorage read with a Firestore products collection
   * subscription (or one-shot fetch + optional local cache for offline).
   */
  private loadProducts(): void {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const data = JSON.parse(raw) as Product[];

        if (Array.isArray(data) && data.length > 0) {
          this.products = data;
          return;
        }
      } catch {
        // Fall through to defaults when stored data is invalid.
      }
    }

    this.products = DEFAULT_PRODUCTS.map((product) => ({ ...product }));
    this.persistProducts();
  }

  /**
   * Persists the in-memory catalog.
   * TODO(firebase): Write creates/updates/deletes to Firestore instead of (or in
   * addition to) localStorage. Keep UI calling add/update/delete methods unchanged.
   */
  private persistProducts(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products));
  }
}
