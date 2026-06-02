import { EventEmitter } from "@angular/core";

export interface StateServiceInterface {
  states: any ;
  currentUrl: string;
  stateServiceEvent: EventEmitter<any>;
  changeCurrentUrlForState(): string;
  getStateCurrenView(): Promise<any>;
  getStateCurrenViewWithoutBackend(): Promise<any>;
  setStateCurrentView(value): Promise<void>;
  setStateCurrentViewWithoutBackend(value): Promise<void>;
  isFromBreadcrumb(): boolean;
  getState(key): any;
  setState(key, value, notUpdateBackend?): Promise<void>;
  getCurrentViewUrl(): string;
  loadGlobalService(): Promise<void>;
}
