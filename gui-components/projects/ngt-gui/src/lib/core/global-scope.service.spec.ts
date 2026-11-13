import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GLOBAL_SERVICE } from '../tokens/global.token';
import { STATE_SERVICE } from '../tokens/state.token';
import { GlobalService } from './global.service';
import { GlobalScopeService } from './global-scope.service';
import { GlobalScopeDefinition } from '../interfaces/scope/global-scope.interface';

const ZONE: GlobalScopeDefinition = {
  name: 'zone', entity: 'zones', endpoint: '/zones', label: 'Zona',
  value_field: 'id', label_field: 'name', state_key: null,
  targets: [{ entity: 'plants', endpoint: '/plants', field: 'zone_id', kind: 'fk' }],
};
const CASE_STUDY: GlobalScopeDefinition = {
  name: 'case_study', entity: 'case_studies', endpoint: '/case_studies', label: 'Caso',
  value_field: 'id', label_field: 'name', state_key: 'gbl_cs',
  targets: [{ entity: 'functional_objects', endpoint: '/functional_objects', field: 'case_study_id', kind: 'membership' }],
};
const PROJECT: GlobalScopeDefinition = {
  name: 'project', entity: 'projects', endpoint: '/projects', label: 'Proyecto',
  value_field: 'id', label_field: 'name', state_key: null,
  targets: [{ entity: 'plants', endpoint: '/plants', field: 'project_id', kind: 'fk' }],
};

