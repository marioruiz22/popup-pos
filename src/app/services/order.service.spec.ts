import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FIRESTORE } from '../firebase/firebase.providers';
import { OrderService } from './order.service';
import { PopupSessionService } from './popup-session.service';
import { SettingsService } from './settings.service';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrderService,
        { provide: FIRESTORE, useValue: {} },
        {
          provide: PopupSessionService,
          useValue: {
            currentPopupId: signal<string | null>(null),
            getPopupId: () => null,
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getDeviceName: () => '',
          },
        },
      ],
    });
    service = TestBed.inject(OrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
