import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ApiResponse,
  DiscoveryService,
  DynamicFormComponent,
  EntityClient,
  EntityDescriptor,
  Issue,
  IssueType,
  SchemaBundle,
  SchemaService,
  firstError,
  hasErrors,
} from 'ngt-gui';

/**
 * Incremento 2 pilot — proves the full contract end-to-end:
 *   - DiscoveryService.loadEntities()       → /api/sys/entities (ApiResponse<EntityDescriptor[]>)
 *   - SchemaService.get('/<entity>')        → /api/<entity>/schema.json (ApiResponse<JSONSchema>)
 *   - EntityClient.for('/<entity>').list()  → /api/<entity>/ (ApiResponse<T[]>)
 *
 * Every panel surfaces `issues` so contract violations are visible.
 */
@Component({
  selector: 'app-api-contract-pilot',
  standalone: true,
  imports: [CommonModule, FormsModule, DynamicFormComponent],
  templateUrl: './api-contract-pilot.component.html',
  styles: [`
    :host { display: block; padding: 1.5rem; font-family: sans-serif; }
    h2, h3 { margin-top: 1.5rem; }
    section { border: 1px solid #ddd; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
    pre { background: #f6f8fa; padding: .75rem; border-radius: 4px; overflow-x: auto; max-height: 400px; }
    select { padding: .35rem; min-width: 240px; }
    .issue { padding: .4rem .6rem; border-radius: 4px; margin-bottom: .35rem; }
    .issue.ERROR { background: #fde2e2; color: #7a1818; }
    .issue.WARNING { background: #fff4d6; color: #6b4d00; }
    .issue.INFO { background: #e1f2ff; color: #0a4a72; }
    button { padding: .35rem .75rem; margin-right: .5rem; }
  `],
})
export class ApiContractPilotComponent implements OnInit {
  private readonly discovery = inject(DiscoveryService);
  private readonly schemas = inject(SchemaService);
  private readonly client = inject(EntityClient);

  entities: EntityDescriptor[] = [];
  selectedPath: string | null = null;

  discoveryError: string | null = null;
  schema: unknown = null;
  schemaError: string | null = null;
  items: unknown[] = [];
  listIssues: Issue[] = [];
  listError: string | null = null;
  loading = false;

  formModel: Record<string, unknown> = {};
  createIssues: Issue[] = [];
  createError: string | null = null;
  createdItem: unknown = null;

  bundle: SchemaBundle | null = null;
  bundleError: string | null = null;
  bundleLoading = false;

  readonly IssueType = IssueType;

  ngOnInit(): void {
    this.discovery.loadEntities().subscribe({
      next: entities => {
        this.entities = entities;
        if (entities.length && !this.selectedPath) {
          const firstReadable = entities.find(e => e.capabilities.list) ?? entities[0];
          this.selectedPath = firstReadable.path;
          this.refresh();
        }
      },
      error: (err: Error) => (this.discoveryError = err.message),
    });
    this.loadBundle();
  }

  loadBundle(reload = false): void {
    this.bundleLoading = true;
    this.bundleError = null;
    this.schemas.getBundle({ reload }).subscribe({
      next: bundle => {
        this.bundle = bundle;
        this.bundleLoading = false;
      },
      error: (err: Error) => {
        this.bundleLoading = false;
        this.bundleError = err.message;
      },
    });
  }

  refresh(): void {
    if (!this.selectedPath) return;
    this.loadSchema(this.selectedPath);
    this.loadItems(this.selectedPath);
    this.formModel = {};
    this.createIssues = [];
    this.createError = null;
    this.createdItem = null;
  }

  onCreate(model: Record<string, unknown>): void {
    if (!this.selectedPath) return;
    this.createError = null;
    this.createIssues = [];
    this.createdItem = null;
    this.client.for(this.selectedPath).create(model).subscribe({
      next: (response: ApiResponse<unknown>) => {
        this.createIssues = response.issues ?? [];
        if (hasErrors(response)) {
          this.createError = firstError(response)?.message ?? 'Create failed';
          return;
        }
        this.createdItem = response.content;
        this.loadItems(this.selectedPath!);
      },
      error: (err: Error) => (this.createError = err.message),
    });
  }

  private loadSchema(path: string): void {
    this.schema = null;
    this.schemaError = null;
    this.schemas.get(path, { reload: true }).subscribe({
      next: schema => (this.schema = schema),
      error: (err: Error) => (this.schemaError = err.message),
    });
  }

  private loadItems(path: string): void {
    this.loading = true;
    this.items = [];
    this.listIssues = [];
    this.listError = null;
    this.client.for(path).list().subscribe({
      next: (response: ApiResponse<unknown[]>) => {
        this.loading = false;
        this.listIssues = response.issues ?? [];
        if (hasErrors(response)) {
          this.listError = firstError(response)?.message ?? 'Unknown error';
          return;
        }
        this.items = response.content ?? [];
      },
      error: (err: Error) => {
        this.loading = false;
        this.listError = err.message;
      },
    });
  }
}