describe('GlobalScopeService', () => {
  let service: GlobalScopeService;
  let http: HttpTestingController;
  let legacy: { states: Record<string, unknown>; getState: jasmine.Spy; setState: jasmine.Spy };

  const globalStub = {
    authOptions: { withCredentials: true },
    getParameter: (key: string) => ({ host: 'http://backend', api_prefix: '/api' } as Record<string, string>)[key],
  };

  async function load(declared: GlobalScopeDefinition[]): Promise<void> {
    const loading = service.load();
    http.expectOne('http://backend/api/gui/scopes').flush({ content: declared, count: declared.length, issues: [] });
    await loading;
  }

  beforeEach(() => {
    localStorage.removeItem('ngt-global-scopes');
    legacy = { states: {}, getState: jasmine.createSpy('getState'), setState: jasmine.createSpy('setState') };
    legacy.getState.and.callFake((key: string) => legacy.states[key]);
    legacy.setState.and.callFake((key: string, value: unknown) => { legacy.states[key] = value; });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: GLOBAL_SERVICE, useValue: globalStub },
        { provide: GlobalService, useValue: globalStub },
        { provide: STATE_SERVICE, useValue: legacy },
      ],
    });
    service = TestBed.inject(GlobalScopeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('ngt-global-scopes');
  });

  it('runs unscoped when the backend declares nothing', async () => {
    await load([]);

    expect(service.scopes()).toEqual([]);
    expect(service.filterFor('/plants')).toEqual({});
    expect(service.defaultsFor('/plants')).toEqual({});
  });

  it('runs unscoped when the scopes endpoint is not available', async () => {
    const loading = service.load();
    http.expectOne('http://backend/api/gui/scopes').flush('nope', { status: 404, statusText: 'Not Found' });
    await loading;

    expect(service.scopes()).toEqual([]);
  });

  it('narrows only the entities a scope targets', async () => {
    await load([ZONE]);
    service.select('zone', { id: 3, label: 'Tafira' });

    expect(service.filterFor('/plants')).toEqual({ zone_id: 3 });
    expect(service.filterFor('/roles')).toEqual({});
    expect(service.appliedTo('/plants').map(a => a.option.label)).toEqual(['Tafira']);
  });

  it('recognises the same entity however its path is written', async () => {
    await load([ZONE]);
    service.select('zone', { id: 3, label: 'Tafira' });

    for (const path of ['/api/plants', '/api/plants/', 'plants', 'http://backend/api/plants/', '/plants?x=1']) {
      expect(service.filterFor(path)).withContext(path).toEqual({ zone_id: 3 });
    }
    // ...without confusing an entity that merely shares the prefix.
    expect(service.filterFor('/plants_archive')).toEqual({});
  });

  it('combines several active scopes on the same entity', async () => {
    await load([ZONE, PROJECT]);
    service.select('zone', { id: 3, label: 'Tafira' });
    service.select('project', { id: 9, label: 'Reforestación' });

    expect(service.filterFor('/plants')).toEqual({ zone_id: 3, project_id: 9 });
  });

  it('pre-fills new records from foreign-key scopes but not from memberships', async () => {
    await load([ZONE, CASE_STUDY]);
    service.select('zone', { id: 3, label: 'Tafira' });
    service.select('case_study', { id: 7, label: 'Laurisilva' });

    expect(service.defaultsFor('/plants')).toEqual({ zone_id: 3 });
    expect(service.filterFor('/functional_objects')).toEqual({ case_study_id: 7 });
    expect(service.defaultsFor('/functional_objects')).toEqual({});
  });

  it('clears a scope and tells listeners every time the selection changes', async () => {
    await load([ZONE]);
    let notifications = 0;
    service.changes$.subscribe(() => notifications++);

    service.select('zone', { id: 3, label: 'Tafira' });
    service.select('zone', { id: 3, label: 'Tafira' }); // same value: no noise
    service.select('zone', null);

    expect(notifications).toBe(2);
    expect(service.filterFor('/plants')).toEqual({});
  });

  it('ignores a scope the backend did not declare', async () => {
    await load([ZONE]);
    service.select('planet', { id: 1, label: 'Mars' });

    expect(service.selection()).toEqual({});
  });

  it('remembers the selection across sessions', async () => {
    await load([ZONE]);
    service.select('zone', { id: 3, label: 'Tafira' });
    expect(JSON.parse(localStorage.getItem('ngt-global-scopes')!)).toEqual({ zone: { id: 3, label: 'Tafira' } });

    // A new session starts from what the browser remembers.
    service.selection.set({});
    await load([ZONE]);
    expect(service.selected('zone')).toEqual({ id: 3, label: 'Tafira' });
  });

  it('forgets a remembered scope the backend no longer declares', async () => {
    localStorage.setItem('ngt-global-scopes', JSON.stringify({ zone: { id: 3, label: 'Tafira' }, gone: { id: 1, label: 'x' } }));
    await load([ZONE]);

    expect(Object.keys(service.selection())).toEqual(['zone']);
  });

  it('lists the selectable records and drops a selection that no longer exists', async () => {
    await load([ZONE]);
    service.select('zone', { id: 99, label: 'Zona borrada' });

    let options: unknown;
    service.options(ZONE).subscribe(o => (options = o));
    http.expectOne('http://backend/api/zones/').flush({ content: [{ id: 3, name: 'Tafira' }, { id: 4, name: 'Sur' }] });

    expect(options).toEqual([{ id: 3, label: 'Tafira' }, { id: 4, label: 'Sur' }]);
    expect(service.selected('zone')).toBeNull();
  });

  it('refreshes the label of the selected record', async () => {
    await load([ZONE]);
    service.select('zone', { id: 3, label: 'Nombre antiguo' });

    service.options(ZONE).subscribe();
    http.expectOne('http://backend/api/zones/').flush({ content: [{ id: 3, name: 'Tafira' }] });

    expect(service.selected('zone')).toEqual({ id: 3, label: 'Tafira' });
  });

  it('mirrors a scope with a legacy state key into the global state', async () => {
    await load([CASE_STUDY]);

    service.select('case_study', { id: 7, label: 'Laurisilva' });
    expect(legacy.setState).toHaveBeenCalledWith('gbl_cs', 7);

    service.select('case_study', null);
    expect(legacy.setState).toHaveBeenCalledWith('gbl_cs', null);
  });

  it('adopts a selection that only exists in the legacy state', async () => {
    legacy.states['gbl_cs'] = 7;
    await load([CASE_STUDY]);

    expect(service.filterFor('/functional_objects')).toEqual({ case_study_id: 7 });
    expect(legacy.setState).not.toHaveBeenCalled();
  });

  it('forgets the declared scopes on reset but keeps what the user chose', async () => {
    await load([ZONE]);
    service.select('zone', { id: 3, label: 'Tafira' });

    service.reset();
    expect(service.filterFor('/plants')).toEqual({});

    await load([ZONE]);
    expect(service.filterFor('/plants')).toEqual({ zone_id: 3 });
  });
});
