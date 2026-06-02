import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class CaseStudiesResolver  {
  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting caseStudies');
    let caseStudyId = null;
    if (route.url[0].path == "caseStudiesDetail") {
      caseStudyId = <string>route.params.id;
    }
    if (caseStudyId) {
      const caseStudy: any = await this.backendService.getCaseStudies(caseStudyId).toPromise();
      return caseStudy.content ? caseStudy.content : false;
    } else {
      const caseStudies: any = await this.backendService.getCaseStudies().toPromise();
      return caseStudies.content ? caseStudies.content : false;
    }

  }
}
