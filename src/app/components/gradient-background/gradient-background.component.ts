import {
  Component,
  AfterViewInit,
  ElementRef,
  viewChild,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-gradient-background',
  imports: [CommonModule],
  templateUrl: './gradient-background.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './gradient-background.component.css',
})
export class GradientBackgroundComponent implements AfterViewInit {
  stars = viewChild.required<ElementRef<HTMLDivElement>>('stars');
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    this.generateStars();
  }

  private generateStars(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        --d: ${2 + Math.random() * 5}s;
        --delay: ${Math.random() * 6}s;
        --op: ${0.2 + Math.random() * 0.6};
        width: ${Math.random() > 0.7 ? 3 : 2}px;
        height: ${Math.random() > 0.7 ? 3 : 2}px;
      `;
      this.stars().nativeElement.appendChild(star);
    }
  }
}
