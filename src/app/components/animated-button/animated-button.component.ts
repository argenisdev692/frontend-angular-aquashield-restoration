import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-button',
  imports: [CommonModule],
  templateUrl: './animated-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './animated-button.component.css',
})
export class AnimatedButtonComponent {
  text = input.required<string>();
  variant = input<'primary' | 'secondary' | 'accent'>('primary');
  icon = input<string>('');
  onClick = output<void>();

  getButtonClasses(): string {
    return `animated-button ${this.variant()}`;
  }
}
