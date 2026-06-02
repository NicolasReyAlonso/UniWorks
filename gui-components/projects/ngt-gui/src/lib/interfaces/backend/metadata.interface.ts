import { Observable } from "rxjs";

export interface backendMetadataInterface {
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

    getHierarchyNodes?(id?: any, params?: any): Observable<any>;
    postHierarchyNodes?(value?: any, params?: any): Observable<any>;
    putHierarchyNodes?(id?: any, value?: any, params?: any): Observable<any>;
    deleteHierarchyNode?(id?: any, params?: any): Observable<any>;

}