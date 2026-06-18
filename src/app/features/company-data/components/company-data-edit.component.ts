import { Component, OnInit, inject, signal, computed, viewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { SignaturePadComponent, NgSignaturePadOptions } from '@almothafar/angular-signature-pad';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { ConfirmService } from '../../../shared/notifications/confirm.service';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { FormSubmitButtonComponent } from '../../../components/form-submit-button/form-submit-button.component';
import { FloatingMenuButtonComponent } from '../../../components/floating-menu-button/floating-menu-button.component';
import { CompanyDataFeatureService, UpdateCompanyDataDto } from '../services/company-data-feature.service';
import { GoogleMapsLoaderService } from '../services/google-maps-loader.service';
import { CompanyDataResponse } from '../../../api/models/company-data-response';

@Component({
  selector: 'app-company-data-edit',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PanelModule,
    SidebarComponent,
    PageHeaderComponent,
    FormSubmitButtonComponent,
    FloatingMenuButtonComponent,
    SignaturePadComponent
  ],
  template: `
    <app-sidebar [visible]="drawerVisible()" (visibleChange)="drawerVisible.set($event)"></app-sidebar>

    <div class="company-data-page">
      <app-page-header
        title="Company Data"
        subtitle="Manage your company information"
        (menuToggle)="drawerVisible.set(true)" />

      <app-floating-menu-button [drawerOpen]="drawerVisible()" (menuToggle)="drawerVisible.set(!drawerVisible())" />

      @if (loading()) {
        <div class="company-loading">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
          <p>Loading company data...</p>
        </div>
      } @else if (error()) {
        <div class="company-error">
          <i class="pi pi-exclamation-circle" style="font-size: 2rem; color: var(--accent-error)"></i>
          <p>{{ error() }}</p>
          <p-button label="Retry" icon="pi pi-refresh" (onClick)="loadCompanyData()" />
        </div>
      } @else {
        <div class="company-grid">
          <div class="company-card">
            <div class="company-card-header">
              <h2 class="card-title">Company Information</h2>
              <button
                class="btn-edit-company"
                [class.cancel-mode]="isEditing()"
                (click)="toggleEdit()">
                <i class="pi" [class.pi-times]="isEditing()" [class.pi-pencil]="!isEditing()"></i>
                {{ isEditing() ? 'Cancel' : 'Edit' }}
              </button>
            </div>

            @if (isEditing()) {
              <div class="company-form">
                <div class="form-row">
                  <div class="form-field">
                    <label for="companyName">Company Name *</label>
                    <input pInputText id="companyName" [(ngModel)]="editForm.companyName" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="name">Display Name</label>
                    <input pInputText id="name" [(ngModel)]="editForm.name" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="email">Email</label>
                    <input pInputText id="email" type="email" [(ngModel)]="editForm.email" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="phone">Phone</label>
                    <input pInputText id="phone" [(ngModel)]="editForm.phone" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="website">Website</label>
                    <input pInputText id="website" [(ngModel)]="editForm.website" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="taxId">Tax ID</label>
                    <input pInputText id="taxId" [(ngModel)]="editForm.taxId" class="form-input" />
                  </div>
                </div>

                <div class="form-row full">
                  <div class="form-field">
                    <label for="address">Address (Google Maps autocomplete)</label>
                    <input
                      #addressInput
                      pInputText
                      id="address"
                      [(ngModel)]="editForm.address"
                      class="form-input"
                      placeholder="Start typing to search..."
                      [disabled]="mapsLoading()" />
                    @if (mapsLoading()) {
                      <span class="maps-hint"><i class="pi pi-spin pi-spinner"></i> Loading maps...</span>
                    }
                    @if (mapsError()) {
                      <span class="maps-hint error">{{ mapsError() }}</span>
                    }
                  </div>
                </div>

                <div class="form-row full">
                  <div class="form-field">
                    <label for="address2">Address 2</label>
                    <input pInputText id="address2" [(ngModel)]="editForm.address2" class="form-input" placeholder="Apt, suite, floor, etc." />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="latitude">Latitude</label>
                    <input pInputText id="latitude" type="number" [ngModel]="editForm.latitude" (ngModelChange)="editForm.latitude = $event === '' ? null : Number($event)" class="form-input" [readonly]="true" />
                  </div>
                  <div class="form-field">
                    <label for="longitude">Longitude</label>
                    <input pInputText id="longitude" type="number" [ngModel]="editForm.longitude" (ngModelChange)="editForm.longitude = $event === '' ? null : Number($event)" class="form-input" [readonly]="true" />
                  </div>
                </div>

                <div class="form-divider"></div>

                <h3 class="section-title">Social Media</h3>
                <div class="form-row">
                  <div class="form-field">
                    <label for="facebookLink">Facebook</label>
                    <input pInputText id="facebookLink" [(ngModel)]="editForm.facebookLink" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="instagramLink">Instagram</label>
                    <input pInputText id="instagramLink" [(ngModel)]="editForm.instagramLink" class="form-input" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-field">
                    <label for="twitterLink">Twitter / X</label>
                    <input pInputText id="twitterLink" [(ngModel)]="editForm.twitterLink" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="linkedinLink">LinkedIn</label>
                    <input pInputText id="linkedinLink" [(ngModel)]="editForm.linkedinLink" class="form-input" />
                  </div>
                </div>

                <div class="form-actions">
                  <app-form-submit-button
                    label="Save Changes"
                    icon="pi-check"
                    [loading]="saving()"
                    (clicked)="saveChanges()" />
                </div>
              </div>
            } @else {
              <div class="company-details">
                <div class="detail-row">
                  <span class="detail-label">Company Name</span>
                  <span class="detail-value">{{ companyData()?.companyName }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Display Name</span>
                  <span class="detail-value">{{ companyData()?.name || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email</span>
                  <span class="detail-value">{{ companyData()?.email || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Phone</span>
                  <span class="detail-value">{{ companyData()?.phone || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Website</span>
                  <span class="detail-value">{{ companyData()?.website || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Tax ID</span>
                  <span class="detail-value">{{ companyData()?.taxId || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Address</span>
                  <span class="detail-value">{{ companyData()?.address || '—' }}</span>
                </div>
                @if (companyData()?.address2) {
                  <div class="detail-row">
                    <span class="detail-label">Address 2</span>
                    <span class="detail-value">{{ companyData()?.address2 }}</span>
                  </div>
                }
                <div class="detail-row">
                  <span class="detail-label">Coordinates</span>
                  <span class="detail-value">
                    @if (companyData()?.latitude != null && companyData()?.longitude != null) {
                      {{ companyData()?.latitude }}, {{ companyData()?.longitude }}
                    } @else {
                      —
                    }
                  </span>
                </div>

                <div class="detail-divider"></div>

                <div class="detail-row">
                  <span class="detail-label">Facebook</span>
                  <span class="detail-value">{{ companyData()?.facebookLink || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Instagram</span>
                  <span class="detail-value">{{ companyData()?.instagramLink || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Twitter / X</span>
                  <span class="detail-value">{{ companyData()?.twitterLink || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">LinkedIn</span>
                  <span class="detail-value">{{ companyData()?.linkedinLink || '—' }}</span>
                </div>
              </div>
            }
          </div>

          <div class="company-card signature-card">
            <div class="company-card-header">
              <h2 class="card-title">Digital Signature</h2>
              @if (!isEditing() && companyData()?.signaturePath) {
                <button class="btn-edit-company" (click)="toggleEdit()">
                  <i class="pi pi-pencil"></i> Edit
                </button>
              }
            </div>

            @if (isEditing()) {
              <div class="signature-edit">
                <signature-pad
                  #signaturePad
                  [options]="signatureOptions()"
                  class="signature-canvas"
                />
                <div class="signature-actions">
                  <button class="btn-secondary-modern" (click)="clearSignature()">
                    <i class="pi pi-eraser"></i> Clear
                  </button>
                  <app-form-submit-button
                    label="Save Signature"
                    icon="pi-check"
                    [loading]="savingSignature()"
                    (clicked)="saveSignature()" />
                </div>
              </div>
            } @else {
              <div class="signature-preview">
                @if (companyData()?.signaturePath) {
                  <img [src]="companyData()?.signaturePath" alt="Company signature" class="signature-image" />
                  <div class="signature-actions-readonly">
                    <button class="btn-action btn-action-delete" (click)="deleteSignature()" title="Delete signature">
                      <i class="pi pi-trash"></i>
                    </button>
                  </div>
                } @else {
                  <div class="signature-empty">
                    <i class="pi pi-pencil" style="font-size: 2rem; color: var(--text-muted)"></i>
                    <p>No signature uploaded yet.</p>
                    <button class="btn-edit-company" (click)="toggleEdit()">
                      <i class="pi pi-pencil"></i> Add Signature
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .company-data-page {
      padding: var(--space-6);
      max-width: 900px;
      margin: 0 auto;
    }

    .company-loading,
    .company-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-4);
      padding: var(--space-16);
      color: var(--text-secondary);
    }

    .company-error p {
      color: var(--accent-error);
    }

    .company-grid {
      display: grid;
      gap: var(--space-6);
    }

    .company-card {
      background: var(--bg-card);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-xl);
      padding: var(--space-6);
    }

    .company-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-6);
    }

    .card-title {
      font-size: var(--text-xl);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    .btn-edit-company {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
      background: transparent;
      color: var(--accent-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-family: var(--font-sans);
      font-weight: var(--font-medium);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: all var(--transition);
    }

    .btn-edit-company:hover {
      background: var(--bg-hover);
      border-color: var(--border-strong);
    }

    .btn-edit-company.cancel-mode {
      color: var(--accent-error);
      border-color: rgba(239, 68, 68, 0.3);
    }

    .company-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    .form-row.full {
      grid-template-columns: 1fr;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .form-field label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--text-secondary);
    }

    .form-input {
      background: var(--input-bg);
      border: 1px solid var(--input-border);
      border-radius: var(--input-radius);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      height: var(--input-height);
      padding: 0 var(--space-3);
      width: 100%;
      transition: border-color var(--transition);
    }

    .form-input:focus {
      outline: none;
      border-color: var(--input-border-focus);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-primary) 15%, transparent);
    }

    .form-input:read-only {
      background: var(--input-bg-disabled);
      color: var(--text-muted);
    }

    .maps-hint {
      font-size: var(--text-xs);
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .maps-hint.error {
      color: var(--accent-error);
    }

    .form-divider {
      height: 1px;
      background: var(--border-default);
      margin: var(--space-2) 0;
    }

    .section-title {
      font-size: var(--text-lg);
      font-weight: var(--font-semibold);
      color: var(--text-primary);
      margin: 0;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--space-4);
    }

    .company-details {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .detail-label {
      font-size: var(--text-sm);
      color: var(--text-muted);
      font-weight: var(--font-medium);
    }

    .detail-value {
      font-size: var(--text-sm);
      color: var(--text-primary);
      text-align: right;
      word-break: break-word;
      max-width: 60%;
    }

    .detail-divider {
      height: 1px;
      background: var(--border-default);
      margin: var(--space-2) 0;
    }

    .signature-edit {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .signature-canvas {
      display: block;
      width: 100%;
      max-width: 500px;
      height: 200px;
      border: 1px dashed var(--border-default);
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      margin: 0 auto;
    }

    .signature-canvas canvas {
      width: 100%;
      height: 100%;
      border-radius: var(--radius-md);
    }

    .signature-actions {
      display: flex;
      justify-content: center;
      gap: var(--space-3);
    }

    .signature-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-4) 0;
    }

    .signature-image {
      max-width: 100%;
      height: auto;
      max-height: 200px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      background: var(--bg-subtle);
    }

    .signature-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-8) 0;
      color: var(--text-muted);
      font-size: var(--text-sm);
    }

    .signature-actions-readonly {
      display: flex;
      gap: var(--space-2);
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-default);
      background: color-mix(in srgb, var(--bg-elevated) 60%, transparent);
      color: var(--text-secondary);
      transition: all var(--transition);
      cursor: pointer;
    }

    .btn-action:hover {
      background: var(--bg-hover);
      border-color: var(--border-strong);
      color: var(--text-primary);
      transform: scale(1.1);
    }

    .btn-action-delete { color: var(--accent-error); }
    .btn-action-delete:hover { border-color: var(--accent-error); }

    .btn-secondary-modern {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      background: transparent;
      color: var(--text-primary);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      font-weight: var(--font-medium);
      font-size: var(--text-sm);
      cursor: pointer;
      transition: all var(--transition);
    }

    .btn-secondary-modern:hover {
      background: var(--bg-hover);
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }

    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
      }

      .company-data-page {
        padding: var(--space-4);
      }
    }
  `]
})
export class CompanyDataEditComponent implements OnInit, OnDestroy {
  private featureService = inject(CompanyDataFeatureService);
  private mapsLoader = inject(GoogleMapsLoaderService);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  protected readonly Number = Number;

