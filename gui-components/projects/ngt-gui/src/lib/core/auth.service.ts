import {EventEmitter, Injectable} from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import firebase from 'firebase/compat/app';
import { GoogleAuthProvider } from "firebase/auth"
import {Router} from '@angular/router';
import {AngularFireAuth} from '@angular/fire/compat/auth';
import {BehaviorSubject, firstValueFrom, forkJoin, lastValueFrom, Observable} from 'rxjs';
import { Inject, Optional } from '@angular/core';

// Library Services
import {SocketService} from './socket.service';
import {BackendService} from './backend.service';
import {StateService} from './state.service';
import {RoutePathService} from './route-path.service';
import {GlobalService} from "./global.service";
import {MessageLogService} from './message-log.service';

// Interfaces
import { AuthServiceInterface } from '../interfaces/auth/authService.interface';
import { BackendServiceInterface } from '../interfaces/backend/backendService.interface'
import { SocketServiceInterface } from '../interfaces/socket/socketService.interface';
import { StateServiceInterface } from '../interfaces/state/state.interface';
import { RoutePathServiceInterface } from '../interfaces/route/route-path.interface';
import { GlobalServiceInterface } from '../interfaces/global/global.interface';
import { MessageLogClassServiceInterface, MessageLogServiceInterface } from '../interfaces/message-log/message-log.interface';

// Tokens for optional injection
import { SOCKET_SERVICE } from '../tokens/socket.token';
import { BACKEND_SERVICE } from '../tokens/backend.token'
import { STATE_SERVICE } from '../tokens/state.token';
import { ROUTE_PATH_SERVICE } from '../tokens/route-path.token'
import { GLOBAL_SERVICE } from '../tokens/global.token'
import { MESSAGE_LOG_SERVICE } from '../tokens/message-log.token';


@Injectable({
  providedIn: 'root'
})
export class AuthService implements AuthServiceInterface{
  //Servicios
  private userSubject = new BehaviorSubject<any>(undefined);
  private authInitSubject = new BehaviorSubject<boolean>(false);
  
  public user$ = this.userSubject.asObservable();
  public authInit$ = this.authInitSubject.asObservable();
  


  private backend: BackendServiceInterface;
  private socketService: SocketServiceInterface;
  private readonly stateService: StateServiceInterface;
  private routePathService: RoutePathServiceInterface;
  private readonly globalVariablesServices: GlobalServiceInterface;
  private logService: MessageLogServiceInterface;

  USE_WEBSOCKETS = true; // "true" to activate WebSockets, "false" to not use it
  USE_ACL_OF_SCREENS = true; // "true" to read ACL of screens, "false" to read it from local structure (test purposes)

  private _user: any = undefined; // ✅ Inicializar explícitamente
  get user(): any {
    return this._user;
  }
  set user(value: any) {
    console.log('📝 Setting user:', value); // Debug
    this._user = value;
    this.userSubject.next(value);
  }
  
  private _authInit = false;
  get authInit(): boolean {
    return this._authInit;
  }
  set authInit(value: boolean) {
    console.log('📝 Setting authInit:', value); // Debug
    this._authInit = value;
    this.authInitSubject.next(value);
  }



  permissions: Map<string, any> = new Map();
  changeUserEvent = new EventEmitter<any>();
  hiddenAuthModal = true;
  currentRoles = [];
  

constructor(
  // Servicios inyectados opcionalmente
  @Optional() @Inject(SOCKET_SERVICE) private injectedSocketService: SocketServiceInterface,
  @Optional() @Inject(BACKEND_SERVICE) private injectedBackendService: BackendServiceInterface,
  @Optional() @Inject(STATE_SERVICE) private readonly injectedStateService: StateServiceInterface,
  @Optional() @Inject(ROUTE_PATH_SERVICE) private injectedRoutePathService: RoutePathServiceInterface,
  @Optional() @Inject(GLOBAL_SERVICE) private readonly injectedGlobalService: GlobalServiceInterface,
  @Optional() @Inject(MESSAGE_LOG_SERVICE) private injectedlogService: MessageLogServiceInterface,
  // Servicios por defecto
  private defaultSocketService: SocketService,
  private defaultBackendService: BackendService,
  private defaultLogService: MessageLogService,
  private firebaseAuth: AngularFireAuth,
  private router: Router,
  private defaultRoutePathService: RoutePathService,
  private readonly defaultGlobalVariablesServices: GlobalService,
  private readonly defaultStateService: StateService,
) {
  // Si el servicio opcional no está inyectado, usamos el default
  this.socketService = this.injectedSocketService || this.defaultSocketService;
  this.backend = this.injectedBackendService || this.defaultBackendService;
  this.stateService = this.injectedStateService || this.defaultStateService;
  this.routePathService = this.injectedRoutePathService || this.defaultRoutePathService;
  this.globalVariablesServices = this.injectedGlobalService || this.defaultGlobalVariablesServices;
  this.logService = this.injectedlogService || defaultLogService;
}


