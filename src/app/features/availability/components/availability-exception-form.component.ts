import { Component, inject, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';

import { AvailabilityFeatureService } from '../services/availability-feature.service';
import {
  AvailabilityExceptionResponse,
  CreateExceptionDto,
  UpdateExceptionDto,
} from '../models/availability.types';
import { PageHeaderComponent } from '../../../components/page-header/page-header.component';
import { SidebarComponent } from '../../../components/sidebar/sidebar.component';
import { CrudFormBase } from '../../../shared/crud-form-base';
import { ymdToLocalDate, localDateToYmd } from '../../../shared/date.util';

/** Raw value of the exception reactive form. `date` is held as a `Date` by the
 *  PrimeNG datepicker and serialised to `YYYY-MM-DD` in `toCreateDto`. */
interface ExceptionFormValue {
  date: Date | null;
  isAvailable: boolean;
  reason: string;
}

@Component({
  selector: 'app-availability-exception-form',
  imports: [ReactiveFormsModule, InputTextModule, DatePickerModule, PageHeaderComponent, SidebarComponent],
  templateUrl: './availability-exception-form.component.html',
  styleUrl: './availability-exception-form.component.css',
})
export class AvailabilityExceptionFormComponent extends CrudFormBase<
  AvailabilityExceptionResponse,
  CreateExceptionDto,
  UpdateExceptionDto
> {
  protected api = inject(AvailabilityFeatureService);

  readonly drawerVisible = signal(false);

  get service() {
    return this.api;
  }

  buildForm(): FormGroup {
    return this.fb.group({
      date: [null as Date | null, [Validators.required]],
      isAvailable: [false],
      reason: [''],
    });
  }

  patchFromEntity(entity: AvailabilityExceptionResponse, form: FormGroup): void {
    form.patchValue({
      date: ymdToLocalDate(entity.date),
      isAvailable: entity.isAvailable,
      reason: entity.reason ?? '',
    });
  }

  toCreateDto(v: ExceptionFormValue): CreateExceptionDto {
    return {
      date: localDateToYmd(v.date) ?? '',
      isAvailable: !!v.isAvailable,
      reason: v.reason || null,
    };
  }

  toUpdateDto(v: ExceptionFormValue): UpdateExceptionDto {
    return this.toCreateDto(v);
  }

  get listRoute(): string {
    return '/availability/exceptions';
  }
}
