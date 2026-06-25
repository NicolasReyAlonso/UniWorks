import {Injectable} from '@angular/core';
import { Inject, Optional } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {Observable} from 'rxjs';
import {GetProcessesInResourceResponseContent, GetProcessResponse} from "../models/process-types.model";
import {GetResourcesResponse} from "../models/resources.model";
import {ProcessesSourceCode, ProcessesSourceCodeResponse} from "../interfaces/process-types.interface";
import {
  ContainerizationImageItem,
  ContainerizationImageItemResponse,
  ContainerizationImagesItemResponse
} from "../models/containerization-images.model";

//LIBRARY SERVICES
import {GlobalService} from "./global.service";

//LIBRARY TOKENS
import { GLOBAL_SERVICE } from '../tokens/global.token';

//LIBRARY INTERFACES
import { BackendServiceInterface } from '../interfaces/backend/backendService.interface';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';


@Injectable({
  providedIn: 'root'
})
export class BackendService implements BackendServiceInterface{
  private host: string;
  private api_prefix: string;
  public base_url: string;
  static instance: BackendService;
  private readonly globalVariablesService: GlobalServiceInterface;

  constructor(
    private http: HttpClient,
    @Optional() @Inject(GLOBAL_SERVICE) private readonly injectedGlobalService: GlobalServiceInterface,
    private readonly defaultGlobalVariablesService: GlobalService,
  ) {
    this.globalVariablesService = injectedGlobalService || defaultGlobalVariablesService;
    BackendService.instance = this;
    this.host = this.globalVariablesService.getParameter('host');
    this.api_prefix = this.globalVariablesService.getParameter('api_prefix');
    this.base_url = this.globalVariablesService.getParameter('host') + this.globalVariablesService.getParameter('api_prefix');
  }


  private setParams(params: any) {
    const response = {};
    if (params) {
      Object.keys(params).forEach((key) => {
        if (typeof params[key] !== 'string') {
          response[key] = encodeURIComponent(JSON.stringify(params[key]));
        } else {
          response[key] = encodeURIComponent(params[key]);
        }
      });
    }
    return response;
  }

  /***************
   * AUTH SESSION *
   ***************/

  getSession() {
    return this.http.get(this.base_url + '/authn', this.globalVariablesService.authOptions);
  }

  putSession() {
    return this.http.put(this.base_url + '/authn', {}, this.globalVariablesService.authOptions);
  }

  deleteSession() {
    return this.http.delete(this.base_url + '/authn', this.globalVariablesService.authOptions);
  }

  // Multi-provider authentication

  getAuthProviders() {
    return this.http.get(this.base_url + '/authn/providers', this.globalVariablesService.authOptions);
  }

  register(body: { username: string; email?: string; password: string }) {
    return this.http.post(this.base_url + '/authn/register', body, this.globalVariablesService.authOptions);
  }

  // Functions GUI

  getFunctionsGui() {
    const url = `${this.base_url}/authn/functions/gui`;
    return this.http.get(url, {...this.globalVariablesService.authOptions});
  }

  /************
   * PROCESSES *
   ************/