 async load(angularFireAuth: AngularFireAuth): Promise<any> {
  console.log('🚀 AuthService.load() iniciando...');
  
  // Solo inicializar el listener, él manejará el estado inicial
  this.initializeAngularFireAuthChange();
  
  // Esperar a que authInit se establezca
  return new Promise((resolve) => {
    const subscription = this.authInit$.subscribe(authInit => {
      if (authInit === true) {
        console.log('✅ AuthService.load() completado. authInit:', authInit);
        subscription.unsubscribe();
        resolve(undefined);
      }
    });
  });
}


  initializeAngularFireAuthChange() {
  this.firebaseAuth.user.subscribe(async (currentUser) => {
    await this.changeUserFirebase(currentUser);
  });
}

  async changeUserFirebase(currentUser: firebase.User) {
    console.log('🔄 changeUserFirebase:', currentUser);
    
    if (!currentUser) {
      this.hiddenAuthModal = false;
      this.user = null; // Esto ahora emitirá el cambio
      this.changeUserEvent.emit(null);
      this.authInit = true; // Esto ahora emitirá el cambio
      return;
    }
    
    if (currentUser.emailVerified || currentUser.isAnonymous) {
      await this.login(currentUser);
    } else {
      this.authInit = true;
      await this.logout();
    }
  }

  get promiseAuthState(): any {
    return this.firebaseAuth.authState;
  }

  get isAnonymous() {
    return (this.user && this.user.isAnonymous);
  }

  // check if user is authenticated
  get isAuthenticated(): boolean {
    return this.user != null;
  }

  // Check if email is verified. In case you want to send email or enable disable send email button
  get isEmailVerified(): boolean {
    return this.isAuthenticated ? this.user.emailVerified : false;
  }

  // Current user id
  get currentUserId(): string {
    return this.isAuthenticated ? this.user.uid : null;
  }

  // Get user data
  get userData(): any {
    if (!this.isAuthenticated) {
      return [];
    }
    return [
      {
        id: this.user.uid,
        displayName: this.user.displayName,
        email: this.user.email,
        phoneNumber: this.user.phoneNumber,
        photoURL: this.user.photoURL,
        isAnonymous: this.user.isAnonymous,
      }
    ];
  }

