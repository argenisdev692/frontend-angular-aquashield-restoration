import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthFeatureService } from '../../features/auth/services/auth.service';
import { AuthService as GeneratedAuthService } from '../../api/services/auth.service';
import { ApiConfiguration } from '../../api/api-configuration';
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
    ToastModule,
    SidebarComponent,
    PageHeaderComponent,
    FormSubmitButtonComponent,
    ImageCropperDialogComponent,
    FloatingMenuButtonComponent
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private authFeatureService = inject(AuthFeatureService);
  private generatedAuthService = inject(GeneratedAuthService);
  private http = inject(HttpClient);
  private config = inject(ApiConfiguration);
  protected router = inject(Router);
  private messageService = inject(MessageService);

  protected readonly drawerVisible = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly user = this.authFeatureService.currentUser;
  protected readonly isEditing = signal(false);
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly cropperVisible = signal(false);
  protected readonly cropperImageUrl = signal<string | null>(null);

  protected editForm: Partial<UpdateProfileDto> = {};
  protected passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

  protected readonly canUpdatePassword = computed(() => {
    return !!this.passwordForm.currentPassword &&
           !!this.passwordForm.newPassword &&
           !!this.passwordForm.confirmPassword;
  });

  async ngOnInit(): Promise<void> {
    await this.loadUser();
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
    return (first + last).toUpperCase() || u.username.charAt(0).toUpperCase();
  });

  toggleEdit(): void {
    this.isEditing.update(v => !v);
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
  }

  async saveProfile(): Promise<void> {
    this.savingProfile.set(true);
    try {
      await this.generatedAuthService.authControllerUpdateMe({ body: this.editForm as UpdateProfileDto });
      await this.authFeatureService.fetchCurrentUser();
      this.isEditing.set(false);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update profile' });
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
      const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
      await firstValueFrom(
        this.http.post(`${rootUrl}/api/v1/auth/me/profile-photo`, formData)
      );
      await this.authFeatureService.fetchCurrentUser();
      this.cropperImageUrl.set(null);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Profile photo updated' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload photo' });
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Passwords do not match' });
      return;
    }
    if (!this.passwordForm.newPassword || this.passwordForm.newPassword.length < 8) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Password must be at least 8 characters' });
      return;
    }

    this.savingPassword.set(true);
    try {
      // Note: the generated ChangePasswordDto requires a token field which is for reset flow.
      // For authenticated password change, the backend may expect a different shape.
      // Using raw HttpClient for authenticated change-password to avoid DTO mismatch.
      const rootUrl = (this.config.rootUrl || '').replace(/\/$/, '');
      await firstValueFrom(
        this.http.post(`${rootUrl}/api/v1/auth/change-password`, {
          currentPassword: this.passwordForm.currentPassword,
          newPassword: this.passwordForm.newPassword,
          passwordConfirmation: this.passwordForm.confirmPassword
        })
      );
      this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password changed successfully' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to change password' });
    } finally {
      this.savingPassword.set(false);
    }
  }

  async logoutAll(): Promise<void> {
    try {
      await this.generatedAuthService.authControllerLogoutAll();
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'All other sessions have been logged out' });
    } catch {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to logout other sessions' });
    }
  }

  async enableTotp(): Promise<void> {
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'TOTP setup endpoint is not available in the generated API. Regenerate API without --excludeTags auth:2fa'
    });
  }

  async disableTotp(): Promise<void> {
    this.messageService.add({
      severity: 'info',
      summary: 'Coming Soon',
      detail: 'TOTP disable endpoint is not available in the generated API. Regenerate API without --excludeTags auth:2fa'
    });
  }
}
