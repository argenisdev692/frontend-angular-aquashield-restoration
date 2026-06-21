import { Service, inject } from '@angular/core';
import { AppointmentsService } from '../../../api/services/appointments.service';
import {
  AppointmentResponse,
  AppointmentListResponse,
  CreateAppointmentDto,
  UpdateAppointmentDto,
  BulkIdsDto,
} from '../../../api/models';
import { AppointmentsControllerFindAll$Params } from '../../../api/fn/appointments/appointments-controller-find-all';

export type AppointmentExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface AppointmentExportParams {
  onlyTrashed?: boolean;
  withTrashed?: boolean;
  format?: AppointmentExportFormat;
}

@Service()
export class AppointmentsFeatureService {
  private api = inject(AppointmentsService);

  getAll(params?: AppointmentsControllerFindAll$Params): Promise<AppointmentListResponse> {
    return this.api.appointmentsControllerFindAll(params);
  }

  getById(id: string): Promise<AppointmentResponse> {
    return this.api.appointmentsControllerFindOne({ id });
  }

  // Create/update endpoints don't return the full entity, so refetch it to
  // satisfy the CrudFormBase contract (create returns only { id }, update returns void).
  create(dto: CreateAppointmentDto): Promise<AppointmentResponse> {
    return this.api
      .appointmentsControllerCreate({ body: dto })
      .then((created) => this.getById(created.id));
  }

  update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentResponse> {
    return this.api
      .appointmentsControllerUpdate({ id, body: dto })
      .then(() => this.getById(id));
  }

  delete(id: string): Promise<void> {
    return this.api.appointmentsControllerDelete({ id });
  }

  restore(id: string): Promise<unknown> {
    return this.api.appointmentsControllerRestore({ id });
  }

  markRead(id: string): Promise<unknown> {
    return this.api.appointmentsControllerMarkRead({ id });
  }

  bulkDelete(dto: BulkIdsDto): Promise<unknown> {
    return this.api.appointmentsControllerBulkDelete({ body: dto });
  }

  bulkRestore(dto: BulkIdsDto): Promise<unknown> {
    return this.api.appointmentsControllerBulkRestore({ body: dto });
  }

  // PDF/XLSX endpoints respond with `responseType: 'blob'`, so the generated
  // client already resolves a real Blob. The CSV endpoint responds with
  // `responseType: 'text'`, so the client resolves a plain string — wrap it in a
  // Blob before download (mirrors ContactSupportFeatureService).
  export(params?: AppointmentExportParams): Promise<Blob> {
    const { format = 'pdf', ...filters } = params ?? {};
    if (format === 'xlsx') {
      return this.api.appointmentsControllerExport$VndOpenxmlformatsOfficedocumentSpreadsheetmlSheet(
        { ...filters, format }
      ) as Promise<Blob>;
    }
    if (format === 'csv') {
      return this.api
        .appointmentsControllerExport$Csv({ ...filters, format })
        .then((text) => new Blob([text as string], { type: 'text/csv;charset=utf-8;' }));
    }
    return this.api.appointmentsControllerExport$Pdf({ ...filters, format }) as Promise<Blob>;
  }
}
