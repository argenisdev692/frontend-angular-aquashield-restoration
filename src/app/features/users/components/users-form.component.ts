import {
  Component,
  inject,
  signal,
  computed,
  resource,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';

import { UsersFeatureService } from '../services/users-feature.service';
import { RolesService } from '../../../api/services/roles.service';
import { PermissionsService } from '../../../api/services/permissions.service';
import { CreateUserDto, UpdateUserDto, UserResponse } from '../../../api/models';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudFormBase } from '../../../shared/crud-form-base';
import { PhoneFormatDirective } from '../../../shared/directives/phone-format.directive';

function asyncEmailValidator(service: UsersFeatureService, excludeId?: string) {
  return (control: AbstractControl): Promise<ValidationErrors | null> => {
    if (!control.value || control.value.length < 3) {
      return Promise.resolve(null);
    }
    return service
      .checkEmail(control.value, excludeId)
      .then((res) => {
        return res.exists ? { emailExists: true } : null;
      })
      .catch(() => null);
  };
}

@Component({
  selector: 'app-users-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    MultiSelectModule,
    ButtonModule,
    PageHeaderComponent,
    SidebarComponent,
    PhoneFormatDirective,
  ],
  templateUrl: './users-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './users-form.component.css',
})
export class UsersFormComponent extends CrudFormBase<UserResponse, CreateUserDto, UpdateUserDto> {
  protected api = inject(UsersFeatureService);
  private rolesService = inject(RolesService);
  private permissionsService = inject(PermissionsService);

  readonly drawerVisible = signal(false);

  readonly rolesResource = resource({
    loader: () => this.rolesService.rolesControllerFindAll(),
  });

  readonly permissionsResource = resource({
    loader: () => this.permissionsService.permissionsControllerFindAll(),
  });

  readonly roles = computed(() => this.rolesResource.value() ?? []);
  readonly permissions = computed(() => this.permissionsResource.value() ?? []);

  get service() {
    return this.api;
  }

  buildForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      roleIds: [[] as string[]],
      permissionIds: [[] as string[]],
    });
  }

  patchFromEntity(entity: UserResponse, form: FormGroup): void {
    form.patchValue({
      name: entity.name,
      lastName: entity.lastName ?? '',
      email: entity.email,
      phone: entity.phone ?? '',
      roleIds: entity.roles.map((r) => r.id),
      permissionIds: [],
    });
    const emailControl = form.get('email');
    if (emailControl) {
      emailControl.setAsyncValidators(asyncEmailValidator(this.api, entity.id));
      emailControl.updateValueAndValidity();
    }
  }

  toCreateDto(v: any): CreateUserDto {
    return {
      name: v.name,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      roleIds: v.roleIds,
      permissionIds: v.permissionIds,
    };
  }

  toUpdateDto(v: any): UpdateUserDto {
    return {
      name: v.name,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      roleIds: v.roleIds,
      permissionIds: v.permissionIds,
    };
  }

  get listRoute(): string {
    return '/users';
  }
}
