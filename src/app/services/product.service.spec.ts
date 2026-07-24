import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FIRESTORE } from '../firebase/firebase.providers';
import { PopupSessionService } from './popup-session.service';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductService,
        { provide: FIRESTORE, useValue: {} },
        {
          provide: PopupSessionService,
          useValue: {
            currentPopupId: signal<string | null>(null),
            getPopupId: () => null,
          },
        },
      ],
    });
    service = TestBed.inject(ProductService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
