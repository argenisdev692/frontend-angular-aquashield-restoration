import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-card',
  imports: [CommonModule],
  templateUrl: './dashboard-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './dashboard-card.component.css',
})
export class DashboardCardComponent {
  title = input.required<string>();
  value = input.required<string>();
  subtitle = input<string>('');
  icon = input<string>('');
  trend = input<'up' | 'down' | 'neutral'>('neutral');
  trendValue = input<string>('');
  color = input<'purple' | 'blue' | 'green' | 'orange' | 'pink'>('purple');

  getCardClasses(): string {
    return `dashboard-card ${this.color()}`;
  }

  getTrendClasses(): string {
    return `card-trend ${this.trend()}`;
  }
}
