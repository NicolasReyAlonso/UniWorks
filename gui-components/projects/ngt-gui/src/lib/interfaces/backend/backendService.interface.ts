import { Observable } from 'rxjs';
import { ContainerizationImageItem } from '../../models/containerization-images.model';
import { GetResourcesResponse } from '../../models/resources.model'
import { GetProcessesInResourceResponseContent } from '../../models/process-types.model'
import { ProcessesSourceCode, ProcessesSourceCodeResponse } from '../../interfaces/process-types.interface'
import { backendAnnotationsInterface } from './annotations.interface';
import { backendBioitemsInterface } from './bioitems.interface';
import { HttpEvent } from '@angular/common/http';
export interface BackendServiceInterface extends backendAnnotationsInterface, backendBioitemsInterface{

  base_url: string;

  getUserRole(userId: any): string;
  

  /************
   * SESSION  *
   * ***********/
  getSession(): Observable<any>;
  putSession(): Observable<any>;
  deleteSession(): Observable<any>;
  getAuthProviders(): Observable<any>;
  register(body: { username: string; email?: string; password: string }): Observable<any>;

  // Functions GUI

  getFunctionsGui(): any;

  /************
   * PROCESSES *
   ************/
  getProcess?(id: any, params?: any): Observable<any>;
  getProcesses?(id?: any, params?: any): Observable<any>;
  postProcesses?(body: any): Observable<any>;
  putProcess?(id: any, body: any, params?: any): Observable<any>;
  deleteProcess?(id: number | string, params?: any): Observable<any>;
  getContainerizationImagesByProcessId?(id: number | string, params?: any): Observable<any>;
  getContainerizationImages?(params?: any): Observable<any>;
  getContainerizationImageById?(id: string | number, params?: any): Observable<any>;
  putContainerizationImageById?(id: string | number, body: Partial<ContainerizationImageItem>, params?: any): Observable<any>;
  postContainerizationImage?(body: Partial<ContainerizationImageItem>, params?: any): Observable<any>;
  deleteContainerizationImage?(id: string | number, params?: any): Observable<any>;
  postProcessImages?(body: { process_id: number | string, image_id: number | string }, params?: any): Observable<any>;
  deleteProcessImages?(processId: number | string, imageId: number | string, params?: any): Observable<any>;
  getProcessImages?(id: number | string, params?: any): Observable<any>;

  /************
   * RESOURCES *
   ************/

  getResources?(params?: any): Observable<any>;
  getResourcesByProcessId?(pid: any, params?: any): Observable<any>;
  getResourceById?(id: any, params?: any): Observable<any>;
  putResourceById?(id: any, value: any, params?: any): Observable<any>;
  postResources?(value: any, params?: any): Observable<any>;
  deleteResource?(id: any, params?: any): Observable<any>;
  getProcessesInResource(id: any, params?: any): Observable<any>;
  deleteProcessesInResource(resourceId: any, processId: any, params?: any): Observable<any>;
  postProcessesInResource(value: any, params?: any): Observable<any>
  getProcessesSourceCodeById?(id: number, params?: any): Observable<any>;
  postProcessesSourceCode?(value: Partial<ProcessesSourceCode>, params?: any): Observable<any>;
  putProcessesSourceCode?(id: number, value: Partial<ProcessesSourceCode>, params?: any): Observable<any>;
  deleteProcessesSourceCode(id: any, params?: any): Observable<any>;

  /************
   * Job *
   ************/
  postJobs?(data: any): Observable<any>;
  getJobs?(id?: any, params?: any): Observable<any>;
  putJob?(id: any, value?: any, params?: any): Observable<any>;

  /************
   * FORMATS *
   ************/
  getFormat?(objType?: string): Observable<any>;
  getAnnotations?(name: string, params?: any): Observable<any>;
  getFormats?(objType?: string): Observable<any>;

