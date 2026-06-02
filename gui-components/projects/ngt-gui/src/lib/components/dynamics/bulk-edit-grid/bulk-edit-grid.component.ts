import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AgGridAngular, AgGridModule } from 'ag-grid-angular';

import { BACKEND_SERVICE, BackendServiceInterface } from 'ngt-gui/core';
import {
  AllCommunityModule,
  CellClassParams,
  CellValueChangedEvent,
  ColDef,
  GridApi,
  GridReadyEvent,
  ModuleRegistry,
  RowSelectedEvent,
} from 'ag-grid-community';

import { BulkItem, BulkResponse, BulkResultRow } from '../../../core/entity-client.service';
import { JsonSchema } from '../../../core/schema-to-formly';
import {
  BulkColDef,
  ScreenEditableColumn,
  schemaToColDefs,
  screenColumnsToColDefs,
  validateCell,
} from '../../../core/schema-to-aggrid';

ModuleRegistry.registerModules([AllCommunityModule]);

type RowState = 'unchanged' | 'new' | 'modified' | 'deleted';

interface GridRow extends Record<string, unknown> {
  id?: string | number;
  _rowState: RowState;
  _rowErrors?: Record<string, string[]>;
  _backendErrors?: BulkResultRow['errors'];
}

/**
 * Excel-like grid for bulk creating/updating rows on a dynamic entity. Loads
 * existing rows from the entity's list endpoint, lets the user add and edit
 * rows in place, then submits the batch via POST /<entity>/bulk.
 *
 * Provide ONE of:
 *   - `screenColumns`: array of editable_table column definitions from a
 *     screen (preferred — backend has already enriched them).
 *   - `schema`: raw JSON Schema; columns inferred locally.
 * Plus `entityPath` (required) for list/bulk endpoints.
 */