  updateToken(token: string) {
    if (token == null) {
      this.globalVariablesServices.authOptions = {
        withCredentials: true, headers: new HttpHeaders({
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': 'http://localhost:4200'
        })
      };
    } else {
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + token, 'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': 'http://localhost:4200'
      });
      this.globalVariablesServices.authOptions = {withCredentials: true, headers}; // Previously it was just { withCredentials: true, headers}
    }
    console.log('Update Token');
    console.log(this.globalVariablesServices.authOptions);
  }

  // JWT_fields = {acr, amr, at_hash, aud, auth_time, azp, cnf, c_hash,
  //   exp, firebase, iat, iss, jti, nbf, nonce, sub}
  async getJWT(user: firebase.User) {
    return user.emailVerified || user.isAnonymous ? await user.getIdToken() : null;
  }

  async login(currentUser) {
    console.log('🔐 Logging in user:', currentUser);
    const token = await this.getJWT(currentUser);

    if (token) {
      this.updateToken(token);
      try {
        await this.bootstrapSession(currentUser);
      } catch (e) {
        // State already reset inside bootstrapSession; swallow here so the
        // Firebase auth-state listener path does not raise an unhandled error.
      }
    }
  }

  /**
   * Shared post-authentication bootstrap, independent of the provider:
   * establishes the backend session (cookie), loads permissions/roles and
   * connects realtime. The caller must have set the appropriate auth header
   * beforehand (Bearer for Firebase, Basic for username/password).
   */
  private async bootstrapSession(user: any) {
    try {
      await lastValueFrom(this.backend.putSession());
      const response = await forkJoin({
        functionsGui: this.backend.getFunctionsGui() as Observable<any>,
        currentUserRoles: this.backend.getCurrentUserRoles() as Observable<any>,
      }).toPromise();

      this.permissions.clear();

      if (this.USE_ACL_OF_SCREENS) {
        for (const permissionResponse of response.functionsGui.content) {
          this.permissions.set(permissionResponse.name, permissionResponse.permissions);
        }
      } else {
        for (const permissionResponse of TEST_PERMISSIONS) {
          this.permissions.set(permissionResponse.name, permissionResponse.permissions);
        }
      }

      this.user = user; // Emitirá el cambio
      this.authInit = true; // Emitirá el cambio
      this.currentRoles = response.currentUserRoles.content;
      this.changeUserEvent.emit(user);

      console.log('✅ User logged in and saved as:', this.user);
      await this.stateService.loadGlobalService();

      if (this.USE_WEBSOCKETS) {
        this.socketService.connect();
      }
    } catch (e) {
      console.error('❌ Error during login:', e);
      this.user = null; // Emitirá el cambio
      this.authInit = true; // Emitirá el cambio
      this.hiddenAuthModal = false;
      throw e;
    }
  }

  /** Auth providers advertised by the backend (e.g. basic, firebase). */
  getAuthProviders(): Observable<any> {
    return this.backend.getAuthProviders();
  }

  /** Set the Authorization header for the basic (username/password) provider. */
  updateBasicToken(username: string, password: string) {
    const encoded = btoa(`${username}:${password}`);
    const headers = new HttpHeaders({
      Authorization: 'Basic ' + encoded,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': 'http://localhost:4200'
    });
    this.globalVariablesServices.authOptions = { withCredentials: true, headers };
  }

  /** Login through the built-in basic (username/password) provider. */
  async loginWithBasic(username: string, password: string) {
    this.updateBasicToken(username, password);
    const basicUser = {
      uid: username,
      displayName: username,
      email: null,
      isAnonymous: false,
      emailVerified: true,
      provider: 'basic',
    };
    await this.bootstrapSession(basicUser);
  }

  /** Self-registration for the basic provider, followed by an automatic login. */
  async registerBasic(data: { username: string; email?: string; password: string }) {
    await lastValueFrom(this.backend.register(data));
    await this.loginWithBasic(data.username, data.password);
  }

  async createUserWithEmailAndPassword(email, password) {
    const user = await this.firebaseAuth.createUserWithEmailAndPassword(email, password);
    await user.user.sendEmailVerification();
  }

  async loginWithEmailAndPassword(email, password) {
    const user = await this.firebaseAuth.signInWithEmailAndPassword(email, password);
    if (!user.user.emailVerified) {
      await user.user.sendEmailVerification();
      const error: any = new Error();
      error.code = 'auth/email-not-verified';
      await this.logout();
      throw error;
    }
  }

  async forgetPassword(email) {
    await this.firebaseAuth.sendPasswordResetEmail(email);
  }

  async loginAnonymous() {
    await this.firebaseAuth.signInAnonymously();
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await this.firebaseAuth.signInWithPopup(provider);
    } catch (error) {

    }
  }

  async logout() {
    console.log('🚪 Logging out...');
    this.hiddenAuthModal = false;
    await this.firebaseAuth.signOut();
    this.user = null; // Emitirá el cambio
    this.currentRoles = [];

    if (this.USE_WEBSOCKETS) {
      this.socketService.disconnect();
    }

    this.permissions.clear();
    this.routePathService._log.splice(0, this.routePathService._log.length);
    this.changeUserEvent.emit(this.user);
    
    this.backend.deleteSession().subscribe(
      (response: any) => {
        this.logService.addIssues(response.issues);
      }, error => {
        this.logService.addIssues(error.issues);
      }, () => {
      });
    
    this.updateToken(null);
    await this.router.navigate(['home']);
  }


  havePermission(permissionCode: string): boolean {
    if (!this.permissions || !this.permissions.get(permissionCode)) {
      return false;
    }
    for (const permission of this.permissions.get(permissionCode)) {
      if (permission === 'read') {
        return true;
      }
    }
    return false;
  }

  haveOnePermissionForApiKeys(): boolean {
    const value = this.currentRoles.find((role) => {
      const name = role.name;
      return name === 'read-molecular-api' || name === 'write-molecular-api' || name === 'read-geo-api'
        || name === 'write-geo-api' || name === 'jobs-api' || name === 'read-files-api' || name === 'write-files-api';
    });
    return value ? true : false;
  }

  haveRole(name: string): boolean {
    const item = this.currentRoles.find((value) => {
      return name === value.name;
    });
    return item ? true : false;
  }

}

