import { ChangeDetectionStrategy, Component, computed, inject, resource, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CampaignsFeatureService } from '../services/campaigns-feature.service';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { PhoneFormatDirective } from '../../../shared/directives/phone-format.directive';
import {
  AI_PROVIDERS,
  CampaignAiProvider,
  CampaignTopic,
  DURATIONS,
  FUNNEL_STAGES,
  FunnelStage,
  GenerateTopicsResponse,
  LANGUAGES,
  VIDEO_FORMATS,
  VideoDuration,
  VideoFormat,
} from '../models/campaigns.types';

@Component({
  selector: 'app-campaigns-generator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, PageHeaderComponent, SidebarComponent, PhoneFormatDirective],
  templateUrl: './campaigns-generator.component.html',
  styleUrl: './campaigns-generator.component.css',
})
export class CampaignsGeneratorComponent {
  private service = inject(CampaignsFeatureService);
  private router = inject(Router);

  // ── Static config exposed to the template ──
  readonly formats = VIDEO_FORMATS;
  readonly stages = FUNNEL_STAGES;
  readonly providers = AI_PROVIDERS;
  readonly durations = DURATIONS;
  readonly languages = LANGUAGES;

  readonly drawerVisible = signal(false);

  // ── Wizard state ──
  readonly step = signal<1 | 2>(1);
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMsg = signal('');

  // Company context (companyDataId is required by the generation endpoints).
  readonly companyResource = resource({
    loader: () => this.service.getMyCompanyData(),
  });
  readonly companyId = computed(() => this.companyResource.value()?.id ?? null);
  readonly hasCompany = computed(() => this.companyId() !== null);

  // Step 1 inputs
  readonly niche = signal('');
  readonly location = signal('');
  readonly city = signal('');
  readonly state = signal('');
  readonly country = signal('');
  readonly aiObservation = signal('');
  readonly phone = signal('');
  readonly website = signal('');
  readonly language = signal<string>('es');
  readonly format = signal<VideoFormat>('9:16');
  readonly funnelStage = signal<FunnelStage>('TOFU');
  readonly provider = signal<CampaignAiProvider>('gemini');
  readonly duration = signal<VideoDuration>(15);
  readonly generateImages = signal(false);

  // Step 2 data
  readonly topicsData = signal<GenerateTopicsResponse | null>(null);
  readonly selectedTopic = signal<CampaignTopic | null>(null);

  readonly stageDescription = computed(
    () => this.stages.find((s) => s.id === this.funnelStage())?.description ?? ''
  );

  // ── Step 1: generate topics ──
  async generateTopics(): Promise<void> {
    if (!this.niche().trim()) {
      this.errorMsg.set('Enter your niche first.');
      return;
    }
    if (!this.location().trim()) {
      this.errorMsg.set('Enter a location for the geographic analysis.');
      return;
    }
    this.errorMsg.set('');
    this.loading.set(true);
    try {
      const data = await this.service.generateTopics({
        niche: this.niche().trim(),
        location: this.location().trim(),
        language: this.language(),
        city: this.city().trim() || undefined,
        state: this.state().trim() || undefined,
        country: this.country().trim() || undefined,
        aiObservations: this.aiObservation().trim() || undefined,
      });
      this.topicsData.set(data);
      this.selectedTopic.set(null);
      this.step.set(2);
    } catch {
      this.errorMsg.set('Failed to generate topics. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // ── Step 2: select a topic & enqueue the generation job ──
  selectTopic(topic: CampaignTopic): void {
    this.selectedTopic.set(topic);
  }

  isTopicSelected(topic: CampaignTopic): boolean {
    return this.selectedTopic()?.id === topic.id;
  }

  async generateCampaign(): Promise<void> {
    const topic = this.selectedTopic();
    if (!topic) {
      this.errorMsg.set('Select a topic first.');
      return;
    }
    const companyDataId = this.companyId();
    if (!companyDataId) {
      this.errorMsg.set('Company data is required before generating a campaign.');
      return;
    }
    this.errorMsg.set('');
    this.submitting.set(true);
    try {
      await this.service.generateCampaign({
        aiProvider: this.provider(),
        companyDataId,
        topicId: String(topic.id),
        niche: this.niche().trim(),
        location: this.location().trim(),
        phone: this.phone().trim(),
        stages: [this.funnelStage()],
        format: this.format(),
        durationSeconds: this.duration(),
        language: this.language(),
        generateImages: this.generateImages(),
        city: this.city().trim() || undefined,
        state: this.state().trim() || undefined,
        country: this.country().trim() || undefined,
        website: this.website().trim() || undefined,
        aiObservations: this.aiObservation().trim() || undefined,
      });
      // The job runs in the background; the persisted generation appears in the
      // list with a pending/processing status and exposes ZIP links when ready.
      this.router.navigate(['/campaigns']);
    } catch {
      this.errorMsg.set('Failed to start campaign generation. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  goToStep(step: 1 | 2): void {
    this.step.set(step);
  }
}
