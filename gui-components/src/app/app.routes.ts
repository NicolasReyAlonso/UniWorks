import {Routes} from '@angular/router';
import {ImportResolver} from "./resolvers/import.resolver";
import {SequencesResolver} from "./resolvers/sequences.resolver";
import {AnalysesResolver} from "./resolvers/analyses.resolver";

//LIB GUARDS
import {CheckLoginGuard} from "ngt-gui/core";
import {CanEnterPage} from "ngt-gui/core";

// Dynamic page support
import {DynamicPageResolver} from "ngt-gui/gui";

export const routes: Routes = [
  {
    path: '',
    canActivate: [CheckLoginGuard],
    canActivateChild: [CanEnterPage],
    children: [
      {
        path: 'sequencesBrowse',
        loadComponent: () => import('src/app/pages/molecular-data/sequence/sequences-browse/sequences-browse.component').then(mod => mod.SequencesBrowseComponent),
      },
      {
        path: 'sequencesImport',
        loadComponent: () => import('src/app/pages/molecular-data/sequence/sequences-import/sequences-import.component').then(mod => mod.SequencesImportComponent),
        resolve: {
          data: ImportResolver,
        }
      },
      {
        path: 'sequenceDetail/:id',
        loadComponent: () => import('src/app/pages/molecular-data/sequence/sequence-detail/sequence-detail.component').then(mod => mod.SequenceDetailComponent),
        resolve: {
          sequence: SequencesResolver,
        }
      },
      {
        path: 'sequenceDetail',
        loadComponent: () => import('src/app/pages/molecular-data/sequence/sequence-detail/sequence-detail.component').then(mod => mod.SequenceDetailComponent),
        resolve: {
          sequence: SequencesResolver,
        }
      },
      {
        path: 'alignmentsBrowse',
        loadComponent: () => import('src/app/pages/molecular-data/alignments/aligment-browse/aligment-browse.component').then(mod => mod.AlignmentBrowseComponent),
      },
      {
        path: 'alignmentsImport',
        loadComponent: () => import('src/app/pages/molecular-data/alignments/alignments-import/alignments-import.component').then(mod => mod.AlignmentsImportComponent),
        resolve: {
          data: ImportResolver,
        }
      },
      {
        path: 'alignmentDetail/:id',
        loadComponent: () => import('src/app/pages/molecular-data/alignments/alignment-detail/alignment-detail.component').then(mod => mod.AlignmentDetailComponent),
        resolve: {
          analysis: AnalysesResolver,
        },
      },
      {
        path: 'alignmentNextgendemMissingEditor/:id',
        loadComponent: () => import('src/app/pages/molecular-data/alignments/alignment-nextgendem-missing-editor/alignment-nextgendem-missing-editor.component').then(mod => mod.AligmentNextgendemMissingEditorComponent),
      },
      {
        path: 'alignmentNextgendemMissingEditor',
        loadComponent: () => import('src/app/pages/molecular-data/alignments/alignment-nextgendem-missing-editor/alignment-nextgendem-missing-editor.component').then(mod => mod.AligmentNextgendemMissingEditorComponent),
      },
      {
        path: 'nextgendemMsaBrowser',
        loadComponent: () => import('src/app/pages/nextgendem-msa/nextgendem-msa-page/nextgendem-msa-page.component').then(mod => mod.NextgendemMsaPageComponent),
      },
        {
        path: 'testpage',
        loadComponent: () => import('src/app/pages/testpage/testpage.component').then(mod => mod.TestpageComponent),
      },
      {
        path: 'api-contract-pilot',
        loadComponent: () => import('src/app/pages/api-contract-pilot/api-contract-pilot.component').then(mod => mod.ApiContractPilotComponent),
      },
      {
        // Demo "Plantas en el mapa" — app de ejemplo sobre el framework.
        path: 'plantsMap',
        loadComponent: () => import('src/app/pages/plants/plants-map.component').then(mod => mod.PlantsMapComponent),
      },

      // ── Dynamic pages (backend-driven) ──────────────────────────
      {
        path: 'd/:screenName',
        loadComponent: () => import('ngt-gui/gui').then(mod => mod.DynamicPageComponent),
        resolve: { screenDefinition: DynamicPageResolver },
      },
      {
        path: 'd/:screenName/:id',
        loadComponent: () => import('ngt-gui/gui').then(mod => mod.DynamicPageComponent),
        resolve: { screenDefinition: DynamicPageResolver },
      },
    ],
  },
  {
    path: 'home',
    loadComponent: () => import('src/app/pages/home/home.component').then(mod => mod.HomeComponent),
  },
];
