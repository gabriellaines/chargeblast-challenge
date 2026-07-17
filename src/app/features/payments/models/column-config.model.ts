export type ColumnKey =
  | 'id'
  | 'customerEmail'
  | 'amount'
  | 'currency'
  | 'status'
  | 'paymentMethod'
  | 'description'
  | 'createdAt'
  | 'refundedAt'
  | 'declineReason';

export type SortableColumn = 'customerEmail' | 'amount' | 'status' | 'createdAt';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly column: SortableColumn;
  readonly direction: SortDirection;
}

export interface ColumnConfig {
  readonly key: ColumnKey;
  readonly label: string;
  readonly srLabel?: string;
  readonly sortable: boolean;
  readonly align?: 'left' | 'right' | 'center';
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export interface PaginationState {
  readonly page: number;
  readonly pageSize: PageSize;
}
