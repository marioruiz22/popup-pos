import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

type NavIcon = 'products' | 'sell' | 'sales';

interface NavItem {
  path: string;
  label: string;
  icon: NavIcon;
}

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-nav.html',
  styleUrl: './app-nav.scss',
})
export class AppNav {
  readonly navItems: NavItem[] = [
    { path: '/products', label: 'Products', icon: 'products' },
    { path: '/pos', label: 'Sell', icon: 'sell' },
    { path: '/orders', label: 'Sales', icon: 'sales' },
  ];
}
