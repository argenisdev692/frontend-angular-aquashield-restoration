export type {
  CallResponse,
  CallListResponse,
  BulkIdsDto,
} from '../../../api/models';

/** Sentiment values accepted by the Retell calls filter/export endpoints. */
export type CallSentiment = 'Negative' | 'Positive' | 'Neutral' | 'Unknown';

/** File formats the export endpoint can serve from the same path. */
export type CallExportFormat = 'csv' | 'xlsx' | 'pdf';

/** Server-side filters shared by the list and export endpoints. */
export interface CallExportParams {
  format?: CallExportFormat;
  search?: string;
  callStatus?: string;
  userSentiment?: CallSentiment;
  status?: 'active' | 'suspended' | 'all';
  onlyTrashed?: boolean;
  withTrashed?: boolean;
  start_date?: string;
  end_date?: string;
}
