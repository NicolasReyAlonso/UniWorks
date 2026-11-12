import { Subject } from 'rxjs';

/** Payload of the backend's `entity_changed` event: which records of an
 *  entity were written by a committed transaction. Ids only, no data. */
export interface EntityChangedEvent {
  entity: string;
  created: Array<number | string>;
  updated: Array<number | string>;
  deleted: Array<number | string>;
}

export interface SocketServiceInterface {
  /** Emitted when the backend signals that the navigation tree changed. */
  readonly navigationChangedSubject?: Subject<any>;
  /** Emitted after any committed write on a backend entity. */
  readonly entityChangedSubject?: Subject<EntityChangedEvent>;
  connect(): void;
  initEventsProccess(): void;
  disconnect(): void;
}
