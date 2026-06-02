import {NzTreeNodeOptions} from "ng-zorro-antd/tree";

export interface IProcessTypesSourceCodeFileListNode extends NzTreeNodeOptions {
  type: 'directory' | 'file' | 'zip',
  parent?: IProcessTypesSourceCodeFileListNode,
  fileType?: string,
  needCreate: boolean,
  level: number
  expandable: boolean,
  children?: IProcessTypesSourceCodeFileListNode[],
  sourceCodeId?: number,
  path?: string
}

export interface ProcessesSourceCodeResponse {
  content: ProcessesSourceCode,
  count: number,
  issues: any[]
}

export interface ProcessesSourceCode {
  process_id?: number,
  "fso_path"?: string,
  "file_name"?: string,
  "is_main"?: boolean,
  id: number
}
