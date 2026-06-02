/**
 * Shared API contract types — mirror of the backend's ResponseEnvelope/Issue.
 * Backend reference: src/uniback/api/schemas/responses.py
 */

export enum IssueType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface Issue {
  type: IssueType;
  code?: string | null;
  message: string;
  location?: unknown;
}

export interface ApiResponse<T = unknown> {
  content: T | null;
  count: number;
  issues: Issue[];
}

export interface EntityCapabilities {
  list: boolean;
  get: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  schema: boolean;
}

export interface EntityDescriptor {
  name: string;
  path: string;
  pk: string;
  tags: string[];
  capabilities: EntityCapabilities;
}

export interface ServiceDescriptor {
  name: string;
  routes: string[];
}

export interface SchemaBundle {
  $schema: string;
  version: string;
  generated_at: string;
  entities: Record<string, unknown>;
}

export function hasErrors(response: ApiResponse<unknown> | null | undefined): boolean {
  return !!response?.issues?.some(i => i.type === IssueType.ERROR);
}

export function firstError(response: ApiResponse<unknown> | null | undefined): Issue | undefined {
  return response?.issues?.find(i => i.type === IssueType.ERROR);
}
