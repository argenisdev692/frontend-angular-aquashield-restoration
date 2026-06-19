import {
  Component,
  inject,
  signal,
  computed,
  resource,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';

import { RolesFeatureService } from '../services/roles-feature.service';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from '../../../api/models';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudFormBase } from '../../../shared/crud-form-base';

@Component({
  selector: 'app-roles-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    MultiSelectModule,
    ButtonModule,
    PageHeaderComponent,
    SidebarComponent,
  ],
  templateUrl: './roles-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './roles-form.component.css',
})
export class RolesFormComponent extends CrudFormBase<
  RoleResponseDto,
  CreateRoleDto,
  UpdateRoleDto
> {
  protected api = inject(RolesFeatureService);
  readonly drawerVisible = signal(false);

  readonly permissionsResource = resource({
    loader: () => this.api.getAllPermissions(),
  });

  readonly permissions = computed(() => this.permissionsResource.value() ?? []);

  get service() {
    return this.api;
  }

  buildForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      permissionIds: [[] as string[]],
    });
  }

  patchFromEntity(entity: RoleResponseDto, form: FormGroup): void {
    form.patchValue({
      name: entity.name ?? '',
      description: entity.description ?? '',
      permissionIds: entity.permissions?.map((p) => p.id) ?? [],
    });
  }

  toCreateDto(v: any): CreateRoleDto {
    return {
      name: v.name,
      description: v.description || null,
      permissions: (v.permissionIds as string[]).map((id) => ({
        permissionId: id,
      })),
    };
  }

  toUpdateDto(v: any): UpdateRoleDto {
    return {
      name: v.name,
      description: v.description || null,
      permissions: (v.permissionIds as string[]).map((id) => ({
        permissionId: id,
      })),
    };
  }

  get listRoute(): string {
    return '/roles';
  }
}
