
import firebase from 'firebase/compat/app';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import { EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';

export interface AuthServiceInterface {
  USE_WEBSOCKETS: boolean; // "true" to activate WebSockets, "false" to not use it
  USE_ACL_OF_SCREENS: boolean; // "true" to read ACL of screens, "false" to read it from local structure (test purposes)
  user: any;
  permissions: Map<string, any>;
  changeUserEvent: EventEmitter<any>;
  authInit: boolean;
  hiddenAuthModal: boolean;
  currentRoles: any[];

    user$: Observable<any>;
  authInit$: Observable<boolean>;

  readonly promiseAuthState: any;
  readonly isAnonymous: any;
  readonly isAuthenticated: boolean;
  readonly isEmailVerified: boolean;
  readonly currentUserId: string;
  readonly userData: any;
  load(angularFireAuth: AngularFireAuth): Promise<any>;
  initializeAngularFireAuthChange(): any;
  changeUserFirebase(currentUser: firebase.User): any;
  updateToken(token: string): any;
  getJWT(user: firebase.User):any;
  login(currentUser): any;
  createUserWithEmailAndPassword(email, password): any;
  loginWithEmailAndPassword(email, password): any;
  forgetPassword(email): any;
  loginAnonymous(): any;
  loginWithGoogle(): any;
  logout(): any;
  havePermission(permissionCode: string): boolean;
  haveOnePermissionForApiKeys(): boolean;
  haveRole(name: string): boolean;
}
