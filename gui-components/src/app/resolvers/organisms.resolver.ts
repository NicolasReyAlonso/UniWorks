import { Injectable } from '@angular/core';
import { RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
import {MessageLogService} from 'ngt-gui/core';

@Injectable({
  providedIn: 'root'
})
export class OrganismsResolver  {

  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
  ) {}

  async resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let id = null;
    if (route.url[0].path === 'organismDetail') {
      id = route.params.id as string;
    }
    if (id) {
      const response: any = await this.backendService.getOrganisms(id).toPromise();
      this.messageLogService.addIssues(response.issues);
      const organism = response.content;
      if (organism.type_id) {
        const ontologyResponse: any = await this.backendService.getCvterms(null, organism.type_id).toPromise();
        if (ontologyResponse.content) {
          organism.type = ontologyResponse.content;
        }
      }
      return organism ? organism : false;
    } else {
      const organismResponse: any = await this.backendService.getOrganisms().toPromise();
      this.messageLogService.addIssues(organismResponse.issues);
      return organismResponse.content ? organismResponse.content : false;
    }
  }

}
