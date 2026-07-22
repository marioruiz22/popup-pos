import { Injectable } from '@angular/core';
import { Product } from '../models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private products: Product[] = [
    {
      id: 'taco',
      name: 'Taco',
      price: 3,
      active: true
    },
    {
      id: 'burrito',
      name: 'Burrito',
      price: 8,
      active: true
    },
    {
      id: 'soda',
      name: 'Soda',
      price: 2,
      active: true
    },
    {
      id: 'cookie',
      name: 'Cookie',
      price: 1,
      active: true
    }
  ];

  getProducts(): Product[] {
    return this.products.filter(product => product.active);
  }
}