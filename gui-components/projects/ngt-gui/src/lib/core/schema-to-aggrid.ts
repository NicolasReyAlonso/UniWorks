import type { ColDef } from 'ag-grid-community';
import type { JsonSchema } from './schema-to-formly';

/**
 * Per-column metadata as emitted by the backend's `_synthetic_editable_table`
 * builder (see uniback/api/routers/gui.py). The editable_table screen
 * definition contains a `columns` array of these.
 */
export interface ScreenEditableColumn {
  field: string;
  header?: string;
  type?: string;                // text | number | date | datetime | switch | select | ...
  editable?: boolean;
  readonly?: boolean;
  required?: boolean;
  sortable?: boolean;
  optionsEndpoint?: string;
  foreignKey?: { table?: string; column?: string; [key: string]: unknown };
  validators?: ScreenColumnValidators;
}

export interface ScreenColumnValidators {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  enum?: unknown[];
  format?: string;
}

/** Extended ColDef carrying our validation metadata for the bulk grid. */
export interface BulkColDef extends ColDef {
  /** Per-cell validators, evaluated before submit. */
  ubValidators?: ScreenColumnValidators;
  /** Whether the column is required (cannot be empty/null). */
  ubRequired?: boolean;
  /** FK lookup endpoint, used by the lazy-loading select cell editor. */
  ubOptionsEndpoint?: string;
}

export interface SchemaToAgGridOptions {
  /** Pin the row pk column at the left. Default: true. */
  pinPkLeft?: boolean;
  /** Field name of the row primary key. Default: 'id'. */
  pkField?: string;
  /** Width applied to columns when not otherwise specified. */
  defaultWidth?: number;
}

const DEFAULTS: Required<SchemaToAgGridOptions> = {
  pinPkLeft: true,
  pkField: 'id',
  defaultWidth: 160,
};

/**
 * Convert the editable_table screen definition's `columns` array into AG Grid
 * column defs. This is the primary entrypoint — the backend already enriches
 * each column with type, editable, validators, etc.
 */
export function screenColumnsToColDefs(
  columns: ScreenEditableColumn[],
  options: SchemaToAgGridOptions = {},
): BulkColDef[] {
  const opts = { ...DEFAULTS, ...options };
  return columns.map(col => columnToColDef(col, opts));
}

/**
 * Fallback: derive column defs straight from a root JSON Schema. Useful when
 * no screen definition is available (e.g. tests or ad-hoc usage).
 */
export function schemaToColDefs(
  schema: JsonSchema,
  options: SchemaToAgGridOptions = {},
): BulkColDef[] {
  if (schema.type !== 'object' || !schema.properties) {
    throw new Error('schemaToColDefs: root schema must describe an object with properties');
  }
  const required = new Set(schema.required ?? []);
  const opts = { ...DEFAULTS, ...options };
  const columns: ScreenEditableColumn[] = [];
  for (const [field, prop] of Object.entries(schema.properties)) {
    columns.push(jsonSchemaToScreenColumn(field, prop, required.has(field)));
  }
  return columns.map(col => columnToColDef(col, opts));
}

function columnToColDef(col: ScreenEditableColumn, opts: Required<SchemaToAgGridOptions>): BulkColDef {
  const editable = col.editable !== false && col.readonly !== true;
  const def: BulkColDef = {
    field: col.field,
    headerName: col.header ?? humanize(col.field),
    editable,
    sortable: col.sortable !== false,
    filter: true,
    resizable: true,
    width: opts.defaultWidth,
    ubRequired: !!col.required,
    ubValidators: col.validators,
    ubOptionsEndpoint: col.optionsEndpoint,
  };

  if (col.field === opts.pkField && opts.pinPkLeft) {
    def.pinned = 'left';
    def.editable = false;
    def.width = 90;
  }

  applyTypeForGrid(def, col);
  return def;
}

