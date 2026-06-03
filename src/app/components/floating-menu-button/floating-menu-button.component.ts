import { Component, input, output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signal, computed } from '@angular/core';

@Component({
  selector: 'app-floating-menu-button',
  imports: [CommonModule],
  templateUrl: './floating-menu-button.component.html',
  styleUrl: './floating-menu-button.component.css'
})
export class FloatingMenuButtonComponent {
  drawerOpen = input<boolean>(false);
  menuToggle = output<void>();

  scrollY = signal(0);
  isVisible = computed(() => this.scrollY() > 80);

  @HostListener('window:scroll')
  onScroll(): void {
    if (typeof window !== 'undefined') {
      this.scrollY.set(window.scrollY);
    }
  }

  onClick(): void {
    this.menuToggle.emit();
  }
}
