export interface Jm_credentials {
  appID: string;
  appName: string;
  password: string;
  username: string;
}

export interface Jm_location {
  baseUrl: string;
}

export interface Jm_params {}

export interface GetResourceResponseContent {
  agreement?: any;
  consumption_counters?: any;
  id: number;
  jm_credentials: Jm_credentials;
  jm_location: Jm_location;
  jm_params: Jm_params;
  jm_type_id: number;
  name: string;
  uuid: string;
}

export interface GetResourcesResponse {
  content: GetResourceResponseContent[];
  count: number;
  issues: any[];
}
