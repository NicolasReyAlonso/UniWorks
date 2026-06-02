import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class AnnotationsFieldsResolver  {
  constructor(
    private readonly backendService: BackendService,
  ) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting annotationsFields');
    let templateId = null;
    if (route.url[0].path === 'annotationsFieldDetail') {
      templateId = route.params.id as string;
    }
    if (templateId) {
      const templateResponse: any = await this.backendService.getAnnotationField(templateId).toPromise();
      return templateResponse ? templateResponse : false;
    } else {
      const templatesResponse: any = await this.backendService.getAnnotationField().toPromise();
      return templatesResponse ? templatesResponse : false;
    }

  }
}
