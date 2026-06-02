import { Observable } from "rxjs";
export interface backendBioitemsInterface {
  getSequences?(id?: any, params?: any): Observable<any>;
  deleteSequences?(id?: any, params?: any): Observable<any>;
  postSequences?(value?: any): Observable<any>;
  putSequences?(id?: any, value?: any): Observable<any>;
  importSequences?(fileList?: any[], params?: any): Observable<any>;
  exportSequences?(id?: any, format?: any, params?: any): Observable<any>;

  getAlignments?(id?: any, params?: any): Observable<any>;
  deleteAlignments?(id?: any, params?: any): Observable<any>;
  postAlignments?(value?: any): Observable<any>;
  putAlignments?(id?: any, file?: any, params?: any): Observable<any>;
  importAlignments?(fileList?: any[], params?: any): Observable<any>;
  getConcatAlignments?(params?: any): Observable<any>;
  exportAlignments?(id?: any, format?: any): Observable<any>;

  getPhylotrees?(id?: any, params?: any): Observable<any>;
  deletePhylotrees?(id?: any, params?: any): Observable<any>;
  postPhylotrees?(value?: any): Observable<any>;
  putPhylotrees?(id?: any, value?: any): Observable<any>;
  importPhylotrees?(fileList?: any[], params?: any): Observable<any>;
  exportPhylotrees?(id?: any, format?: any): Observable<any>;

  getGenericRequest?(objType?: any, id?: any, params?: any): Observable<any>;
  postFromChado?(objType?: any, value?: any): Observable<any>;
  putFromChado?(objType?: any, id?: any, value?: any): Observable<any>;
  deleteFromChado?(objType?: any, id?: any, params?: any): Observable<any>;
  importFromChado?(objType?: any, fileList?: any[], id?: any, params?: any): Observable<any>;
  exportFromChado?(objType?: any, id?: any, format?: any, params?: any): Observable<any>;

  getBrowserFilters?(type?: any, id?: any, params?: any): Observable<any>;
  postBrowserFilters?(type?: any, name?: any, value?: any): Observable<any>;
  putBrowserFilters?(type?: any, id?: any, value?: any): Observable<any>;
  deleteBrowserFilters?(type?: any, id?: any): Observable<any>;
  getBrowserFilterForms?(browserType?: any): Observable<any>;
}