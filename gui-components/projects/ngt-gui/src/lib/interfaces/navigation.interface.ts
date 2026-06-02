/**
 * @interface NavigationResponse
 * @description
 * Shape of the response returned by `GET /api/gui/navigation`.
 * Contains a hierarchical menu tree and the user's permission map.
 */

export interface NavigationScreenInfo {
  id: number;
  uuid: string | null;
  name: string;
  screen_type: 'browser' | 'editable_table' | 'form';
  main_entity_type: string | null;
  endpoint: string | null;
  route: string;
  permission?: string;
}

export interface NavigationMenuItem {
  id: number;
  uuid: string | null;
  name: string;
  icon: string | null;
  order: number;
  definition: Record<string, any>;
  screen?: NavigationScreenInfo;
  children?: NavigationMenuItem[];
}

export interface NavigationResponse {
  menus: NavigationMenuItem[];
  permissions: Record<string, string[]>;
}
