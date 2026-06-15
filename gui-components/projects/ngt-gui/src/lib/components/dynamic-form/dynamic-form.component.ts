import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormlyFieldConfig, FormlyModule } from '@ngx-formly/core';

import { SchemaService } from '../../core/schema.service';
import { Issue } from '../../interfaces/backend/api-contract';
import {
  FormMode,
  JsonSchema,
  SchemaToFormlyOptions,
  schemaToFormly,
} from '../../core/schema-to-formly';

/**
 * Renders a Formly form from a backend-served JSON Schema.
 *
 * Inputs are mutually exclusive — provide ONE of:
 *   - `entityPath`  → fetch `/${entityPath}/schema.json` and convert.
 *   - `schema`      → raw JSON Schema; convert in place.
 *   - `fields`      → pre-built FormlyFieldConfig[]; render as-is.
 */
@Component({
  selector: 'ngt-dynamic-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FormlyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="loadError; else loaded">
      <p class="ngt-dynamic-form__error">{{ loadError }}</p>
    </ng-container>
    <ng-template #loaded>
      <ng-container *ngIf="resolvedFields?.length; else loading">
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <formly-form
            [form]="form"
            [model]="model"
            [fields]="resolvedFields!"
            (modelChange)="modelChange.emit($event)">
          </formly-form>
          <div class="ngt-dynamic-form__actions" *ngIf="submitButton">
            <button type="submit" [disabled]="form.invalid">{{ submitButton }}</button>
          </div>
        </form>
        <div *ngIf="issues?.length" class="ngt-dynamic-form__issues">
          <p *ngFor="let issue of issues"
             class="ngt-dynamic-form__issue"
             [attr.data-type]="issue.type">
            <strong>{{ issue.type }}</strong>
            <span *ngIf="issue.code"> [{{ issue.code }}]</span>
            — {{ issue.message }}
          </p>
        </div>
      </ng-container>
      <ng-template #loading>
        <p>Cargando esquema…</p>
      </ng-template>
    </ng-template>
  `,
  styles: [`
    :host { display: block; }
    .ngt-dynamic-form__error { color: #b00020; }
    .ngt-dynamic-form__issue[data-type="ERROR"] { color: #b00020; }
    .ngt-dynamic-form__issue[data-type="WARNING"] { color: #b46500; }
    .ngt-dynamic-form__issue[data-type="INFO"] { color: #003e7e; }
    .ngt-dynamic-form__actions { margin-top: 1rem; }
  `],
})
export class DynamicFormComponent implements OnChanges {
  @Input() entityPath?: string;
  @Input() schema?: JsonSchema;
  @Input() fields?: FormlyFieldConfig[];
  @Input() model: Record<string, unknown> = {};
  @Input() mode: FormMode = 'create';
  @Input() overrides?: SchemaToFormlyOptions['overrides'];
  @Input() submitButton: string | null = 'Guardar';
  @Input() issues: Issue[] = [];

  @Output() readonly modelChange = new EventEmitter<Record<string, unknown>>();
  @Output() readonly submitted = new EventEmitter<Record<string, unknown>>();
  @Output() readonly fieldsReady = new EventEmitter<FormlyFieldConfig[]>();

  form = new FormGroup({});
  resolvedFields?: FormlyFieldConfig[];
  loadError: string | null = null;

  private readonly schemas = inject(SchemaService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityPath'] || changes['schema'] || changes['fields'] || changes['overrides'] || changes['mode']) {
      this.loadFields();
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitted.emit(this.model);
  }

  private loadFields(): void {
    this.loadError = null;

    if (this.fields) {
      this.applyFields(this.fields);
      return;
    }

    if (this.schema) {
      try {
        this.applyFields(schemaToFormly(this.schema, { overrides: this.overrides, mode: this.mode }));
      } catch (err) {
        this.loadError = (err as Error).message;
      }
      return;
    }

    if (this.entityPath) {
      this.schemas.get<JsonSchema>(this.entityPath, { reload: true }).subscribe({
        next: schema => {
          try {
            this.applyFields(schemaToFormly(schema, { overrides: this.overrides, mode: this.mode }));
          } catch (err) {
            this.loadError = (err as Error).message;
          }
          // OnPush: the schema arrives async, outside any input/event change,
          // so we must trigger a re-check or the view stays on "loading".
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.loadError = err.message;
          this.cdr.markForCheck();
        },
      });
      return;
    }

    this.loadError = 'DynamicFormComponent: provide one of `entityPath`, `schema`, or `fields`.';
  }

  private applyFields(fields: FormlyFieldConfig[]): void {
    this.form = new FormGroup({});
    this.resolvedFields = fields;
    this.fieldsReady.emit(fields);
  }
}
