import {
  Component,
  signal,
  OnInit,
  computed,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-claims-chart',
  standalone: true,
  imports: [CommonModule, ChartModule],
  templateUrl: './claims-chart.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './claims-chart.component.css',
})
export class ClaimsChartComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);

  readonly currentYear = signal(new Date().getFullYear());

  readonly totalClaims = computed(() =>
    this.chartData().datasets[0].data.reduce((a: number, b: number) => a + b, 0),
  );

  readonly chartData = signal({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'New Claims',
        data: [42, 38, 55, 48, 62, 71, 58, 49, 67, 74, 61, 53],
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 18,
        maxBarThickness: 24,
      },
    ],
  });

  readonly chartOptions = signal<any>({});

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.buildOptions();
    }
  }

  private buildOptions(): void {
    const root = getComputedStyle(document.documentElement);
    const textPrimary = root.getPropertyValue('--text-primary').trim() || '#E8EDF2';
    const textSecondary = root.getPropertyValue('--text-secondary').trim() || '#8A95A5';
    const textMuted = root.getPropertyValue('--text-muted').trim() || '#5E6A7A';
    const borderDefault =
      root.getPropertyValue('--border-default').trim() || 'rgba(232,237,242,0.10)';
    const accentPrimary = root.getPropertyValue('--accent-primary').trim() || '#00B5E2';
    const accentSecondary = root.getPropertyValue('--accent-secondary').trim() || '#0091C7';

    this.chartOptions.set({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(6, 13, 24, 0.92)',
          titleColor: textPrimary,
          bodyColor: textSecondary,
          borderColor: 'rgba(0, 181, 226, 0.25)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => `${ctx.raw} claims`,
          },
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: {
            color: textMuted,
            font: { family: "'Exo', sans-serif", size: 11, weight: '500' },
          },
        },
        y: {
          border: { display: false },
          grid: {
            color: borderDefault,
            drawBorder: false,
          },
          ticks: {
            color: textMuted,
            font: { family: "'Exo', sans-serif", size: 11, weight: '500' },
            padding: 8,
            stepSize: 20,
          },
          beginAtZero: true,
        },
      },
      animation: {
        duration: 1200,
        easing: 'easeOutQuart',
      },
      datasets: {
        bar: {
          backgroundColor: (ctx: any) => {
            const canvas = ctx.chart.ctx;
            const gradient = canvas.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, accentPrimary);
            gradient.addColorStop(1, accentSecondary);
            return gradient;
          },
          hoverBackgroundColor: (ctx: any) => {
            const canvas = ctx.chart.ctx;
            const gradient = canvas.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, '#38CFF0');
            gradient.addColorStop(1, accentPrimary);
            return gradient;
          },
        },
      },
    });
  }
}
