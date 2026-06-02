import {Injectable} from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';
import {BackendService} from 'ngt-gui/core';
@Injectable({
  providedIn: 'root'
})
export class JobResolver  {

  constructor(private backendService: BackendService) { }

  async resolve(route: ActivatedRouteSnapshot) {
    console.log('Getting Jobs');
    console.log(route.queryParamMap);
    if (route.queryParamMap.get('status')) {
      const JOB_PARAMS = new HttpParams().set('status', route.queryParamMap.get('status'));
      const jobsResponse = await this.backendService.getJobs(undefined, JOB_PARAMS).toPromise();
      return jobsResponse["content"] ? jobsResponse : null;
    }
    else {
      if (route.url[0].path == "processDetail") {
        const jobId = <string>route.params.id;
        const jobResponse = await this.backendService.getJobs(jobId).toPromise();
        const jobContent = jobResponse["content"];

        const processResponse = await this.backendService.getProcesses(jobContent["process_id"]).toPromise();
        const processContent = processResponse["content"];

        jobContent["process"] = processContent;
        return jobContent ? jobContent : null;
      }
      return this.backendService.getJobs().pipe(
        catchError( err => {
          console.log('Jobs API Error: ');
          console.log(err);
          alert('Algo ha fallado: ' +  err.toLocaleString());
          return of(err);
        }
      ));
    }
  }
}
