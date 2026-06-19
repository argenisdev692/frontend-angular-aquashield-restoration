import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-form-submit-button',
  imports: [CommonModule, ButtonModule],
  templateUrl: './form-submit-button.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './form-submit-button.component.css',
})
export class FormSubmitButtonComponent {
  label = input.required<string>();
  icon = input<string>('');
  loading = input<boolean>(false);
  type = input<string>('button');

  clicked = output<void>();

  onClick(): void {
    if (!this.loading()) {
      this.clicked.emit();
    }
  }
}
