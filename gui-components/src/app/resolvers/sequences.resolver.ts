import {BackendService} from 'ngt-gui/core';
import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {MessageLogService} from 'ngt-gui/core';
import {forkJoin, lastValueFrom} from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class SequencesResolver {

  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
  ) {
  }

  async resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let id = null;
    let uniquename = null;
    if (route.url[0].path === 'sequenceDetail') {
      id = route.params.id as string;
      uniquename = route.queryParamMap?.get('uniquename')
    }
    if (id) {
      let sequences = null;
      const filter = this.backendService.filter({feature_id: id});
      const response: any = await forkJoin({
        sequences: this.backendService.getSequences(id),
        srcfeature: this.backendService.getSequences(null, this.backendService.filter({derives_into: id})),
        features: this.backendService.getSequences(null, {filter: {derives_from: id}}),
        analyses: this.backendService.getAnalyses(null, filter),
        alignment: this.backendService.getAlignments(null, filter),
        phylotrees: this.backendService.getPhylotrees(null, filter),
        individual: this.backendService.getIndividuals(null, filter),
        formats: this.backendService.getFormats('sequences'),
      }).toPromise();
      sequences = response.sequences.content;
      sequences.srcfeature = response.srcfeature.content && response.srcfeature.content.length > 0 ?
        response.srcfeature.content[0] : null;
      sequences.phylotrees = response.phylotrees.content ? response.phylotrees.content : [];
      sequences.features = response.features.content ? response.features.content : [];
      sequences.analyses = response.analyses.content ? response.analyses.content : [];
      sequences.individual = response.individual.content && response.individual.content.length > 0 ? response.individual.content[0] : null;
      sequences.alignment = response.alignment.content;
      sequences.formats = response.formats.content;
      if (sequences.type_id) {
        const responseOntology: any = await this.backendService.getCvterms(null, sequences.type_id).toPromise();
        if (responseOntology.content) {
          sequences.ontology = responseOntology.content;
        }
      }
      this.messageLogService.addIssues(sequences.issues);
      return sequences ? sequences : false;
    } else if (uniquename) {
      const sequenceResponse: any = await lastValueFrom(this.backendService.getSequences(null, {filter: {uniquename: uniquename}}))
      const sequences = sequenceResponse.content
      if (!sequences[0]) return false
      const sequence = sequences[0]
      id = sequence.feature_id
      const filter = this.backendService.filter({feature_id: id});
      const response: any = await forkJoin({
        srcfeature: this.backendService.getSequences(null, this.backendService.filter({derives_into: id})),
        features: this.backendService.getSequences(null, {filter: {derives_from: id}}),
        analyses: this.backendService.getAnalyses(null, filter),
        alignment: this.backendService.getAlignments(null, filter),
        phylotrees: this.backendService.getPhylotrees(null, filter),
        individual: this.backendService.getIndividuals(null, filter),
        formats: this.backendService.getFormats('sequences'),
      }).toPromise();
      sequence.srcfeature = response.srcfeature.content && response.srcfeature.content.length > 0 ?
        response.srcfeature.content[0] : null;
      sequence.phylotrees = response.phylotrees.content ? response.phylotrees.content : [];
      sequence.features = response.features.content ? response.features.content : [];
      sequence.analyses = response.analyses.content ? response.analyses.content : [];
      sequence.individual = response.individual.content && response.individual.content.length > 0 ? response.individual.content[0] : null;
      sequence.alignment = response.alignment.content;
      sequence.formats = response.formats.content;
      if (sequence.type_id) {
        const responseOntology: any = await this.backendService.getCvterms(null, sequences.type_id).toPromise();
        if (responseOntology.content) {
          sequence.ontology = responseOntology.content;
        }
      }
      this.messageLogService.addIssues(sequences.issues);
      return sequence ? sequence : false;
    } else {
      const sequenceResponse: any = await this.backendService.getSequences().toPromise();
      this.messageLogService.addIssues(sequenceResponse.issues);
      return sequenceResponse.content ? sequenceResponse.content : false;
    }
  }
}
