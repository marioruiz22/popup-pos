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

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private products: Product[] = [];

  constructor() {
    this.load();
  }

  getProducts(): Product[] {
    return this.products.filter((product) => product.active);
  }

  private load(): void {
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
    this.save();
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.products));
  }
}
