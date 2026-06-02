import { Observable } from 'rxjs';
export interface ProcessesServiceInterface {
      getProcess?(id: any, params?: any): Observable<any>;
      getProcesses?(id?: any, params?: any): Observable<any>;
      postProcesses?(body: any): Observable<any>;
      putProcess?(id: any, body: any, params?: any): Observable<any>;
      deleteProcess?(id: number | string, params?: any): Observable<any>;
      getContainerizationImagesByProcessId?(id: number | string, params?: any): Observable<any>;
      getContainerizationImages?(params?: any): Observable<any>;
      getContainerizationImageById?(id: string | number, params?: any): Observable<any>;
      putContainerizationImageById?(id: string | number, body: Partial<any>, params?: any): Observable<any>;
      postContainerizationImage?(body: Partial<any>, params?: any): Observable<any>;
      deleteContainerizationImage?(id: string | number, params?: any): Observable<any>;
      postProcessImages?(body: {process_id: number | string, image_id: number | string}, params?: any): Observable<any>;
      deleteProcessImages?(processId: number| string, imageId: number | string, params?: any): Observable<any>;
      getProcessImages?(id: number | string, params?: any): Observable<any>;
}