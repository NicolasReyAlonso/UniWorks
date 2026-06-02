import { Injectable } from '@angular/core';
import { Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import {forkJoin, Observable, of} from 'rxjs';
import {BackendService} from 'ngt-gui/core';
import {MessageLogService} from 'ngt-gui/core';

@Injectable({
  providedIn: 'root'
})
export class TermsResolver  {
  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
  ) {}

  async resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let id = null;
    if (route.url[0].path === 'termDetail') {
      id = route.params.id as string;
    }
    if (id) {
      const filter = this.backendService.filter({feature_id: id});
      const response: any = await forkJoin({
        terms: this.backendService.getCvterms(null, id),
      }).toPromise();
      const terms = response.terms.content;
      this.messageLogService.addIssues(terms.issues);
      return terms ? terms : false;
    } else {
      const termResponse: any = await this.backendService.getCvterms().toPromise();
      this.messageLogService.addIssues(termResponse.issues);
      return termResponse.content ? termResponse.content : false;
    }
  }
}
