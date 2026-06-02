import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class IndividualResolver  {

  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting Individuals');
    let id = null;
    if (route.url[0].path === 'individualDetail') {
      id = route.params.id as string;
    }
    if (id) {
      const item: any = await this.backendService.getIndividuals(id).toPromise();
      return item.content ? item.content : false;
    }
    const items: any = await this.backendService.getIndividuals().toPromise();
    return items.content ? items.content : false;

  }
}
