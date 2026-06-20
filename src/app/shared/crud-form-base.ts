import { inject, signal, computed, resource, effect } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { NotificationService } from './notifications/notification.service';

export interface CrudService<TEntity, TCreate, TUpdate> {
  getById(id: string): Promise<TEntity>;
  create(dto: TCreate): Promise<TEntity>;
  update(id: string, dto: TUpdate): Promise<TEntity>;
}

export abstract class CrudFormBase<TEntity, TCreate, TUpdate> {
  protected fb = inject(FormBuilder);
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  protected location = inject(Location);
  protected notify = inject(NotificationService);

  abstract get service(): CrudService<TEntity, TCreate, TUpdate>;
  abstract buildForm(): FormGroup;
  abstract toCreateDto(formValue: any): TCreate;
  abstract toUpdateDto(formValue: any): TUpdate;
  abstract patchFromEntity(entity: TEntity, form: FormGroup): void;
  abstract get listRoute(): string;

  readonly entityId = signal<string | null>(
    this.route.snapshot.params['id'] ?? null
  );
  readonly isEdit = computed(() => !!this.entityId());
  readonly isSubmitting = signal(false);

  readonly form = this.buildForm();

  readonly entityResource = resource({
    loader: () => {
      const id = this.entityId();
      if (!id) return Promise.resolve(null);
      return this.service.getById(id);
    },
  });

  constructor() {
    effect(() => {
      const entity = this.entityResource.value();
      if (entity) this.patchFromEntity(entity, this.form);
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const promise = this.isEdit()
      ? this.service.update(this.entityId()!, this.toUpdateDto(this.form.value))
      : this.service.create(this.toCreateDto(this.form.value));
    promise
      .then(() => this.router.navigate([this.listRoute]))
      .catch((error) => this.notify.error(error, 'Failed to save'))
      .finally(() => this.isSubmitting.set(false));
  }

  onCancel(): void {
    this.location.back();
  }
}
