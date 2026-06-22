import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { PhoneFormatDirective } from '../../shared/directives/phone-format.directive';
import {
  AddressAutocompleteDirective,
  PlaceSelection,
} from '../../shared/directives/address-autocomplete.directive';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { ymdToLocalDate, localDateToYmd } from '../../shared/date.util';
import { AuthFeatureService } from '../../features/auth/services/auth.service';
import { NotificationService } from '../../shared/notifications/notification.service';
import { ConfirmService } from '../../shared/notifications/confirm.service';
import {
  AuthSessionsFeatureService,
  SessionView,
  TrustedDeviceView,
} from '../../features/auth/services/sessions.service';
import { AuthService as GeneratedAuthService } from '../../api/services/auth.service';
import { ApiConfiguration } from '../../api/api-configuration';
import { joinApiUrl } from '../../api/api-url';
import { UserResponse } from '../../api/models/user-response';
import { UpdateProfileDto } from '../../api/models/update-profile-dto';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { PageHeaderComponent } from '../../components/page-header/page-header.component';
import { FormSubmitButtonComponent } from '../../components/form-submit-button/form-submit-button.component';
import { ImageCropperDialogComponent } from '../../components/image-cropper-dialog/image-cropper-dialog.component';
import { FloatingMenuButtonComponent } from '../../components/floating-menu-button/floating-menu-button.component';

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PanelModule,
    SidebarComponent,
    PageHeaderComponent,
    FormSubmitButtonComponent,
    ImageCropperDialogComponent,
    FloatingMenuButtonComponent,
    DialogModule,
    DatePickerModule,
    PhoneFormatDirective,
    AddressAutocompleteDirective,
  ],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  private authFeatureService = inject(AuthFeatureService);
  private sessionsService = inject(AuthSessionsFeatureService);
  private generatedAuthService = inject(GeneratedAuthService);
  private http = inject(HttpClient);
  private config = inject(ApiConfiguration);
  protected router = inject(Router);
  private notify = inject(NotificationService);
  private confirm = inject(ConfirmService);

  protected readonly drawerVisible = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly user = this.authFeatureService.currentUser;
  protected readonly isEditing = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly cropperVisible = signal(false);
  protected readonly cropperImageUrl = signal<string | null>(null);

  protected readonly totpSetupVisible = signal(false);
  protected readonly totpSetupLoading = signal(false);
  protected readonly totpSetupData = signal<{
    qrCodeUrl: string;
    secret: string;
    manualEntryKey?: string;
  } | null>(null);
  protected readonly totpCode = signal('');
  protected readonly savingTotp = signal(false);

  protected readonly backupCodesVisible = signal(false);
  protected readonly backupCodes = signal<string[]>([]);

  // ── Active sessions & trusted devices ──
  protected readonly sessions = signal<SessionView[]>([]);
  protected readonly trustedDevices = signal<TrustedDeviceView[]>([]);
  protected readonly loadingSessions = signal(false);
  protected readonly loadingDevices = signal(false);
  protected readonly revokingId = signal<string | null>(null);
  protected readonly loggingOutAll = signal(false);

  // ── Address autocomplete (Google Maps, USA only) ──
  protected readonly mapsLoading = signal(false);
  protected readonly mapsError = signal<string | null>(null);

  protected editForm: Partial<UpdateProfileDto> = {};
  /** Date-of-birth bound to the PrimeNG datepicker; mirrored into
   *  `editForm.dateOfBirth` (YYYY-MM-DD) on save. */
  protected dobDate: Date | null = null;
  protected passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  protected readonly canUpdatePassword = computed(() => {
    return (
      !!this.passwordForm.currentPassword &&
      !!this.passwordForm.newPassword &&
      !!this.passwordForm.confirmPassword
    );
  });

  async ngOnInit(): Promise<void> {
    await this.loadUser();
    // Load sessions/devices in the background — failures must not block the page.
    this.loadSessions();
    this.loadTrustedDevices();
  }

  async loadUser(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await this.authFeatureService.fetchCurrentUser();
      this.resetEditForm();
    } catch {
      this.error.set('Failed to load user profile');
    } finally {
      this.loading.set(false);
    }
  }

  protected readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '?';
    const first = u.name?.charAt(0) ?? '';
    const last = u.lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || (u.username?.charAt(0) ?? '').toUpperCase();
  });

  toggleEdit(): void {
    this.isEditing.update((v) => !v);
    if (this.isEditing()) {
      this.resetEditForm();
    }
  }

  private resetEditForm(): void {
    const u = this.user();
    this.editForm = {
      name: u?.name ?? undefined,
      lastName: u?.lastName ?? undefined,
      username: u?.username ?? undefined,
      phone: u?.phone ?? undefined,
      dateOfBirth: u?.dateOfBirth ?? undefined,
      gender: (u?.gender as UpdateProfileDto['gender']) ?? undefined,
      address: u?.address ?? undefined,
      city: u?.city ?? undefined,
      state: u?.state ?? undefined,
      zipCode: u?.zipCode ?? undefined,
      country: u?.country ?? undefined,
    };
    this.dobDate = ymdToLocalDate(u?.dateOfBirth);
  }

  /** Autofill address fields from a Google Places selection (USA only). */
  onPlaceSelected(place: PlaceSelection): void {
    this.editForm = {
      ...this.editForm,
      address: place.address,
      city: place.city,
      state: place.state,
      zipCode: place.zipcode,
      country: place.country,
    };
  }

  /** Clearing the street input wipes the autofilled dependent fields. */
  onAddressCleared(): void {
    this.editForm = {
      ...this.editForm,
      city: '',
      state: '',
      zipCode: '',
      country: '',
    };
  }

  async saveProfile(): Promise<void> {
    this.savingProfile.set(true);
    this.editForm.dateOfBirth = localDateToYmd(this.dobDate);
    try {
      await this.generatedAuthService.authControllerUpdateMe({
        body: this.editForm as UpdateProfileDto,
      });
      await this.authFeatureService.fetchCurrentUser();
      this.isEditing.set(false);
      this.notify.success('Profile updated successfully');
    } catch (e) {
      this.notify.error(e, 'Failed to update profile');
    } finally {
      this.savingProfile.set(false);
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.cropperImageUrl.set(reader.result as string);
      this.cropperVisible.set(true);
    };
    reader.readAsDataURL(file);

    // reset input so same file can be selected again
    input.value = '';
  }

  async onCropped(blob: Blob): Promise<void> {
    const formData = new FormData();
    formData.append('file', blob, 'profile-photo.jpg');

    try {
      await firstValueFrom(
        this.http.post(joinApiUrl(this.config.rootUrl, '/api/v1/auth/me/profile-photo'), formData),
      );
      await this.authFeatureService.fetchCurrentUser();
      this.cropperImageUrl.set(null);
      this.notify.success('Profile photo updated');
    } catch (e) {
      this.notify.error(e, 'Failed to upload photo');
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.notify.warn('Passwords do not match');
      return;
    }
    if (!this.passwordForm.newPassword || this.passwordForm.newPassword.length < 8) {
      this.notify.warn('Password must be at least 8 characters');
      return;
    }

    this.savingPassword.set(true);
    try {
      // Note: the generated ChangePasswordDto requires a token field which is for reset flow.
      // For authenticated password change, the backend may expect a different shape.
      // Using raw HttpClient for authenticated change-password to avoid DTO mismatch.
      await firstValueFrom(
        this.http.post(joinApiUrl(this.config.rootUrl, '/api/v1/auth/change-password'), {
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword,
          passwordConfirmation: this.passwordForm.confirmPassword,
        }),
      );
      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      this.notify.success('Password changed successfully');
    } catch (e) {
      this.notify.error(e, 'Failed to change password');
    } finally {
      this.savingPassword.set(false);
    }
  }

  async logoutAll(): Promise<void> {
    this.loggingOutAll.set(true);
    try {
      await this.generatedAuthService.authControllerLogoutAll();
      this.notify.success('All other sessions have been logged out');
      this.loadSessions();
    } catch (e) {
      this.notify.error(e, 'Failed to logout other sessions');
    } finally {
      this.loggingOutAll.set(false);
    }
  }

  async loadSessions(): Promise<void> {
    this.loadingSessions.set(true);
    try {
      this.sessions.set(await this.sessionsService.listSessions());
    } catch {
      this.sessions.set([]);
    } finally {
      this.loadingSessions.set(false);
    }
  }

  async loadTrustedDevices(): Promise<void> {
    this.loadingDevices.set(true);
    try {
      this.trustedDevices.set(await this.sessionsService.listTrustedDevices());
    } catch {
      this.trustedDevices.set([]);
    } finally {
      this.loadingDevices.set(false);
    }
  }

  async revokeSession(id: string): Promise<void> {
    this.revokingId.set(id);
    try {
      await this.sessionsService.revokeSession(id);
      this.sessions.update((list) => list.filter((s) => s.id !== id));
      this.notify.success('Session revoked');
    } catch (e) {
      this.notify.error(e, 'Failed to revoke session');
    } finally {
      this.revokingId.set(null);
    }
  }

  async revokeTrustedDevice(id: string): Promise<void> {
    this.revokingId.set(id);
    try {
      await this.sessionsService.revokeTrustedDevice(id);
      this.trustedDevices.update((list) => list.filter((d) => d.id !== id));
      this.notify.success('Device removed');
    } catch (e) {
      this.notify.error(e, 'Failed to remove device');
    } finally {
      this.revokingId.set(null);
    }
  }

  async revokeAllTrustedDevices(): Promise<void> {
    try {
      await this.sessionsService.revokeAllTrustedDevices();
      this.trustedDevices.set([]);
      this.notify.success('All trusted devices removed');
    } catch (e) {
      this.notify.error(e, 'Failed to remove trusted devices');
    }
  }

  async enableTotp(): Promise<void> {
    this.totpSetupLoading.set(true);
    this.totpSetupVisible.set(true);
    this.totpCode.set('');
    this.totpSetupData.set(null);

    try {
      const data = await firstValueFrom(
        this.http.post<{
          qrCodeUrl: string;
          secret: string;
          manualEntryKey?: string;
        }>(joinApiUrl(this.config.rootUrl, '/api/v1/auth/two-factor/setup'), {}),
      );
      this.totpSetupData.set(data);
    } catch (e) {
      this.notify.error(e, 'Failed to start 2FA setup');
      this.totpSetupVisible.set(false);
    } finally {
      this.totpSetupLoading.set(false);
    }
  }

  async confirmTotpSetup(): Promise<void> {
    const code = this.totpCode().trim();
    if (!code || code.length < 6) {
      this.notify.warn('Enter a valid 6-digit TOTP code');
      return;
    }

    this.savingTotp.set(true);
    try {
      await this.http
        .post(joinApiUrl(this.config.rootUrl, '/api/v1/auth/two-factor/enable'), { code })
        .toPromise();
      this.totpSetupVisible.set(false);
      this.totpCode.set('');
      this.totpSetupData.set(null);
      await this.authFeatureService.fetchCurrentUser();
      this.notify.success('Two-factor authentication enabled successfully');
    } catch (e) {
      this.notify.error(e, 'Invalid TOTP code. Please try again.');
    } finally {
      this.savingTotp.set(false);
    }
  }

  disableTotp(): void {
    this.confirm.confirm({
      variant: 'danger',
      title: 'Disable two-factor authentication',
      message: 'Disabling 2FA lowers your account security. Are you sure you want to continue?',
      confirmLabel: 'Disable 2FA',
      busyLabel: 'Disabling…',
      successMessage: 'Two-factor authentication disabled',
      action: async () => {
        await firstValueFrom(
          this.http.post(joinApiUrl(this.config.rootUrl, '/api/v1/auth/two-factor/disable'), {}),
        );
        await this.authFeatureService.fetchCurrentUser();
      },
    });
  }

  async regenerateBackupCodes(): Promise<void> {
    try {
      const data = await firstValueFrom(
        this.http.post<{ backupCodes: string[] }>(
          joinApiUrl(this.config.rootUrl, '/api/v1/auth/two-factor/backup-codes/regenerate'),
          {},
        ),
      );
      this.backupCodes.set(data.backupCodes);
      this.backupCodesVisible.set(true);
      this.notify.success('Backup codes regenerated');
    } catch (e) {
      this.notify.error(e, 'Failed to regenerate backup codes');
    }
  }

  closeTotpSetup(): void {
    this.totpSetupVisible.set(false);
    this.totpCode.set('');
    this.totpSetupData.set(null);
  }
}
