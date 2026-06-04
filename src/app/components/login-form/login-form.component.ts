import { Component, signal, computed, effect, ElementRef, viewChildren, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ButtonPassThroughOptions } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthFeatureService } from '../../features/auth/services/auth.service';
import { LoginDto } from '../../features/auth/models/auth.types';
import { CompanyDataService } from '../../api/services/company-data.service';
import { CompanyDataResponse } from '../../api/models/company-data-response';

type AuthMethod = 'password' | 'email_otp' | 'totp';

@Component({
  selector: 'app-login-form',
  imports: [CommonModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css'
 
})
export class LoginFormComponent {
  otpInputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');
  totpInputs = viewChildren<ElementRef<HTMLInputElement>>('totpInput');

  buttonPt: ButtonPassThroughOptions = { root: 'submit-button' };

  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthFeatureService);
  private companyDataService = inject(CompanyDataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // ── Tab state ──
  authMethod = signal<AuthMethod>('password');
  private returnUrl?: string;

  // ── Company data ──
  companyData = signal<CompanyDataResponse | null>(null);

  // ── Common state ──
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // ── Password tab ──
  email = signal('');
  password = signal('');
  rememberMe = signal(false);
  showPassword = signal(false);

  // ── Email OTP tab ──
  emailOtpEmail = signal('');
  emailOtpSent = signal(false);
  emailOtpDigits = signal<string[]>(['', '', '', '', '', '']);

  // ── TOTP tab ──
  totpEmail = signal('');
  totpDigits = signal<string[]>(['', '', '', '', '', '']);

  // ── Session expired banner ──
  sessionExpired = signal(false);

  // ── Forgot password ──
  forgotPasswordMode = signal(false);
  forgotEmail = signal('');
  forgotCodeSent = signal(false);
  resetCode = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  resetSuccess = signal(false);

  // ── Rate limiting ──
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MS = 30000;
  failedAttempts = signal(0);
  lockoutUntil = signal<number | null>(null);

  isLockedOut = computed(() => {
    const until = this.lockoutUntil();
    return !!until && Date.now() < until;
  });

  lockoutSecondsRemaining = computed(() => {
    const until = this.lockoutUntil();
    return until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0;
  });

  // ── Computed validations ──
  isFormValid = computed(() => this.isValidEmail(this.email()) && this.password().length >= 6);
  canSubmitPassword = computed(() => this.isFormValid() && !this.isLoading() && !this.isLockedOut());

  emailOtpCode = computed(() => this.emailOtpDigits().join(''));
  canVerifyEmailOtp = computed(() => this.emailOtpCode().length === 6 && !this.isLoading());

  totpCode = computed(() => this.totpDigits().join(''));
  canVerifyTotp = computed(() => this.totpCode().length === 6 && !this.isLoading() && this.isValidEmail(this.totpEmail()));

  constructor() {
    effect(() => { if (this.email() || this.password()) this.errorMessage.set(''); });
    effect(() => { if (this.emailOtpDigits().some(d => d)) this.errorMessage.set(''); });
    effect(() => { if (this.totpDigits().some(d => d)) this.errorMessage.set(''); });

    // Reset form when user becomes unauthenticated (handles same-route navigation after timeout)
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      if (!isAuth) {
        this.resetForm();
      }
    });

    // Fetch public company data for footer display
    this.companyDataService.companyDataControllerFindPublic()
      .then(data => this.companyData.set(data))
      .catch(() => { /* silently fail */ });
  }

  private resetForm(): void {
    this.email.set('');
    this.password.set('');
    this.showPassword.set(false);
    this.rememberMe.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.authMethod.set('password');
    this.emailOtpEmail.set('');
    this.emailOtpSent.set(false);
    this.emailOtpDigits.set(['', '', '', '', '', '']);
    this.totpEmail.set('');
    this.totpDigits.set(['', '', '', '', '', '']);
    this.forgotPasswordMode.set(false);
    this.forgotEmail.set('');
    this.forgotCodeSent.set(false);
    this.resetCode.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
    this.resetSuccess.set(false);
    this.failedAttempts.set(0);
    this.lockoutUntil.set(null);

    // Show session-expired hint when redirected from a protected route
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      this.sessionExpired.set(true);
    } else {
      this.sessionExpired.set(false);
    }
  }

  companyName = computed(() => this.companyData()?.companyName ?? 'AquaShield Restoration CRM');
  companyTaxId = computed(() => this.companyData()?.taxId ?? '');

  // ── Helpers ──
  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  setAuthMethod(method: AuthMethod): void {
    this.authMethod.set(method);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(false);
  }

  // ── Password tab handlers ──
  updateEmail(event: Event): void { this.email.set((event.target as HTMLInputElement).value); }
  updatePassword(event: Event): void { this.password.set((event.target as HTMLInputElement).value); }
  togglePasswordVisibility(): void { this.showPassword.update(v => !v); }
  toggleRememberMe(): void { this.rememberMe.update(v => !v); }

  async onPasswordSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSubmitPassword()) return;
    if (this.isLockedOut()) { this.errorMessage.set(`Too many attempts. Wait ${this.lockoutSecondsRemaining()}s.`); return; }

    this.isLoading.set(true); this.errorMessage.set(''); this.successMessage.set('');
    try {
      const credentials: LoginDto = { email: this.email(), password: this.password() };
      this.returnUrl = this.route.snapshot.queryParams['returnUrl'];
      const response = await this.authService.login(credentials, this.returnUrl);
      if (response.twoFactorRequired) {
        this.failedAttempts.set(0);
        this.authMethod.set('totp');
        this.totpEmail.set(this.email());
        this.successMessage.set('Enter your authenticator code to continue');
      } else {
        this.returnUrl = response.returnUrl || this.returnUrl;
        this.redirectAfterLoginBanner();
      }
    } catch {
      const attempts = this.failedAttempts() + 1;
      this.failedAttempts.set(attempts);
      if (attempts >= this.MAX_ATTEMPTS) { this.lockoutUntil.set(Date.now() + this.LOCKOUT_MS); this.errorMessage.set('Account locked for 30 seconds.'); }
      else { this.errorMessage.set(`Invalid credentials. Attempt ${attempts} of ${this.MAX_ATTEMPTS}.`); }
    } finally { this.isLoading.set(false); }
  }

  // ── Email OTP tab handlers ──
  updateEmailOtpEmail(event: Event): void { this.emailOtpEmail.set((event.target as HTMLInputElement).value); }

  async onSendEmailOtp(): Promise<void> {
    if (!this.isValidEmail(this.emailOtpEmail())) { this.errorMessage.set('Please enter a valid email'); return; }
    this.isLoading.set(true); this.errorMessage.set('');
    try {
      await this.authService.sendEmailOtp(this.emailOtpEmail());
      this.emailOtpSent.set(true);
      this.successMessage.set('Login code sent! Check your email.');
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.otpInputs()[0]?.nativeElement.focus(), 100);
      }
    } catch { this.errorMessage.set('Failed to send code. Please try again.'); }
    finally { this.isLoading.set(false); }
  }

  updateEmailOtpDigit(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 1);
    const digits = [...this.emailOtpDigits()]; digits[index] = val; this.emailOtpDigits.set(digits);
    if (val && index < 5) this.otpInputs()[index + 1]?.nativeElement.focus();
  }

  handleEmailOtpKeydown(index: number, event: KeyboardEvent): void {
    const digits = [...this.emailOtpDigits()];
    if (event.key === 'Backspace') {
      if (!digits[index] && index > 0) { event.preventDefault(); this.otpInputs()[index - 1]?.nativeElement.focus(); }
      else if (digits[index]) { digits[index] = ''; this.emailOtpDigits.set(digits); }
    }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); this.otpInputs()[index - 1]?.nativeElement.focus(); }
    if (event.key === 'ArrowRight' && index < 5) { event.preventDefault(); this.otpInputs()[index + 1]?.nativeElement.focus(); }
  }

  handleEmailOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D/g, '').slice(0, 6).split('');
    const current = ['', '', '', '', '', '']; digits.forEach((d, i) => { if (i < 6) current[i] = d; });
    this.emailOtpDigits.set(current);
    this.otpInputs()[Math.min(digits.length, 5)]?.nativeElement.focus();
  }

  async onVerifyEmailOtp(): Promise<void> {
    if (!this.canVerifyEmailOtp()) return;
    this.isLoading.set(true); this.errorMessage.set('');
    try {
      this.returnUrl = this.route.snapshot.queryParams['returnUrl'];
      await this.authService.verifyEmailOtp(this.emailOtpEmail(), this.emailOtpCode(), this.returnUrl);
      this.redirectAfterLoginBanner();
    } catch {
      this.errorMessage.set('Invalid code. Please try again.');
      this.emailOtpDigits.set(['', '', '', '', '', '']);
      setTimeout(() => this.otpInputs()[0]?.nativeElement.focus(), 50);
    } finally { this.isLoading.set(false); }
  }

  // ── TOTP tab handlers ──
  updateTotpEmail(event: Event): void { this.totpEmail.set((event.target as HTMLInputElement).value); }

  updateTotpDigit(index: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 1);
    const digits = [...this.totpDigits()]; digits[index] = val; this.totpDigits.set(digits);
    if (val && index < 5) this.totpInputs()[index + 1]?.nativeElement.focus();
  }

  handleTotpKeydown(index: number, event: KeyboardEvent): void {
    const digits = [...this.totpDigits()];
    if (event.key === 'Backspace') {
      if (!digits[index] && index > 0) { event.preventDefault(); this.totpInputs()[index - 1]?.nativeElement.focus(); }
      else if (digits[index]) { digits[index] = ''; this.totpDigits.set(digits); }
    }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); this.totpInputs()[index - 1]?.nativeElement.focus(); }
    if (event.key === 'ArrowRight' && index < 5) { event.preventDefault(); this.totpInputs()[index + 1]?.nativeElement.focus(); }
  }

  handleTotpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D/g, '').slice(0, 6).split('');
    const current = ['', '', '', '', '', '']; digits.forEach((d, i) => { if (i < 6) current[i] = d; });
    this.totpDigits.set(current);
    this.totpInputs()[Math.min(digits.length, 5)]?.nativeElement.focus();
  }

  async onVerifyTotp(): Promise<void> {
    if (!this.canVerifyTotp()) return;
    this.isLoading.set(true); this.errorMessage.set('');
    try {
      this.returnUrl = this.route.snapshot.queryParams['returnUrl'];
      await this.authService.loginWithTotp(this.totpEmail(), this.totpCode(), this.returnUrl);
      this.redirectAfterLoginBanner();
    } catch {
      this.errorMessage.set('Invalid code. Please try again.');
      this.totpDigits.set(['', '', '', '', '', '']);
      setTimeout(() => this.totpInputs()[0]?.nativeElement.focus(), 50);
    } finally { this.isLoading.set(false); }
  }

  // ── Forgot password ──
  updateForgotEmail(event: Event): void { this.forgotEmail.set((event.target as HTMLInputElement).value); }
  updateResetCode(event: Event): void { this.resetCode.set((event.target as HTMLInputElement).value); }
  updateNewPassword(event: Event): void { this.newPassword.set((event.target as HTMLInputElement).value); }
  updateConfirmPassword(event: Event): void { this.confirmPassword.set((event.target as HTMLInputElement).value); }
  toggleShowNewPassword(): void { this.showNewPassword.update(v => !v); }
  toggleShowConfirmPassword(): void { this.showConfirmPassword.update(v => !v); }

  canSubmitReset = computed(() => {
    const code = this.resetCode().trim();
    const pw = this.newPassword();
    const confirm = this.confirmPassword();
    return code.length >= 4 && pw.length >= 6 && pw === confirm && !this.isLoading();
  });

  async onForgotPasswordSubmit(): Promise<void> {
    if (!this.isValidEmail(this.forgotEmail())) { this.errorMessage.set('Please enter a valid email address'); return; }
    this.isLoading.set(true); this.errorMessage.set('');
    try {
      await this.authService.forgotPassword(this.forgotEmail());
      this.forgotCodeSent.set(true);
      this.successMessage.set('Reset code sent! Check your email.');
    } catch { this.errorMessage.set('Failed to send reset code. Please try again.'); }
    finally { this.isLoading.set(false); }
  }

  async onResetPasswordSubmit(): Promise<void> {
    if (!this.canSubmitReset()) return;
    this.isLoading.set(true); this.errorMessage.set('');
    try {
      await this.authService.resetPassword(this.forgotEmail(), this.resetCode(), this.newPassword());
      this.resetSuccess.set(true);
      this.successMessage.set('Password reset successful! You can now sign in.');
    } catch { this.errorMessage.set('Invalid code or reset expired. Please try again.'); }
    finally { this.isLoading.set(false); }
  }

  // ── Google ──
  onGoogleSignIn(): void { this.authService.googleSignIn(); }

  // ── Error getters ──
  get emailError(): string { const v = this.email(); return !v ? '' : !this.isValidEmail(v) ? 'Please enter a valid email address' : ''; }
  get passwordError(): string { const v = this.password(); return !v ? '' : v.length < 6 ? 'Password must be at least 6 characters' : ''; }

  // ── Shared success redirect helper ──
  // Shows the transient banner then navigates. Delay gives the UI a tick to render in zoneless mode.
  private redirectAfterLoginBanner(): void {
    this.successMessage.set('Login successful! Redirecting...');
    setTimeout(() => {
      const dest = this.returnUrl || '/dashboard';
      this.router.navigate([dest]);
    }, 120);
  }
}
