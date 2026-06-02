import { Observable } from "rxjs";
export interface backendGISInterface {
  getRegionsGIS?(id?: any): Observable<any>;
  postRegionsGIS?(value?: any): Observable<any>;
  putRegionGIS?(id?: any, value?: any): Observable<any>;
  deleteRegionsGIS?(id?: any): Observable<any>;

  getLayerGIS?(id?: any, params?: any): Observable<any>;
  exportLayerGIS?(id?: any, format?: any, params?: any): Observable<any>;
  postLayerGIS?(file?: any, metadata?: any): Observable<any>;
  postLayerGISByQuery?(value?: any, params?: any): Observable<any>;
  putLayerGIS?(id?: any, value?: any, params?: any): Observable<any>;
  deleteLayerGIS?(id?: any): Observable<any>;
  putLayerProperty?(layerId?: any, propertyName?: any, value?: any, params?: any): Observable<any>;

  getLayersStyles?(id?: any, params?: any): Observable<any>;
  postGeoStyle?(style?: any, params?: any): Observable<any>;

  getCaseStudies?(id?: any, params?: any): Observable<any>;
  postCaseStudy?(value?: any, params?: any): Observable<any>;
  putCaseStudy?(id?: any, value?: any, params?: any): Observable<any>;
  deleteCaseStudy?(id?: any, params?: any): Observable<any>;

  getCaseStudiesItem?(id?: any, params?: any): Observable<any>;
  postCaseStudiesItem?(value?: any, params?: any): Observable<any>;
  deleteCaseStudyItem?(id?: any, params?: any): Observable<any>;
  deleteCaseStudyItemByCaseStudyAndItem?(caseStudyId?: any, layerId?: any, params?: any): Observable<any>;
}