const TEST_PERMISSIONS = [
  // Blast
  {name: 'gui-blasts', permissions: ['read']},
  {name: 'gui-blast-import', permissions: ['read']},
  {name: 'gui-blast-export', permissions: ['read']},
  {name: 'gui-blast-read', permissions: ['read']},
  {name: 'gui-blast-read-content', permissions: ['read']},
  {name: 'gui-blast-edit', permissions: ['read']},
  {name: 'gui-blast-delete', permissions: ['read']},
  {name: 'gui-blast-acl', permissions: ['read']},
  // Collections
  {name: 'gui-collections', permissions: ['read']},
  {name: 'gui-collection-create', permissions: ['read']},
  {name: 'gui-collection-read', permissions: ['read']},
  {name: 'gui-collection-edit', permissions: ['read']},
  {name: 'gui-collection-delete', permissions: ['read']},
  {name: 'gui-collection-acl', permissions: ['read']},
  // Siscriminant Matrix
  {name: 'gui-cmatrices', permissions: ['read']},
  {name: 'gui-cmatrix-create', permissions: ['read']},
  {name: 'gui-cmatrix-read', permissions: ['read']},
  {name: 'gui-cmatrix-edit', permissions: ['read']},
  {name: 'gui-cmatrix-delete', permissions: ['read']},
  {name: 'gui-cmatrix-acl', permissions: ['read']},
  // Alignments
  {name: 'gui-mas', permissions: ['read']},
  {name: 'gui-ma-import', permissions: ['read']},
  {name: 'gui-ma-export', permissions: ['read']},
  {name: 'gui-ma-read', permissions: ['read']},
  {name: 'gui-ma-read-content', permissions: ['read']},
  {name: 'gui-ma-edit', permissions: ['read']},
  {name: 'gui-ma-delete', permissions: ['read']},
  {name: 'gui-ma-acl', permissions: ['read']},
  // Phylogenetic Trees
  {name: 'gui-pts', permissions: ['read']},
  {name: 'gui-pt-import', permissions: ['read']},
  {name: 'gui-pt-export', permissions: ['read']},
  {name: 'gui-pt-read', permissions: ['read']},
  {name: 'gui-pt-edit', permissions: ['read']},
  {name: 'gui-pt-delete', permissions: ['read']},
  {name: 'gui-pt-acl', permissions: ['read']},
  // Sequences
  {name: 'gui-seqs', permissions: ['read']},
  {name: 'gui-seq-import', permissions: ['read']},
  {name: 'gui-seq-export', permissions: ['read']},
  {name: 'gui-seq-read', permissions: ['read']},
  {name: 'gui-seq-read-content', permissions: ['read']},
  {name: 'gui-seq-edit', permissions: ['read']},
  {name: 'gui-seq-delete', permissions: ['read']},
  {name: 'gui-seq-acl', permissions: ['read']},
  // Supermatrices
  {name: 'gui-smatrices', permissions: ['read']},
  {name: 'gui-smatrix-import', permissions: ['read']},
  {name: 'gui-smatrix-export', permissions: ['read']},
  {name: 'gui-smatrix-create', permissions: ['read']},
  {name: 'gui-smatrix-read', permissions: ['read']},
  {name: 'gui-smatrix-read-content', permissions: ['read']},
  {name: 'gui-smatrix-edit', permissions: ['read']},
  {name: 'gui-smatrix-delete', permissions: ['read']},
  {name: 'gui-smatrix-acl', permissions: ['read']},
  // Layers
  {name: 'gui-layers', permissions: ['read']},
  {name: 'gui-layer-import', permissions: ['read']},
  {name: 'gui-layer-export', permissions: ['read']},
  {name: 'gui-layer-read', permissions: ['read']},
  {name: 'gui-layer-edit', permissions: ['read']},
  {name: 'gui-layer-delete', permissions: ['read']},
  {name: 'gui-layer-acl', permissions: ['read']},
  {name: 'gui-layers-graphical', permissions: ['read']},
  // Jobs
  {name: 'gui-jobs', permissions: ['read']},
  {name: 'gui-jobs-executing', permissions: ['read']},
  {name: 'gui-jobs-finished', permissions: ['read']},
  {name: 'gui-job-create', permissions: ['read']},
  {name: 'gui-job-read', permissions: ['read']},
  {name: 'gui-job-respawn', permissions: ['read']},
  {name: 'gui-job-cancel', permissions: ['read']},
  // GeoViewer
  {name: 'gui-layers-graphical', permissions: ['read']},
  // Sequences Viewer
  {name: 'gui-seqs-graphical', permissions: ['read']},
  // Case studies
  {name: 'gui-case-studies', permissions: ['read']},
  {name: 'gui-case-study-create', permissions: ['read']},
  {name: 'gui-case-study-read', permissions: ['read']},
  {name: 'gui-case-study-delete', permissions: ['read']},
  {name: 'gui-case-study-edit', permissions: ['read']},
  {name: 'gui-case-study-acl', permissions: ['read']},
  // Subjects
  {name: 'gui-subjects', permissions: ['read']},
  {name: 'gui-subject-create', permissions: ['read']},
  {name: 'gui-subject-delete', permissions: ['read']},
  // Sources
  {name: 'gui-sources', permissions: ['read']},
  {name: 'gui-source-create', permissions: ['read']},
  {name: 'gui-source-delete', permissions: ['read']},
  // Crs
  {name: 'gui-crs', permissions: ['read']},
  {name: 'gui-crs-create', permissions: ['read']},
  {name: 'gui-crs-delete', permissions: ['read']},
  {name: 'gui-crs-edit', permissions: ['read']},
  // Analyses
  {name: 'gui-analyses', permissions: ['read']},
  {name: 'gui-analysis-create', permissions: ['read']},
  {name: 'gui-analysis-read', permissions: ['read']},
  {name: 'gui-analysis-edit', permissions: ['read']},
  {name: 'gui-analysis-delete', permissions: ['read']},
  // Ontologies
  {name: 'gui-ontologies', permissions: ['read']},
  {name: 'gui-ontology-import', permissions: ['read']},
  {name: 'gui-ontology-read', permissions: ['read']},
  {name: 'gui-ontology-edit', permissions: ['read']},
  {name: 'gui-ontology-delete', permissions: ['read']},
  // Terms
  {name: 'gui-terms', permissions: ['read']},
  {name: 'gui-term-read', permissions: ['read']},
  // Publications
  {name: 'gui-publications', permissions: ['read']},
  {name: 'gui-publication-create', permissions: ['read']},
  {name: 'gui-publication-read', permissions: ['read']},
  {name: 'gui-publication-edit', permissions: ['read']},
  {name: 'gui-publication-delete', permissions: ['read']},
  // Taxonomies
  {name: 'gui-taxonomies', permissions: ['read']},
  {name: 'gui-taxonomy-import', permissions: ['read']},
  {name: 'gui-taxonomy-read', permissions: ['read']},
  {name: 'gui-taxonomy-edit', permissions: ['read']},
  {name: 'gui-taxonomy-delete', permissions: ['read']},
  // Compute Resources
  {name: 'gui-cresources', permissions: ['read']},
  {name: 'gui-cresource-create', permissions: ['read']},
  {name: 'gui-cresource-read', permissions: ['read']},
  {name: 'gui-cresource-edit', permissions: ['read']},
  {name: 'gui-cresource-delete', permissions: ['read']},
  {name: 'gui-cresource-acl', permissions: ['read']},
  // Algorithms
  {name: 'gui-algorithms', permissions: ['read']},
  {name: 'gui-algorithm-create', permissions: ['read']},
  {name: 'gui-algorithm-read', permissions: ['read']},
  {name: 'gui-algorithm-edit', permissions: ['read']},
  {name: 'gui-algorithm-delete', permissions: ['read']},
  {name: 'gui-algorithm-acl', permissions: ['read']},
  // Users
  {name: 'gui-users', permissions: ['read']},
  {name: 'gui-users-authorize', permissions: ['read']},
  {name: 'gui-user-read', permissions: ['read']},
  {name: 'gui-user-edit', permissions: ['read']},
  {name: 'gui-user-delete', permissions: ['read']},
  // Roles
  {name: 'gui-roles', permissions: ['read']},
  {name: 'gui-role-edit', permissions: ['read']},
  {name: 'gui-role-delete', permissions: ['read']},
  // Organizations
  {name: 'gui-organizations', permissions: ['read']},
  {name: 'gui-organization-read', permissions: ['read']},
  {name: 'gui-organization-edit', permissions: ['read']},
  {name: 'gui-organization-delete', permissions: ['read']},
  {name: 'gui-groups', permissions: ['read']},
  {name: 'gui-authenticators', permissions: ['read']},
  {name: 'gui-permission-types', permissions: ['read']},
  {name: 'gui-system-functions', permissions: ['read']},
  // References ACL
  {name: 'gui-references-acl', permissions: ['read']},
  {name: 'gui-reference-acl-read', permissions: ['read']},
  // System Functions
  {name: 'gui-system-functions', permissions: ['read']},
  {name: 'gui-system-functions', permissions: ['read']},
  // Organisms
  {name: 'gui-organisms', permissions: ['read']},
  {name: 'gui-organism-create', permissions: ['read']},
  {name: 'gui-organism-read', permissions: ['read']},
  {name: 'gui-organism-edit', permissions: ['read']},
  {name: 'gui-organism-delete', permissions: ['read']},
  {name: 'gui-organism-export', permissions: ['read']},
  {name: 'gui-organism-acl', permissions: ['read']},
  // Individuals
  {name: 'gui-individuals', permissions: ['read']},
  {name: 'gui-individual-create', permissions: ['read']},
  {name: 'gui-individual-read', permissions: ['read']},
  {name: 'gui-individual-edit', permissions: ['read']},
  {name: 'gui-individual-delete', permissions: ['read']},
  {name: 'gui-individual-acl', permissions: ['read']},
  // Annotations
  {name: 'gui-annotation-fields', permissions: ['read']},
  {name: 'gui-annotation-field-create', permissions: ['read']},
  {name: 'gui-annotation-field-read', permissions: ['read']},
  {name: 'gui-annotation-field-edit', permissions: ['read']},
  {name: 'gui-annotation-field-delete', permissions: ['read']},
  {name: 'gui-annotation-field-acl', permissions: ['read']},
  {name: 'gui-annotation-templates', permissions: ['read']},
  {name: 'gui-annotation-template-create', permissions: ['read']},
  {name: 'gui-annotation-template-read', permissions: ['read']},
  {name: 'gui-annotation-template-edit', permissions: ['read']},
  {name: 'gui-annotation-template-delete', permissions: ['read']},
  {name: 'gui-annotation-template-acl', permissions: ['read']},
  // Viewer
  {name: 'gui-viewers', permissions: ['read']},
  {name: 'gui-viewer-create', permissions: ['read']},
  {name: 'gui-viewer-delete', permissions: ['read']},
  {name: 'gui-viewer-acl', permissions: ['read']},
  {name: 'gui-status-checkers', permissions: ['read']},
];