@Component({
  selector: 'ngt-bulk-edit-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bulk-grid-toolbar">
      <button (click)="addRow()" type="button">+ Add row</button>
      <button (click)="deleteSelected()" type="button" [disabled]="!selectedCount">
        Delete selected ({{ selectedCount }})
      </button>
      <span class="bulk-grid-toolbar__spacer"></span>
      <label>
        On error:
        <select [(ngModel)]="onError">
          <option value="partial">partial (recommended)</option>
          <option value="abort">abort (all-or-nothing)</option>
        </select>
      </label>
      <button
        (click)="save()"
        type="button"
        [disabled]="saving || dirtyCount === 0"
        class="primary">
        {{ saving ? 'Saving…' : 'Save (' + dirtyCount + ')' }}
      </button>
    </div>

    <div *ngIf="loadError" class="bulk-grid-error">{{ loadError }}</div>

    <ag-grid-angular
      class="ag-theme-alpine bulk-grid"
      [theme]="'legacy'"
      [rowData]="rowData"
      [columnDefs]="columnDefs"
      [defaultColDef]="defaultColDef"
      [rowSelection]="'multiple'"
      [stopEditingWhenCellsLoseFocus]="true"
      [getRowId]="getRowId"
      [getRowClass]="getRowClass"
      (gridReady)="onGridReady($event)"
      (cellValueChanged)="onCellValueChanged($event)"
      (rowSelected)="onRowSelected($event)">
    </ag-grid-angular>

    <div *ngIf="lastSummary" class="bulk-grid-summary">
      <strong>Last save:</strong>
      created: {{ lastSummary.created }},
      updated: {{ lastSummary.updated }},
      deleted: {{ lastSummary.deleted }},
      failed: {{ lastSummary.failed }}
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 600px; }
    .bulk-grid-toolbar { display: flex; align-items: center; gap: .5rem; padding: .5rem; background: #fafafa; border-bottom: 1px solid #e0e0e0; }
    .bulk-grid-toolbar__spacer { flex: 1; }
    .bulk-grid-toolbar button { padding: .25rem .75rem; cursor: pointer; }
    .bulk-grid-toolbar button.primary { background: #1890ff; color: white; border: none; border-radius: 2px; }
    .bulk-grid-toolbar button:disabled { opacity: .5; cursor: not-allowed; }
    /* ag-grid needs a concrete (non-percentage) height or its internal
       height:100% chain collapses to 0 and nothing renders. flex-grow still
       lets it expand when the host has extra space. */
    .bulk-grid { flex: 1 1 auto; height: calc(100vh - 240px); min-height: 480px; }
    .bulk-grid-error { padding: .5rem 1rem; background: #fff1f0; color: #b00020; border-bottom: 1px solid #ffa39e; }
    .bulk-grid-summary { padding: .5rem; background: #f6ffed; border-top: 1px solid #b7eb8f; font-size: .9em; }

    /* Row state visual cues. */
    ::ng-deep .ag-row.row-state-new      { background-color: #e6f7ff !important; }
    ::ng-deep .ag-row.row-state-modified { background-color: #fffbe6 !important; }
    ::ng-deep .ag-row.row-state-deleted  { background-color: #fff1f0 !important; text-decoration: line-through; }
    ::ng-deep .ag-cell.cell-invalid      { background-color: #ffccc7 !important; }
  `],
})
export class BulkEditGridComponent implements OnInit, OnChanges {
  @Input() entityPath!: string;
  @Input() screenColumns?: ScreenEditableColumn[];
  @Input() schema?: JsonSchema;
  @Input() pageSize = 100;
  @Input() autoLoad = true;
  /**
   * Base URL for the entity. Falls back to BACKEND_SERVICE.base_url at runtime
   * if not set; ultimately defaults to `/api`.
   */
  @Input() apiBase?: string;

  @Output() readonly saved = new EventEmitter<{ results: BulkResultRow[]; summary: BulkSummary }>();

  @ViewChild(AgGridAngular) grid?: AgGridAngular;

  rowData: GridRow[] = [];
  columnDefs: BulkColDef[] = [];
  defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filter: true,
    cellClassRules: {
      'cell-invalid': (params: CellClassParams) => this.isCellInvalid(params),
    },
  };
  selectedCount = 0;
  dirtyCount = 0;
  saving = false;
  loadError: string | null = null;
  onError: 'partial' | 'abort' = 'partial';
  lastSummary?: BulkSummary;

  private gridApi?: GridApi;
  private nextTempId = -1;
  private readonly backend = inject<BackendServiceInterface>(BACKEND_SERVICE, { optional: true });

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.buildColumns();
    if (this.autoLoad && this.entityPath) this.loadRows();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['screenColumns'] || changes['schema']) {
      this.buildColumns();
    }
    if (changes['entityPath'] && !changes['entityPath'].firstChange && this.autoLoad) {
      this.loadRows();
    }
  }

  onGridReady(event: GridReadyEvent): void {
    this.gridApi = event.api;
  }

  onCellValueChanged(event: CellValueChangedEvent<GridRow>): void {
    if (!event.data) return;
    if (event.data._rowState === 'unchanged') {
      event.data._rowState = 'modified';
    }
    this.validateRow(event.data);
    this.recountDirty();
    this.gridApi?.refreshCells({ rowNodes: [event.node!], force: true });
  }

  onRowSelected(_event: RowSelectedEvent): void {
    this.selectedCount = this.gridApi?.getSelectedRows().length ?? 0;
  }

  addRow(): void {
    const fresh: GridRow = { id: this.nextTempId--, _rowState: 'new' };
    for (const col of this.columnDefs) {
      if (col.field && !(col.field in fresh)) fresh[col.field] = null;
    }
    this.rowData = [...this.rowData, fresh];
    this.recountDirty();
  }

  deleteSelected(): void {
    if (!this.gridApi) return;
    const selected = this.gridApi.getSelectedRows() as GridRow[];
    for (const row of selected) {
      if (row._rowState === 'new') {
        // Brand-new row: drop locally, no backend call needed.
        this.rowData = this.rowData.filter(r => r !== row);
      } else {
        row._rowState = 'deleted';
      }
    }
    this.gridApi.deselectAll();
    this.gridApi.setGridOption('rowData', this.rowData);
    this.recountDirty();
  }

  save(): void {
    if (this.saving) return;
    if (!this.entityPath) {
      this.loadError = 'BulkEditGridComponent: `entityPath` is required.';
      return;
    }

    // Validate everything client-side first; abort if invalid.
    let invalidRows = 0;
    for (const row of this.rowData) {
      if (row._rowState === 'unchanged' || row._rowState === 'deleted') continue;
      this.validateRow(row);
      if (row._rowErrors && Object.keys(row._rowErrors).length) invalidRows++;
    }
    if (invalidRows > 0) {
      this.loadError = `Cannot save: ${invalidRows} row(s) have validation errors.`;
      this.gridApi?.refreshCells({ force: true });
      return;
    }
    this.loadError = null;

    const items = this.buildBulkPayload();
    if (!items.length) return;

    this.saving = true;
    const url = this.bulkUrl();
    this.http.post<{ content: BulkResponse | null }>(
      url,
      items,
      { ...this.authOptions(), params: { on_error: this.onError } },
    ).subscribe({
        next: response => {
          this.saving = false;
          const content = response?.content;
          if (!content) return;
          this.lastSummary = content.summary;
          this.applyBackendResults(content.results);
          this.recountDirty();
          this.gridApi?.refreshCells({ force: true });
          this.saved.emit({ results: content.results, summary: content.summary });
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.saving = false;
          this.loadError = `Save failed: ${err.message}`;
          this.cdr.markForCheck();
        },
      });
  }

  /* --- template-bound helpers (must be public) ----------------------------- */

  getRowId = (params: { data: GridRow }) => String(params.data.id);

  getRowClass = (params: { data: GridRow }) => {
    const state = params.data?._rowState;
    return state && state !== 'unchanged' ? `row-state-${state}` : '';
  };

  /* --- internals ---------------------------------------------------------- */

  private isCellInvalid(params: CellClassParams): boolean {
    const data = params.data as GridRow | undefined;
    const field = params.colDef.field;
    if (!data || !field) return false;
    const errs = data._rowErrors?.[field];
    return !!(errs && errs.length);
  }

  private buildColumns(): void {
    const cols: BulkColDef[] = [];
    if (this.screenColumns?.length) {
      cols.push(...screenColumnsToColDefs(this.screenColumns));
    } else if (this.schema) {
      try {
        cols.push(...schemaToColDefs(this.schema));
      } catch (err) {
        this.loadError = (err as Error).message;
        return;
      }
    } else {
      this.loadError = 'BulkEditGridComponent: provide `screenColumns` or `schema`.';
      return;
    }
    cols.unshift({
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      editable: false,
      filter: false,
      sortable: false,
      resizable: false,
      headerName: '',
    });
    this.columnDefs = cols;
  }

  private loadRows(): void {
    if (!this.entityPath) return;
    const url = this.listUrl();
    this.http.get<{ content: Record<string, unknown>[] | null }>(
      url,
      { ...this.authOptions(), params: { page_size: String(this.pageSize) } },
    ).subscribe({
      next: response => {
        const rows = (response?.content ?? []) as Record<string, unknown>[];
        this.rowData = rows.map(r => ({ ...r, _rowState: 'unchanged' as RowState }));
        this.recountDirty();
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.loadError = err.message;
        this.cdr.markForCheck();
      },
    });
  }

  private base(): string {
    const explicit = this.apiBase?.replace(/\/$/, '');
    if (explicit) return explicit;
    const fromBackend = (this.backend as { base_url?: string } | null)?.base_url;
    return (fromBackend ?? '/api').replace(/\/$/, '');
  }

  private path(): string {
    return this.entityPath.startsWith('/') ? this.entityPath : `/${this.entityPath}`;
  }

  private authOptions(): { headers?: Record<string, string>; withCredentials?: boolean } {
    const opts = (this.backend as { globalVariablesService?: { authOptions?: unknown } } | null)?.globalVariablesService?.authOptions;
    return (opts as { headers?: Record<string, string>; withCredentials?: boolean }) ?? {};
  }

  private listUrl(): string {
    return `${this.base()}${this.path()}/`;
  }

  private bulkUrl(): string {
    return `${this.base()}${this.path()}/bulk`;
  }

  private validateRow(row: GridRow): void {
    const errors: Record<string, string[]> = {};
    for (const col of this.columnDefs) {
      if (!col.field || !col.editable) continue;
      const cellErrors = validateCell(row[col.field], col);
      if (cellErrors.length) errors[col.field] = cellErrors;
    }
    if (Object.keys(errors).length) {
      row._rowErrors = errors;
    } else {
      delete row._rowErrors;
    }
  }

  private buildBulkPayload(): BulkItem[] {
    const items: BulkItem[] = [];
    for (const row of this.rowData) {
      switch (row._rowState) {
        case 'new': {
          const data = this.stripInternal(row);
          delete data['id'];
          items.push({ data });
          break;
        }
        case 'modified': {
          items.push({ id: row.id, data: this.stripInternal(row) });
          break;
        }
        case 'deleted': {
          if (row.id !== undefined && (row.id as number) >= 0) {
            items.push({ _op: 'delete', id: row.id });
          }
          break;
        }
      }
    }
    return items;
  }

  private stripInternal(row: GridRow): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k.startsWith('_')) continue;
      out[k] = v;
    }
    return out;
  }

  private applyBackendResults(results: BulkResultRow[]): void {
    // Match results back to rows in the order they were sent (which mirrors
    // grid order, skipping unchanged rows).
    const dirtyRows = this.rowData.filter(r => r._rowState !== 'unchanged');
    let backendIdx = 0;
    const survivors: GridRow[] = [];
    for (const row of this.rowData) {
      if (row._rowState === 'unchanged') {
        survivors.push(row);
        continue;
      }
      const result = results[backendIdx++];
      if (!result) {
        survivors.push(row);
        continue;
      }
      if (result.ok) {
        if (row._rowState === 'deleted') continue; // drop from grid
        if (result.id !== null && result.id !== undefined) row.id = result.id;
        row._rowState = 'unchanged';
        delete row._backendErrors;
        delete row._rowErrors;
        survivors.push(row);
      } else {
        row._backendErrors = result.errors;
        // Map backend Pydantic errors (loc=[field,...]) to per-cell errors.
        const cellErrors: Record<string, string[]> = {};
        for (const err of result.errors ?? []) {
          const field = (err.loc?.[0] as string) || '_';
          (cellErrors[field] ??= []).push(err.msg);
        }
        row._rowErrors = cellErrors;
        survivors.push(row);
      }
    }
    void dirtyRows;
    this.rowData = survivors;
    this.gridApi?.setGridOption('rowData', this.rowData);
  }

  private recountDirty(): void {
    this.dirtyCount = this.rowData.filter(r => r._rowState !== 'unchanged').length;
  }
}

interface BulkSummary {
  created: number;
  updated: number;
  deleted: number;
  failed: number;
}
