import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppNav } from './components/layout/app-nav/app-nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppNav],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
