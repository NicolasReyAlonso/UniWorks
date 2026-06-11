import { Subject } from 'rxjs';

export interface SocketServiceInterface {
  /** Emitted when the backend signals that the navigation tree changed. */
  readonly navigationChangedSubject?: Subject<any>;
  connect(): void;
  initEventsProccess(): void;
  disconnect(): void;
}
