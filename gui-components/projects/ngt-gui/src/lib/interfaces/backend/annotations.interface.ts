import { Observable } from "rxjs";
export interface backendAnnotationsInterface {
  getAnnotationField?(id?: any, params?: any): Observable<any>;
  postAnnotationField?(value?: any, params?: any): Observable<any>;
  putAnnotationFields?(id?: any, value?: any, params?: any): Observable<any>;
  deleteAnnotationField?(id?: any, params?: any): Observable<any>;

  getAnnotationsTemplates?(id?: any, params?: any): Observable<any>;
  postAnnotationTemplates?(value?: any, params?: any): Observable<any>;
  putAnnotationTemplates?(id?: any, value?: any, params?: any): Observable<any>;
  deleteAnnotationTemplates?(id?: any, params?: any): Observable<any>;

  getAnnotationsByObjectUUID?(object_uuid?: any, params?: any): Observable<any>;
  putAnnotationByObjectUUID?(object_uuid?: any, value?: any, params?: any): Observable<any>;

  getIdentityStore?(key?: any, params?: any): Observable<any>;
  putIdentityStore?(key?: any, value?: any, params?: any): Observable<any>;

  getViewers?(id?: any, params?: any): Observable<any>;
  postView?(value?: any, params?: any): Observable<any>;
  putView?(id?: any, value?: any, params?: any): Observable<any>;
  deleteView?(id?: any, params?: any): Observable<any>;

  cloneView?(id?: any, params?: any): Promise<any>;
  cloneViewz?(id?: any, name?: any): Promise<any>;

  getIndividuals?(id?: any, params?: any): Observable<any>;
  putIndividual?(id?: any, value?: any, params?: any): Observable<any>;

  getFunctionalObject?(id?: any, params?: any): Observable<any>;

  getCollections?(id?: any, params?: any): Observable<any>;
  putCollection?(id?: any, value?: any, params?: any): Observable<any>;
  postCollection?(value?: any, params?: any): Observable<any>;
  postCollectionItem?(value?: any, params?: any): Observable<any>;
  deleteCollections?(id?: any, params?: any): Observable<any>;
  deleteCollectionItemByCollectionAndItem?(collectionUuid?: any, itemId?: any, params?: any): Observable<any>;

  getStatusCheckers?(params?: any): Observable<any>;
  getJmTypes?(id?: any, params?: any): Observable<any>;
  getBoHeaders?(id?: any, params?: any): Observable<any>;
}