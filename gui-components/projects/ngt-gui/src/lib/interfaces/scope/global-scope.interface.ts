/**
 * Contract of `GET /gui/scopes`: the global work scopes the backend declares
 * and the entities each one narrows down.
 */

/** An entity a scope applies to, and the listing field that carries it. */
export interface ScopeTarget {
  entity: string;
  /** Entity path as registered in the backend, e.g. `/plants`. */
  endpoint: string;
  /** Filter key: a foreign-key column, or the key of a membership filter. */
  field: string;
  /** `fk`: a column of the record (also pre-filled on create). `membership`: an N:M link. */
  kind: 'fk' | 'membership';
}

export interface GlobalScopeDefinition {
  name: string;
  entity: string;
  /** Where the selectable records are listed, e.g. `/zones`. */
  endpoint: string;
  /** Text or i18n key shown in the header selector. */
  label: string;
  value_field: string;
  label_field: string;
  /** Legacy global-state key the selection is mirrored into, if any. */
  state_key?: string | null;
  targets: ScopeTarget[];
}

/** A record the user can pin as the value of a scope. */
export interface ScopeOption {
  id: number | string;
  label: string;
}

/** A scope currently narrowing a given entity. */
export interface AppliedScope {
  scope: GlobalScopeDefinition;
  target: ScopeTarget;
  option: ScopeOption;
}