  readonly drawerVisible = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly companyData = signal<CompanyDataResponse | null>(null);
  readonly isEditing = signal(false);
  readonly mapsLoading = signal(false);
  readonly mapsError = signal<string | null>(null);

  readonly addressInputRef = viewChild.required<ElementRef<HTMLInputElement>>('addressInput');
  readonly signaturePadRef = viewChild<SignaturePadComponent>('signaturePad');

  readonly savingSignature = signal(false);
  readonly signatureOptions = signal<NgSignaturePadOptions>({
    minWidth: 2,
    maxWidth: 3,
    penColor: '#00B5E2',
    backgroundColor: 'rgba(0,0,0,0)',
    canvasWidth: 500,
    canvasHeight: 200,
  });

  editForm: UpdateCompanyDataDto = {};
  private autocomplete: google.maps.places.Autocomplete | null = null;
  private placeListener: google.maps.MapsEventListener | null = null;

  ngOnInit(): void {
    this.loadCompanyData();
  }

  ngOnDestroy(): void {
    this.detachAutocomplete();
  }

  async loadCompanyData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.featureService.findMyCompanyData();
      this.companyData.set(data);
      this.resetEditForm();
    } catch {
      this.error.set('Failed to load company data');
    } finally {
      this.loading.set(false);
    }
  }

  toggleEdit(): void {
    this.isEditing.update(v => !v);
    if (this.isEditing()) {
      this.resetEditForm();
      this.initAutocomplete();
    } else {
      this.detachAutocomplete();
      this.mapsError.set(null);
    }
  }

  private resetEditForm(): void {
    const d = this.companyData();
    this.editForm = {
      companyName: d?.companyName ?? '',
      name: d?.name ?? null,
      email: d?.email ?? null,
      phone: d?.phone ?? null,
      website: d?.website ?? null,
      taxId: d?.taxId ?? null,
      address: d?.address ?? null,
      address2: d?.address2 ?? null,
      latitude: d?.latitude ?? null,
      longitude: d?.longitude ?? null,
      facebookLink: d?.facebookLink ?? null,
      instagramLink: d?.instagramLink ?? null,
      twitterLink: d?.twitterLink ?? null,
      linkedinLink: d?.linkedinLink ?? null,
    };
  }

  private async initAutocomplete(): Promise<void> {
    this.mapsLoading.set(true);
    this.mapsError.set(null);

    const loaded = await this.mapsLoader.load();
    this.mapsLoading.set(false);

    if (!loaded) {
      this.mapsError.set('Google Maps not available. Address autocomplete is disabled.');
      return;
    }

    // Wait for the input to be rendered
    requestAnimationFrame(() => {
      const input = this.addressInputRef().nativeElement;
      if (!input) return;

      this.autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        fields: ['formatted_address', 'geometry'],
      });

      this.placeListener = this.autocomplete.addListener('place_changed', () => {
        const place = this.autocomplete!.getPlace();
        if (place.geometry?.location) {
          this.editForm.address = place.formatted_address ?? input.value;
          this.editForm.latitude = place.geometry.location.lat();
          this.editForm.longitude = place.geometry.location.lng();
        }
      });
    });
  }

  private detachAutocomplete(): void {
    if (this.placeListener) {
      google.maps.event.removeListener(this.placeListener);
      this.placeListener = null;
    }
    if (this.autocomplete) {
      // Clean up the autocomplete bindings on the input
      const input = this.addressInputRef()?.nativeElement;
      if (input) {
        google.maps.event.clearInstanceListeners(input);
      }
      this.autocomplete = null;
    }
  }

  async saveChanges(): Promise<void> {
    const data = this.companyData();
    if (!data?.id) return;

    if (!this.editForm.companyName || this.editForm.companyName.trim().length === 0) {
      this.notify.warn('Company name is required');
      return;
    }

    this.saving.set(true);
    try {
      const updated = await this.featureService.update(data.id, this.editForm);
      this.companyData.set(updated);
      this.isEditing.set(false);
      this.detachAutocomplete();
      this.notify.success('Company data updated successfully');
    } catch (e) {
      this.notify.error(e, 'Failed to update company data');
    } finally {
      this.saving.set(false);
    }
  }

  clearSignature(): void {
    this.signaturePadRef()?.clear();
  }

  async saveSignature(): Promise<void> {
    const pad = this.signaturePadRef();
    const data = this.companyData();
    if (!pad || !data?.id) return;

    if (pad.isEmpty()) {
      this.notify.warn('Please draw a signature before saving');
      return;
    }

    this.savingSignature.set(true);
    try {
      const base64 = pad.toDataURL('image/png');
      const blob = await (await fetch(base64)).blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const updated = await this.featureService.uploadSignature(data.id, file);
      this.companyData.set(updated);
      this.isEditing.set(false);
      this.notify.success('Signature saved successfully');
    } catch (e) {
      this.notify.error(e, 'Failed to save signature');
    } finally {
      this.savingSignature.set(false);
    }
  }

  deleteSignature(): void {
    const data = this.companyData();
    if (!data?.id || !data.signaturePath) return;

    this.confirm.confirm({
      variant: 'danger',
      title: 'Delete signature',
      message: 'Are you sure you want to delete the company signature?',
      confirmLabel: 'Delete',
      busyLabel: 'Deleting…',
      successMessage: 'Signature deleted successfully',
      action: async () => {
        const updated = await this.featureService.deleteSignature(data.id!);
        this.companyData.set(updated);
      },
    });
  }
}
