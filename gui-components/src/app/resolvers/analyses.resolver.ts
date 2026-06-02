import { Injectable } from '@angular/core';
import { RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
import {MessageLogService} from 'ngt-gui/core';
import {forkJoin, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AnalysesResolver  {
  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
  ) {}

  async resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let id = null;
    if (['analysisDetail', 'alignmentDetail', 'phylotreeDetail',
      'blastDetail', 'discriminantMatrixDetail', 'supermatrixDetail'].indexOf(route.url[0].path) > -1) {
      id = route.params.id as string;
    }
    if (id) {
      const objType = route.url[0].path.slice(0, -6);
      const params = { filter: { analysis_id: { op: 'eq', unary: id } } };
      const response = await forkJoin({
        analysesResponse: this.backendService.getGenericRequest(objType ?? 'analysis', id) as Observable<any>,
        sequences: this.backendService.getSequences(null,
          {...params, order: {field: 'uniquename', order: 'asc'}}) as Observable<any>,
        individuals: this.backendService.getIndividuals(null,
          {...params, order: {field: 'uniquename', order: 'asc'}}) as Observable<any>,
        organisms: this.backendService.getOrganisms(null,
          {...params, order: {field: 'name', order: 'asc'}}) as Observable<any>,
        derives_from: this.backendService.getAnalyses(null, {filter: {derives_into: id}}) as Observable<any>,
        derives_into: this.backendService.getAnalyses(null, {filter: {derives_from: id}}) as Observable<any>,
      }).toPromise();
      const analysis = response.analysesResponse.content;
      this.messageLogService.addIssues(response.analysesResponse.issues);
      analysis.sequences = response.sequences.content;
      analysis.individuals = response.individuals.content;
      analysis.organisms = response.organisms.content;
      analysis.derives_from = response.derives_from.content;
      analysis.derives_into = response.derives_into.content;

      // formats
      const responseFormats: any = await this.backendService.getFormats(analysis.object_type).toPromise();
      analysis.formats = responseFormats.content;

      // if there are _phylotrees
      if (analysis._phylotrees && analysis._phylotrees.length > 0) {
        const ptreeParams = { filter: { phylotree_id: [] } };
        analysis._phylotrees.forEach(e => { ptreeParams.filter.phylotree_id.push(e.phylotree_id); });
        const ptreeResponse = await forkJoin({
          sequences: this.backendService.getSequences(null,
            {...ptreeParams, order: {field: 'uniquename', order: 'asc'}}) as Observable<any>,
          individuals: this.backendService.getIndividuals(null,
            {...ptreeParams, order: {field: 'uniquename', order: 'asc'}}) as Observable<any>,
          organisms: this.backendService.getOrganisms(null,
            {...ptreeParams, order: {field: 'name', order: 'asc'}}) as Observable<any>,
        }).toPromise();
        if (analysis.sequences.length < 1) { analysis.sequences = ptreeResponse.sequences.content; }
        if (analysis.individuals.length < 1) { analysis.individuals = ptreeResponse.individuals.content; }
        if (analysis.organisms.length < 1) { analysis.organisms = ptreeResponse.organisms.content; }
      }

      // if organisms are missing
      if (analysis.organisms.length < 1 && analysis.sequences && analysis.sequences.length > 0) {
        const seqsParams = { filter: { feature_id: [] } };
        analysis.sequences.forEach(e => { seqsParams.filter.feature_id.push(e.feature_id); });
        const organismsResponse: any = await this.backendService.getOrganisms(null,
          {...seqsParams, order: {field: 'name', order: 'asc'}}).toPromise();
        analysis.organisms = organismsResponse.content;
      }
      return analysis ? analysis : false;
    } else {
      const analysesResponse: any = await this.backendService.getAnalyses().toPromise();
      this.messageLogService.addIssues(analysesResponse.issues);
      return analysesResponse.content ? analysesResponse.content : false;
    }
  }
}