  /***********
   * METADATA *
   ***********/
  getOntologies?(id?: any, params?: any): Observable<any>;
  deleteOntologies?(id?: any): Observable<any>;
  postOntologies?(value?: any): Observable<any>;
  putOntologies?(id?: any, value?: any): Observable<any>;
  importOntologies?(fileList?: any[], params?: any): Observable<any>;
  exportOntologies?(id?: any, format?: any): Observable<any>;

  getCvterms?(ontID?: any, termID?: any, params?: any): Observable<any>;
  getAnalyses?(id?: any, params?: any): Observable<any>;
  deleteAnalyses?(id?: any, params?: any): Observable<any>;
  postAnalyses?(value?: any): Observable<any>;
  putAnalyses?(id?: any, value?: any): Observable<any>;

  getTaxonomies?(id?: any, params?: any): Observable<any>;
  deleteTaxonomies?(id?: any, params?: any): Observable<any>;
  postTaxonomies?(value?: any): Observable<any>;
  putTaxonomies?(id?: any, value?: any): Observable<any>;
  importTaxonomies?(fileList?: any[], params?: any): Observable<any>;
  exportTaxonomies?(id?: any, format?: any): Observable<any>;

  getOrganisms?(id?: any, params?: any): Observable<any>;
  deleteOrganisms?(id?: any, params?: any): Observable<any>;
  postOrganisms?(value?: any): Observable<any>;
  putOrganisms?(id?: any, value?: any): Observable<any>;
  importOrganisms?(fileList?: any[], params?: any): Observable<any>;
  exportOrganisms?(id?: any, format?: any): Observable<any>;

  /***********
   * BIOITEMS *
   ***********/
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

  filter(_eq?, _in?): any;
  /*****************
   * SECURITY ADMIN *
   *****************/
  getIdentities?(id?: any, params?: any): Observable<any>;
  postIdentity?(value?: any): Observable<any>;
  putIdentity?(id?: any, value?: any): Observable<any>;
  deleteIdentity?(id?: any, params?: any): Observable<any>;

  getGroups?(id?: any, params?: any): Observable<any>;
  postGroup?(value?: any): Observable<any>;
  putGroup?(id?: any, value?: any): Observable<any>;
  deleteGroups?(id?: any, params?: any): Observable<any>;

  getOrganizations?(id?: any, params?: any): Observable<any>;
  postOrganization?(value?: any): Observable<any>;
  putOrganization?(id?: any, value?: any): Observable<any>;
  deleteOrganization?(id?: any, params?: any): Observable<any>;

  getRoles?(id?: any, params?: any): Observable<any>;
  getCurrentUserRoles?(params?: any): Observable<any>;
  postRole?(value?: any): Observable<any>;
  putRole?(id?: any, value?: any): Observable<any>;
  deleteRole?(id?: any, params?: any): Observable<any>;

  getCurrentUserApiKeys?(params?: any): Observable<any>;
  postCurrentUserApiKey?(value?: any, params?: any): Observable<any>;
  removeCurrentUserApiKey?(id?: any, params?: any): Observable<any>;

  getSystemFunctions?(id?: any, params?: any): Observable<any>;
  putACLExpression?(id?: any, value?: any, params?: any): Observable<any>;

  getACL?(id?: any, params?: any): Observable<any>;
  postACL?(value?: any, params?: any): Observable<any>;
  putACL?(id?: any, value?: any, params?: any): Observable<any>;
  deleteACL?(id?: any, params?: any): Observable<any>;

  getAuthrExplain?(id?: any, params?: any): Observable<any>;
  getObjectTypes?(id?: any, params?: any): Observable<any>;

  /******
   * GIS *
   ******/
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

  /***********
   * METADATA *
   ***********/
  getHierarchyNodes?(id?: any, params?: any): Observable<any>;
  postHierarchyNodes?(value?: any, params?: any): Observable<any>;
  putHierarchyNodes?(id?: any, value?: any, params?: any): Observable<any>;
  deleteHierarchyNode?(id?: any, params?: any): Observable<any>;

  /**************
   * ANNOTATIONS *
   ***************/
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

  getFieldID?(type: string): any;

  /************
   * FORMATS *
   ************/


}
