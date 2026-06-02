import {EventEmitter, Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TopAreaService {

  topAreaEventEmitter = new EventEmitter<{type: string, value: any}>();

  constructor() { }
}
