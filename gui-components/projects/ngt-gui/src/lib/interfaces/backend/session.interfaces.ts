import { Observable } from "rxjs";

export interface backendSessionInterface {
    getSession() : Observable<any>;
    putSession() : Observable<any>;
    deleteSession() : Observable<any>;
}