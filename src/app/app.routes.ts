import { Routes } from '@angular/router';
import { popupJoinPageGuard, popupJoinedGuard } from './guards/popup-session.guard';

export const routes: Routes = [
  {
    path: 'join',
    canActivate: [popupJoinPageGuard],
    loadComponent: () => import('./pages/join/join.page').then((m) => m.JoinPage),
  },
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full',
  },
  {
    path: 'pos',
    canActivate: [popupJoinedGuard],
    loadComponent: () => import('./pages/pos/pos.page').then((m) => m.PosPage),
  },
  {
    path: 'orders',
    canActivate: [popupJoinedGuard],
    loadComponent: () => import('./pages/orders/orders.page').then((m) => m.OrdersPage),
  },
  {
    path: 'products',
    canActivate: [popupJoinedGuard],
    loadComponent: () => import('./pages/products/products.page').then((m) => m.ProductsPage),
  },
  {
    path: 'settings',
    canActivate: [popupJoinedGuard],
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'reports',
    redirectTo: 'orders',
  },
  {
    path: '**',
    redirectTo: 'pos',
  },
];