  getProcesses(id?, params?) {
    let url = this.base_url + '/processes/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getProcess(id, params?): Observable<GetProcessResponse> {
    const url = `${this.base_url}/processes/${id}`;
    return this.http.get<any>(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    }) as unknown as Observable<GetProcessResponse>;
  }

  postProcesses(body: any) {
    const url = this.base_url + '/processes/';
    return this.http.post(url, body, this.globalVariablesService.authOptions);
  }

  putProcess(id, body, params?) {
    const url = `${this.base_url}/processes/${id}`
    return this.http.put(url, body, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    })
  }

  public deleteProcess(id: number | string, params?) {
    const url = `${this.base_url}/processes/${id}`;

    return this.http.delete(url, { ...this.globalVariablesService.authOptions,  params: this.setParams(params) })
  }

  getContainerizationImagesByProcessId(id: number | string, params?) {
    const url = `${this.base_url}/processes/${id}/images/`;

    return this.http.get(url, { ...this.globalVariablesService.authOptions,  params: this.setParams(params) })
  }

  public getContainerizationImages(params?: any) {
    const url = `${this.base_url}/containerization_images/`
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)}) as unknown as Observable<ContainerizationImagesItemResponse>
  }

  public getContainerizationImageById(id: string | number, params?: any) {
    const url = `${this.base_url}/containerization_images/${id}`

    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)}) as unknown as Observable<ContainerizationImageItemResponse>
  }

  public putContainerizationImageById(id: string | number, body: Partial<ContainerizationImageItem>, params?: any) {
    const url = `${this.base_url}/containerization_images/${id}`

    return this.http.put(url, body, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public postContainerizationImage(body: Partial<ContainerizationImageItem>, params?: any) {
    const url = `${this.base_url}/containerization_images/`

    return this.http.post(url, body, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public deleteContainerizationImage(id: string | number, params?: any) {
    const url = `${this.base_url}/containerization_images/${id}`

    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public postProcessImages(body: {process_id: number | string, image_id: number | string}, params?: any) {
    const url = `${this.base_url}/process_images/`

    return this.http.post(url, body, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public deleteProcessImages(processId: number| string, imageId: number | string, params?) {
    const url = `${this.base_url}/process_images/${processId},${imageId}`

    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public getProcessImages(id: number | string, params?: any) {
    const url = `${this.base_url}/process_images/${id}`

    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  /************
   * RESOURCES *
   ************/

  getResources(params?) {
    const url = `${this.base_url}/resources/`
    return this.http.get(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    }) as unknown as Observable<GetResourcesResponse>;
  }

  getResourcesByProcessId(pid, params?) {
    const url = `${this.base_url}/processes/${pid}/resources/`;
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getResourceById(id, params?) {
    const url = `${this.base_url}/resources/${id}`;
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putResourceById(id, value, params?) {
    const url = `${this.base_url}/resources/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postResources(value, params?) {
    const url = `${this.base_url}/resources/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteResource(id, params?) {
    const url = `${this.base_url}/resources/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getProcessesInResource(id, params?) {
    const url = `${this.base_url}/processes_in_resource/${id}`;
    return this.http.get(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    }) as unknown as Observable<GetProcessesInResourceResponseContent>;
  }

  deleteProcessesInResource(resourceId, processId, params?) {
    const url = `${this.base_url}/processes_in_resource/${resourceId},${processId}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postProcessesInResource(value, params?) {
    const url = `${this.base_url}/processes_in_resource/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  public getProcessesSourceCodeById(id: number, params?) {
    const url = `${this.base_url}/processes_source_code/${id}`;
    return this.http.get<ProcessesSourceCodeResponse>(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public postProcessesSourceCode(value: Partial<ProcessesSourceCode>, params?) {
    const url = `${this.base_url}/processes_source_code/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)}) as unknown as Observable<ProcessesSourceCodeResponse>
  }

  public putProcessesSourceCode(id:number, value: Partial<ProcessesSourceCode>, params?) {
    const url = `${this.base_url}/processes_source_code/${id}`;
    return this.http.put<ProcessesSourceCodeResponse>(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  public deleteProcessesSourceCode(id: any, params?) {
    const url = `${this.base_url}/processes_source_code/${id}`
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }



  /************
   * Job *
   ************/

  postJobs(data: any) {
    const url = this.base_url + '/jobs/';
    return this.http.post(url, {params: data}, this.globalVariablesService.authOptions);
  }

  getJobs(id?, params?) {
    let url = this.base_url + '/jobs/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putJob(id, value?, params?) {
    const url = `${this.base_url}/jobs/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  /************
   * FORMATS *
   ************/

  getFormats(objType?: string) {
    let url = this.base_url + '/sys/' + objType + '/formats/';
    return this.http.get(url, this.globalVariablesService.authOptions);
  }

  getAnnotations(name: string, params?) {
    let url = this.base_url + '/annotations/';
    return this.http.get(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams({filter: {form_field: name}, ...params})
    });
  }

  /***********
   * METADATA *
   ***********/

  // Ontologies

  getOntologies(id?, params?) {
    let url = this.base_url + '/ontologies/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteOntologies(id?) {
    let url = this.base_url + '/ontologies/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, this.globalVariablesService.authOptions);
  }

  postOntologies(value?) {
    return this.http.post(this.base_url + '/ontologies/', value, this.globalVariablesService.authOptions);
  }

  putOntologies(id, value?) {
    return this.http.put(this.base_url + '/ontologies/' + id, value, this.globalVariablesService.authOptions);
  }

  importOntologies(fileList: any[], params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    return this.http.post(this.base_url + '/ontologies/', fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportOntologies(id, format) {
    return this.http.get(this.base_url + '/ontologies/' + id + '.' + format,
      {...this.globalVariablesService.authOptions, Accept: 'text/' + format, responseType: 'blob'});
  }

  // Ontologies
  getCvterms(ontID?, termID?, params?) {
    let url = this.base_url + '/ontologies/';
    if (ontID != undefined) {
      url += ontID + '/';
    }
    url += 'terms/';
    if (termID != undefined) {
      url += termID;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Analyses

  getAnalyses(id?, params?) {
    let url = this.base_url + '/analyses/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteAnalyses(id?, params?) {
    let url = this.base_url + '/analyses/';
    if (id) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postAnalyses(value?) {
    return this.http.post(this.base_url + '/analyses/', value, this.globalVariablesService.authOptions);
  }

  putAnalyses(id, value?) {
    return this.http.put(this.base_url + '/analyses/' + id, value, this.globalVariablesService.authOptions);
  }

  // Taxonomies

  getTaxonomies(id?, params?) {
    let url = this.base_url + '/taxonomies/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteTaxonomies(id?, params?) {
    let url = this.base_url + '/taxonomies/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postTaxonomies(value?) {
    return this.http.post(this.base_url + '/taxonomies/', value, this.globalVariablesService.authOptions);
  }

  putTaxonomies(id, value?) {
    return this.http.put(this.base_url + '/taxonomies/' + id, value, this.globalVariablesService.authOptions);
  }

  importTaxonomies(fileList: any[], params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    return this.http.post(this.base_url + '/taxonomies/', fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportTaxonomies(id, format) {
    return this.http.get(this.base_url + '/taxonomies/' + id + '.' + format,
      {...this.globalVariablesService.authOptions, Accept: 'text/' + format, responseType: 'blob'});
  }

  // Organisms

  getOrganisms(id?, params?): Observable<any> {
    let url = this.base_url + '/organisms/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteOrganisms(id?, params?) {
    let url = this.base_url + '/organisms/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postOrganisms(value?) {
    return this.http.post(this.base_url + '/organisms/', value, this.globalVariablesService.authOptions);
  }

  putOrganisms(id, value?) {
    return this.http.put(this.base_url + '/organisms/' + id, value, this.globalVariablesService.authOptions);
  }

  importOrganisms(fileList: any[], params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    return this.http.post(this.base_url + '/organisms/', fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportOrganisms(id, format) {
    return this.http.get(this.base_url + '/organisms/' + id + '.' + format,
      {...this.globalVariablesService.authOptions, Accept: 'text/' + format, responseType: 'blob'});
  }

  /***********
   * BIOITEMS *
   ***********/

  // Sequences

  getSequences(id?, params?) {
    let url = this.base_url + '/bos/sequences/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteSequences(id?, params?) {
    let url = this.base_url + '/bos/sequences/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postSequences(value?) {
    return this.http.post(this.base_url + '/bos/sequences/', value, this.globalVariablesService.authOptions);
  }

  putSequences(id, value?) {
    return this.http.put(this.base_url + '/bos/sequences/' + id, value, this.globalVariablesService.authOptions);
  }

  importSequences(fileList: any[], params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    return this.http.post(this.base_url + '/bos/sequences/', fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportSequences(id?, format?, params?) {
    let url = this.base_url + '/bos/sequences/';
    if (id) {
      url += '/' + id;
    }
    if (format) {
      url += '.' + format;
    }
    return this.http.get(url,
      {
        ...this.globalVariablesService.authOptions, Accept: 'text/' + format, responseType: 'blob',
        params: this.setParams(params)
      });
  }

  // Alignments

  getAlignments(id?, params?) {
    let url = this.base_url + '/bos/alignments/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteAlignments(id?, params?) {
    let url = this.base_url + '/bos/alignments/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postAlignments(value?) {
    return this.http.post(this.base_url + '/bos/alignments/', value, this.globalVariablesService.authOptions);
  }

  putAlignments(id, file, params?) {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.put(this.base_url + '/bos/alignments/' + id, fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  importAlignments(fileList: any[], params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    return this.http.post(this.base_url + '/bos/alignments/', fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getConcatAlignments(params: {}): Observable<any> {
    return this.http.get(this.base_url + '/bos/alignments.fasta',
      {
        ...this.globalVariablesService.authOptions,
        Accept: 'text/fasta',
        params: this.setParams(params),
        responseType: 'text'
      });

  }

  exportAlignments(id, format) {
    return this.http.get(this.base_url + '/bos/alignments/' + id + '.' + format,
      {...this.globalVariablesService.authOptions, Accept: 'text/' + format, responseType: 'blob'});
  }

  // Phylotrees

  getPhylotrees(id?, params?) {
    let url = this.base_url + '/bos/phylotrees/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deletePhylotrees(id?, params?) {
    let url = this.base_url + '/bos/phylotrees/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postPhylotrees(value?) {
    return this.http.post(this.base_url + '/bos/phylotrees/', value, this.globalVariablesService.authOptions);
  }

  putPhylotrees(id, value?) {
    return this.http.put(this.base_url + '/bos/phylotrees/' + id, value, this.globalVariablesService.authOptions);
  }

  importPhylotrees(fileList: any[], params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    return this.http.post(this.base_url + '/bos/phylotrees/', fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportPhylotrees(id, format) {
    return this.http.get(this.base_url + '/bos/phylotrees/' + id + '.' + format,
      {...this.globalVariablesService.authOptions, Accept: 'text/' + format, responseType: 'blob'});
  }

  // CHADO'S ENTITIES (INDIVIDUALS & COLLECTIONS)

  getGenericRequest(objType, id?, params?) {
    let url = this.getEndpoint(objType) + '/';
    if (id) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postFromChado(objType, value) {
    return this.http.post(this.getEndpoint(objType) + '/', value, this.globalVariablesService.authOptions);
  }

  putFromChado(objType, id, value) {
    return this.http.put(this.getEndpoint(objType) + '/' + id, value, this.globalVariablesService.authOptions);
  }

  deleteFromChado(objType, id?, params?) {
    let url = this.getEndpoint(objType) + '/';
    if (id) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  importFromChado(objType, fileList: any[], id?, params?) {
    const fd = new FormData();
    for (const file of fileList) {
      fd.append('file', file, file.name);
    }
    const url = this.getEndpoint(objType) + '/';
    if (id) {
      return this.http.put(url + id, fd,
        {...this.globalVariablesService.authOptions, params: this.setParams(params)});
    }
    return this.http.post(url, fd,
      {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportFromChado(objType, id?, format?: string, params?) {
    let url = this.getEndpoint(objType);
    if (id) {
      url += '/' + id;
    }
    if (format) {
      url += '.' + format;
    }
    return this.http.get(url,
      {
        ...this.globalVariablesService.authOptions,
        params: this.setParams(params),
        Accept: 'text/' + format, responseType: 'blob'
      });
  }

  // BROWSER FILTERS

  getBrowserFilters(type: string, id?, params?) {
    // if (!type) what?
    let url = this.base_url + '/browser/' + type + '/filters/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postBrowserFilters(type: string, name: string, value?: any) {
    return this.http.post(this.base_url + '/browser/' + type + '/filters/',
      {name, value}, this.globalVariablesService.authOptions);
  }

  putBrowserFilters(type: string, id: string, value: any) {
    return this.http.put(this.base_url + '/browser/' + type + '/filters/' + id,
      {value}, this.globalVariablesService.authOptions);
  }

  deleteBrowserFilters(type: string, id) {
    return this.http.delete(this.base_url + '/browser/' + type + '/filters/' + id, this.globalVariablesService.authOptions);
  }

  getBrowserFilterForms(browserType: string) {
    const url = this.base_url + '/browser/' + browserType + '/filters/schema';
    return this.http.get(url, this.globalVariablesService.authOptions);
  }

  // TOOLS

  filter(_eq?, _in?) {
    const filters = {};
    for (const key in _eq) {
      filters[key] = {op: 'eq', unary: _eq[key]};
    }
    for (const key in _in) {
      filters[key] = {op: 'in', unary: _in[key]};
    }
    return {filter: [filters]};
  }

  private getEndpoint(type: string) {
    const paths = {
      sequences: '/bos/sequences',
      sequence: '/bos/sequences',
      alignments: '/bos/alignments',
      alignment: '/bos/alignments',
      'multiple-sequence-alignment': '/bos/alignments',
      phylotrees: '/bos/phylotrees',
      phylotree: '/bos/phylotrees',
      'phylogenetic-tree': '/bos/phylotrees',
      blasts: '/bos/blasts',
      blast: '/bos/blasts',
      discriminant_matrices: '/bos/discriminant_matrices',
      discriminant_matrix: '/bos/discriminant_matrices',
      'discriminant-matrix': '/bos/discriminant_matrices',
      sequence_similarities: '/bos/sequence_similarities',
      sequence_similarity: '/bos/sequence_similarities',
      'sequence-similarity': '/bos/sequence_similarities',
      supermatrices: '/bos/supermatrices',
      supermatrix: '/bos/supermatrices',
      individuals: '/individuals',
      individual: '/individuals',
      collections: '/collections',
      collection: '/collections',
      analyses: '/analyses',
      analysis: '/analyses',
      taxonomies: '/taxonomies',
      taxonomy: '/taxonomies',
      organisms: '/organisms',
      organism: '/organisms',
      ontologies: '/ontologies',
      ontology: '/ontologies',
      terms: '/ontologies/terms',
      term: '/ontologies/terms',
      layers: '/geo/layers',
      identities: '/identities',
      organizations: '/organizations',
      roles: '/roles',
      case_studies: '/case_studies',
      case_study: '/case_studies',
      hierarchy: '/hierarchy_nodes',
      annotation_form_fields: '/annotation_form_fields',
      annotation_form_field: '/annotation_form_fields',
      annotation_form_templates: '/annotation_form_templates',
      annotation_form_template: '/annotation_form_templates',
      annotations: '/annotations',
      annotation: '/annotations',
      viewer: '/viewz',
      compute_resources: '/resources',
      references_acl: '/authr_ref_entities',
      processes_types: '/processes',
      functionalObject: '/functional_objects',
      containerization_images: "/containerization_images"
    };
    return this.base_url + paths[type];
  }

  getFieldID(type: string) {
    const ids = {
      sequences: 'feature_id',
      alignments: 'analysis_id',
      phylotrees: 'analysis_id',
      blasts: 'analysis_id',
      discriminant_matrices: 'analysis_id',
      supermatrices: 'analysis_id',
      individuals: 'stock_id',
      collections: 'id',
      analyses: 'analysis_id',
      taxonomies: 'phylotree_id',
      organisms: 'organism_id',
      ontologies: 'cv_id',
      layers: 'id',
      identities: 'id',
      organizations: 'id',
      roles: 'id',
      case_studies: 'id',
      hierarchy: 'id',
      annotationsField: 'id',
      annotationsTemplate: 'id',
      viewer: 'id',
      compute_resources: 'id',
      containerization_images: 'id'
    };
    return ids[type];
  }

  buildSelectionFilter(type: string, items: any[], checkedAll: boolean = false) {
    const filter = {};
    if (!items.length) {
      return filter;
    }
    const op = checkedAll ? 'out' : 'in';
    filter[this.getFieldID(type)] = {op, unary: Array.from(items)};
    return {filter};
  }

  /*****************
   * SECURITY ADMIN *
   *****************/

  // Identities

  getIdentities(id?, params?) {
    let url = this.base_url + '/identities/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postIdentity(value?) {
    return this.http.post(this.base_url + '/identities/', value, this.globalVariablesService.authOptions);
  }

  putIdentity(id, value?) {
    return this.http.put(this.base_url + '/identities/' + id, value, this.globalVariablesService.authOptions);
  }

  deleteIdentity(id?, params?) {
    let url = this.base_url + '/identities/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Groups

  getGroups(id?, params?) {
    let url = this.base_url + '/groups/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postGroup(value?) {
    return this.http.post(this.base_url + '/groups/', value, this.globalVariablesService.authOptions);
  }

  putGroup(id, value?) {
    return this.http.put(this.base_url + '/groups/' + id, value, this.globalVariablesService.authOptions);
  }

  deleteGroups(id?, params?) {
    let url = this.base_url + '/groups/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Organizations

  getOrganizations(id?, params?) {
    let url = this.base_url + '/organizations/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postOrganization(value?) {
    return this.http.post(this.base_url + '/organizations/', value, this.globalVariablesService.authOptions);
  }

  putOrganization(id, value?) {
    return this.http.put(this.base_url + '/organizations/' + id, value, this.globalVariablesService.authOptions);
  }

  deleteOrganization(id?, params?) {
    let url = this.base_url + '/organizations/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Roles

  getRoles(id?, params?) {
    let url = this.base_url + '/roles/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getCurrentUserRoles(params?) {
    const url = this.base_url + '/identities_roles/0';
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postRole(value?) {
    return this.http.post(this.base_url + '/roles/', value, this.globalVariablesService.authOptions);
  }

  putRole(id, value?) {
    return this.http.put(this.base_url + '/roles/' + id, value, this.globalVariablesService.authOptions);
  }

  deleteRole(id?, params?) {
    let url = this.base_url + '/roles/';
    if (id != undefined) {
      url += id;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getUserRole(userId) {
    return 'guest';
  }

  // API Keys

  getCurrentUserApiKeys(params?) {
    const url = this.base_url + '/api_keys/0';
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postCurrentUserApiKey(value, params?) {
    return this.http.post(this.base_url + '/api_keys/', value, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    });
  }

  removeCurrentUserApiKey(id, params?) {
    const url = `${this.base_url}/api_keys/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // System Functions

  getSystemFunctions(id?, params?) {
    let url = this.base_url + '/system_functions/';
    if (id != undefined) {
      url += id;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putACLExpression(id, value, params?) {
    const url = `${this.base_url}/acl_expressions/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // ACLs

  getACL(id?, params?) {
    let url = this.base_url + '/acls/';
    if (id != undefined) {
      url += `/${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postACL(value?, params?) {
    const url = this.base_url + '/acls/';
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putACL(id, value, params?) {
    const url = `${this.base_url}/acls/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteACL(id, params?) {
    const url = `${this.base_url}/acls/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  //AUTHR EXPLAIN

  getAuthrExplain(id?, params?) {
    let url = this.base_url + '/authr_explain';
    if (id != undefined) {
      url += `/${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Objects Types

  getObjectTypes(id?, params?) {
    let url = this.base_url + '/object_types/';
    if (id != undefined) {
      url += `/${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }


  /******
   * GIS *
   ******/

  // Regions

  getRegionsGIS(id?) {
    let url = this.base_url + '/geo/regions/';
    if (id != undefined) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions});
  }

  postRegionsGIS(value) {
    const url = this.base_url + '/geo/regions/';
    return this.http.post(url, value, {...this.globalVariablesService.authOptions});
  }

  putRegionGIS(id, value: any) {
    const url = this.base_url + `/geo/regions/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions});
  }

  deleteRegionsGIS(id) {
    const url = this.base_url + `/geo/regions/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions});
  }

  // Layers

  getLayerGIS(id?, params?) {
    let url = this.base_url + `/geo/layers/`;
    if (id != undefined) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  exportLayerGIS(id, format, params?) {
    const url = `${this.base_url}/geo/layers/${id}.${format}`;
    return this.http.get(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params),
      responseType: 'blob'
    });
  }

  postLayerGIS(file: File, metadata: {
    name: string,
    wks: string,
    case_studies: any,
    types?: any,
    attributes: {
      tags: string[]
    }
  }) {
    const url = this.base_url + `/geo/layers/`;
    const formData = new FormData();
    formData.append('layer_file', file, file.name);
    formData.append('metadata', JSON.stringify(metadata));
    const headers = new HttpHeaders();
    headers.append('Content-Type', 'multipart/form-data');
    headers.append('Accept', 'application/json');
    return this.http.post(url, formData, {
      headers,
      ...this.globalVariablesService.authOptions
    });
  }

  postLayerGISByQuery(value, params?) {
    const url = `${this.base_url}/geo/layers/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putLayerGIS(id, value: any, params?) {
    const url = `${this.base_url}/geo/layers/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteLayerGIS(id) {
    const url = this.base_url + `/geo/layers/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions});
  }

  createHttpGet(url, params?, responseType?, Accept?) {
    return this.http.get(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params),
      responseType: responseType,
      Accept: Accept
    });
  }

  createHttpGetResponseText(url, params?) {
    return this.http.get(url, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params),
      responseType: 'text'
    });
  }

  createHttpGetResponseTextWithoutAuthOptions(url, params?) {
    return this.http.get(url, {params: this.setParams(params), responseType: 'text'});
  }

  putLayerProperty(layerId, propertyName, value, params?) {
    const url = `${this.base_url}/geo/layers/${layerId}/${propertyName}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Styles

  getLayersStyles(id?, params?) {
    let url = `${this.base_url}/geo/layers/styles/`;
    if (id != undefined) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postGeoStyle(style, params?) {
    const url = `${this.base_url}/geo/styles/`
    return this.http.post(url, style, {...this.globalVariablesService.authOptions, params: this.setParams(params)})
  }

  // Case studies

  getCaseStudies(id?, params?) {
    let url = `${this.base_url}/case_studies/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postCaseStudy(value, params?) {
    const url = `${this.base_url}/case_studies/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putCaseStudy(id, value, params?) {
    const url = `${this.base_url}/case_studies/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteCaseStudy(id, params?) {
    const url = `${this.base_url}/case_studies/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Case Studies Items

  getCaseStudiesItem(id?, params?) {
    let url = `${this.base_url}/case_study_items/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postCaseStudiesItem(value, params?) {
    const url = `${this.base_url}/case_study_items/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteCaseStudyItem(id, params?) {
    const url = `${this.base_url}/case_study_items/${id}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteCaseStudyItemByCaseStudyAndItem(caseStudyId, layerId, params?) {
    const url = `${this.base_url}/case_study_items/${caseStudyId},${layerId}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  /***********
   * METADATA *
   ***********/

  getHierarchyNodes(id?, params?) {
    let url = `${this.base_url}/hierarchy_nodes/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postHierarchyNodes(value, params?) {
    const url = `${this.base_url}/hierarchy_nodes/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putHierarchyNodes(id, value, params?) {
    let url = `${this.base_url}/hierarchy_nodes/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteHierarchyNode(id?, params?) {
    let url = `${this.base_url}/hierarchy_nodes/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  /**************
   * ANNOTATIONS *
   ***************/

  // Fields

  getAnnotationField(id?, params?) {
    let url = `${this.base_url}/annotation_form_fields/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postAnnotationField(value, params?) {
    const url = `${this.base_url}/annotation_form_fields/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putAnnotationFields(id, value, params?) {
    let url = `${this.base_url}/annotation_form_fields/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteAnnotationField(id?, params?) {
    let url = `${this.base_url}/annotation_form_fields/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Templates

  getAnnotationsTemplates(id?, params?) {
    let url = `${this.base_url}/annotation_form_templates/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postAnnotationTemplates(value, params?) {
    const url = `${this.base_url}/annotation_form_templates/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putAnnotationTemplates(id, value, params?) {
    let url = `${this.base_url}/annotation_form_templates/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteAnnotationTemplates(id?, params?) {
    let url = `${this.base_url}/annotation_form_templates/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Annotation Instances

  getAnnotationsByObjectUUID(object_uuid, params?) {
    const url = `${this.base_url}/annotations/${object_uuid}`;
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putAnnotationByObjectUUID(object_uuid, value, params?) {
    const url = `${this.base_url}/annotations/${object_uuid}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Identity Store

  getIdentityStore(key?, params?) {
    let url = `${this.base_url}/identity_store/`;
    if (key) {
      url += key;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putIdentityStore(key, value, params?) {
    const url = `${this.base_url}/identity_store/${key}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Viewers

  getViewers(id?, params?) {
    let url = `${this.base_url}/viewz/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postView(value, params?) {
    const url = `${this.base_url}/viewz/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putView(id, value, params?) {
    const url = `${this.base_url}/viewz/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteView(id?, params?) {
    let url = `${this.base_url}/viewz/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  async cloneView(id, params?): Promise<any> {
    const urlGET = `${this.base_url}/viewz/${id}`;
    const urlPOST = `${this.base_url}/viewz/`;
    const responseGET: any = await this.http.get(urlGET, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    }).toPromise();
    const bodyPost = {
      data: responseGET.content.data,
      obj_type_id: responseGET.content.obj_type_id,
      name: `${responseGET.content.name} - clone`,
      type: responseGET.content.type,
    };
    const responsePOST: any = await this.http.post(urlPOST, bodyPost, {
      ...this.globalVariablesService.authOptions,
      params: this.setParams(params)
    }).toPromise();
  }

  async cloneViewz(id, name) {
    const urlPost = `${this.base_url}/viewz/`;
    const urlGet = `${this.base_url}/viewz/${id}`;
    const responseGet: any = await this.http.get(urlGet, {...this.globalVariablesService.authOptions}).toPromise();
    responseGet.id = null;
    await this.http.post(urlPost, responseGet.content, {...this.globalVariablesService.authOptions}).toPromise();
  }

  // Individuals

  getIndividuals(id?, params?) {
    let url = `${this.base_url}/individuals/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putIndividual(id, value, params?) {
    let url = `${this.base_url}/individuals/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Functional Objects

  getFunctionalObject(id?, params?) {
    let url = `${this.base_url}/functional_objects/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }


  // Collections

  getCollections(id?, params?) {
    let url = `${this.base_url}/collections/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  putCollection(id, value, params?) {
    const url = `${this.base_url}/collections/${id}`;
    return this.http.put(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postCollection(value, params?) {
    const url = `${this.base_url}/collections/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  postCollectionItem(value, params?) {
    const url = `${this.base_url}/collection_items/`;
    return this.http.post(url, value, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteCollections(id?, params?) {
    let url = `${this.base_url}/collections/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  deleteCollectionItemByCollectionAndItem(collectionUuid, itemId, params?) {
    const url = `${this.base_url}/collection_items/${collectionUuid},${itemId}`;
    return this.http.delete(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  // Status Checkers

  getStatusCheckers(params?) {
    let url = `${this.base_url}/sys/status_checkers/`;
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getJmTypes(id?, params?) {
    let url = `${this.base_url}/jm_types/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

  getBoHeaders(id?, params?) {
    let url = `${this.base_url}/sys/bo_headers/`;
    if (id) {
      url += `${id}`;
    }
    return this.http.get(url, {...this.globalVariablesService.authOptions, params: this.setParams(params)});
  }

}
