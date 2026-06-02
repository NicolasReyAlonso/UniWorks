import { Injectable } from '@angular/core';
import { RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import {BackendService} from 'ngt-gui/core';
import {MessageLogService} from 'ngt-gui/core';
import {forkJoin, lastValueFrom, Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImportResolver  {
  constructor(
    private readonly backendService: BackendService,
    private readonly messageLogService: MessageLogService,
  ) {}

  async resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const objType = route.url[0].path.replace('Import', '');
    const response = await lastValueFrom(forkJoin({
      genes: this.backendService.getAnnotations('gene') as Observable<any>,
    }));
    const data: any = {
      genes: response.genes.content,
      sources: response.genes.content,
    };
    return data ? data : false;
  }
}
