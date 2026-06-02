export interface GetProcessResponseExecution {
  system?: string,
  geoprocess_type: string,
  kernel: string
}

export interface GetProcessResponseContent {
  algorithms: any[];
  annotations: any[];
  approval_state?: any;
  attributes?: any;
  authr_reference: boolean;
  case_studies: any[];
  collections: any[];
  creation_time: string;
  description?: any;
  entity_update_time: string;
  execution?: GetProcessResponseExecution;
  files: any[];
  id: number;
  images: { image_id: number, process_id: number }[];
  is_deleted: boolean;
  name: string;
  native_id?: any;
  native_table?: any;
  obj_type_id: number;
  old_id: number;
  owner_id?: any;
  related_objects: any[];
  related_subjects: any[];
  resource_adaptations: number[];
  resource_jm_adaptations: any[];
  rl_owner?: any;
  schema_inputs?: any;
  schema_outputs?: any;
  sources: number[];
  ts_vector_update_time: string;
  uuid: string;
}

export interface GetProcessResponse {
  content: GetProcessResponseContent;
  count: number;
  issues: any[];
}


export interface GetProcessesInResourceResponseContent {
  id: number;
  native_process_id: string;
  process: number;
  process_id: number;
  resource: number;
  resource_id: number;
  uuid: string;
}

export interface GetProcessesInResourceResponse {
  content: GetProcessesInResourceResponseContent;
  count: number;
  issues: any[];
}