function applyTypeForGrid(def: BulkColDef, col: ScreenEditableColumn): void {
  const type = (col.type ?? 'text').toLowerCase();
  switch (type) {
    case 'number':
    case 'integer':
      def.cellEditor = 'agNumberCellEditor';
      def.filter = 'agNumberColumnFilter';
      def.cellDataType = 'number';
      break;
    case 'date':
      def.cellEditor = 'agDateStringCellEditor';
      def.filter = 'agDateColumnFilter';
      def.cellDataType = 'dateString';
      break;
    case 'datetime':
      // No native datetime editor in community; use text + format hint and let
      // a custom editor take over later if needed.
      def.cellEditor = 'agTextCellEditor';
      break;
    case 'switch':
    case 'boolean':
    case 'checkbox':
      def.cellEditor = 'agCheckboxCellEditor';
      def.cellRenderer = 'agCheckboxCellRenderer';
      def.cellDataType = 'boolean';
      break;
    case 'select':
      def.cellEditor = 'agSelectCellEditor';
      if (col.validators?.enum) {
        def.cellEditorParams = { values: col.validators.enum };
      }
      break;
    case 'select-lazy-loading':
      // Marker only; the BulkEditGridComponent will swap in a custom editor
      // that hits ubOptionsEndpoint to fetch options on demand.
      def.cellEditor = 'agTextCellEditor';
      break;
    case 'json':
    case 'textarea':
      def.cellEditor = 'agLargeTextCellEditor';
      def.cellEditorPopup = true;
      def.cellEditorParams = { maxLength: col.validators?.maxLength ?? 5000, rows: 10, cols: 50 };
      break;
    case 'text':
    default:
      def.cellEditor = 'agTextCellEditor';
      break;
  }
}

function jsonSchemaToScreenColumn(field: string, prop: JsonSchema, required: boolean): ScreenEditableColumn {
  const widget = prop['x-ui-widget'] as string | undefined;
  const optionsEndpoint = prop['x-options-endpoint'] as string | undefined;
  const fk = prop['x-foreign-key'] as ScreenEditableColumn['foreignKey'];
  const readonly = prop.readOnly === true || prop['x-readonly'] === true;
  return {
    field,
    header: (prop.title as string | undefined) ?? humanize(field),
    type: widget ?? jsonSchemaTypeToColumnType(prop),
    editable: !readonly,
    readonly,
    required: required || prop['x-required'] === true,
    optionsEndpoint,
    foreignKey: fk,
    validators: extractValidators(prop),
  };
}

function jsonSchemaTypeToColumnType(prop: JsonSchema): string {
  if (Array.isArray(prop.enum)) return 'select';
  switch (prop.type) {
    case 'boolean': return 'switch';
    case 'integer':
    case 'number':  return 'number';
    case 'string':
      switch (prop.format) {
        case 'date':       return 'date';
        case 'date-time':  return 'datetime';
        default:           return 'text';
      }
    default: return 'text';
  }
}

function extractValidators(prop: JsonSchema): ScreenColumnValidators | undefined {
  const out: ScreenColumnValidators = {};
  const keys: (keyof ScreenColumnValidators)[] = [
    'minLength', 'maxLength', 'pattern',
    'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
    'multipleOf', 'format',
  ];
  for (const k of keys) {
    const v = (prop as Record<string, unknown>)[k];
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  if (Array.isArray(prop.enum)) out.enum = prop.enum;
  return Object.keys(out).length ? out : undefined;
}

function humanize(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\s*\w/, c => c.toUpperCase());
}

/**
 * Validate one cell value against the column's validators. Returns an array of
 * human-readable error messages (empty if valid).
 */
export function validateCell(value: unknown, col: BulkColDef): string[] {
  const errors: string[] = [];
  const v = col.ubValidators ?? {};
  const isEmpty = value === null || value === undefined || value === '';

  if (col.ubRequired && isEmpty) {
    errors.push('Required');
    return errors;
  }
  if (isEmpty) return errors;

  if (typeof value === 'string') {
    if (typeof v.minLength === 'number' && value.length < v.minLength) {
      errors.push(`Min length ${v.minLength}`);
    }
    if (typeof v.maxLength === 'number' && value.length > v.maxLength) {
      errors.push(`Max length ${v.maxLength}`);
    }
    if (v.pattern && !new RegExp(v.pattern).test(value)) {
      errors.push('Invalid format');
    }
  }

  if (typeof value === 'number') {
    if (typeof v.minimum === 'number' && value < v.minimum) errors.push(`Min ${v.minimum}`);
    if (typeof v.maximum === 'number' && value > v.maximum) errors.push(`Max ${v.maximum}`);
    if (typeof v.exclusiveMinimum === 'number' && value <= v.exclusiveMinimum) errors.push(`> ${v.exclusiveMinimum}`);
    if (typeof v.exclusiveMaximum === 'number' && value >= v.exclusiveMaximum) errors.push(`< ${v.exclusiveMaximum}`);
    if (typeof v.multipleOf === 'number' && v.multipleOf !== 0 && value % v.multipleOf !== 0) {
      errors.push(`Multiple of ${v.multipleOf}`);
    }
  }

  if (Array.isArray(v.enum) && !v.enum.includes(value)) {
    errors.push(`Must be one of: ${v.enum.join(', ')}`);
  }

  return errors;
}
