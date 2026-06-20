import {
  Component,
  inject,
  input,
  signal,
  computed,
  resource,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { RetellCallsFeatureService } from '../services/retell-calls-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { ConfirmService } from '../../../shared/notifications/confirm.service';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { CallResponse } from '../models/retell-calls.types';

@Component({
  selector: 'app-retell-calls-detail',
  imports: [DatePipe, PageHeaderComponent, SidebarComponent],
  templateUrl: './retell-calls-detail.component.html',
  styleUrl: './retell-calls-detail.component.css',
})
export class RetellCallsDetailComponent {
  private service = inject(RetellCallsFeatureService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);
  private notify = inject(NotificationService);

  /** Route param `:id`, bound via withComponentInputBinding() (v22). */
  readonly id = input.required<string>();

  readonly drawerVisible = signal(false);
  readonly callId = computed(() => this.id());

  readonly callResource = resource({
    params: () => this.id(),
    loader: async ({ params: id }) => {
      const call = await this.service.getById(id);
      // Opening the detail marks the call as read (fire-and-forget).
      if (!call.isRead && call.deletedAt === null) {
        this.service.markRead(call.id).catch(() => undefined);
      }
      return call;
    },
  });

  readonly call = computed(() => this.callResource.value());
  readonly isLoading = computed(() => this.callResource.isLoading());

  readonly isDeleted = computed(() => this.call()?.deletedAt !== null);

  /** Title for the page header: "Inbound · +1…" or a fallback. */
  readonly title = computed(() => {
    const c = this.call();
    if (!c) return 'Call Detail';
    const dir = c.direction ? this.titleCase(c.direction) : 'Call';
    const counterpart = c.fromNumber ?? c.toNumber;
    return counterpart ? `${dir} · ${counterpart}` : dir;
  });

  /** Duration (stored in ms) formatted as "m:ss" or em dash. */
  readonly duration = computed(() => {
    const ms = this.call()?.durationMs;
    if (ms == null) return '—';
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  readonly sentimentClass = computed(() => {
    switch (this.call()?.userSentiment) {
      case 'Positive':
        return 'sentiment-chip sentiment-chip-positive';
      case 'Negative':
        return 'sentiment-chip sentiment-chip-negative';
      case 'Neutral':
        return 'sentiment-chip sentiment-chip-neutral';
      default:
        return 'sentiment-chip';
    }
  });

  private titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  onDelete(): void {
    this.confirm.confirm({
      variant: 'danger',
      title: 'Delete call',
      message: 'Are you sure you want to delete this call record? You can restore it later.',
      confirmLabel: 'Delete',
      busyLabel: 'Deleting…',
      successMessage: 'Call deleted',
      action: async () => {
        await this.service.delete(this.callId());
        this.router.navigate(['/retell-calls']);
      },
    });
  }

  onRestore(): void {
    this.confirm.confirm({
      variant: 'success',
      title: 'Restore call',
      message: 'Restore this call record?',
      confirmLabel: 'Restore',
      busyLabel: 'Restoring…',
      successMessage: 'Call restored',
      action: async () => {
        await this.service.restore(this.callId());
        this.callResource.reload();
      },
    });
  }

  onBack(): void {
    this.router.navigate(['/retell-calls']);
  }

  async onCopyTranscript(): Promise<void> {
    const transcript = this.call()?.transcript;
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      this.notify.success('Transcript copied');
    } catch (error) {
      this.notify.error(error, 'Copy failed');
    }
  }
}
