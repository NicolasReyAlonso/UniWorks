import {Injectable} from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import {Observable} from 'rxjs';
import {AuthService} from "ngt-gui/core";

@Injectable({
    providedIn: 'root'
})
export class CanEnterPage  {

    constructor(
        private authService: AuthService,
        private router: Router,
    ) {
    }

    canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (!route.url[0]) {
            this.router.navigate(['home']);
            return false;
        }
        const path = route.url[0].path;

        // ── Dynamic pages: routes starting with 'd' ──────────
        if (path === 'd') {
            const screenName = route.params?.['screenName'] ?? route.url?.[1]?.path;
            if (screenName) {
                console.log(`✅ Dynamic page "${screenName}" – acceso permitido`);
                return true;
            }
        }

        let canEnter = true;
        switch (path) {
            // Sequences
            case 'sequencesBrowse':
                if (!this.authService.havePermission('gui-seqs')) {
                    console.log('No permission gui-seqs');
                    canEnter = false;
                }
                break;
            case 'sequenceDetail':
                if (!this.authService.havePermission('gui-seq-read')) {
                    canEnter = false;
                }
                break;
            case 'sequencesImport':
                if (!this.authService.havePermission('gui-seq-import')) {
                    canEnter = false;
                }
                break;
            // Multiple Alignments
            case 'alignmentsBrowse':
                if (!this.authService.havePermission('gui-mas')) {
                    canEnter = false;
                }
                break;
            case 'alignmentDetail':
                if (!this.authService.havePermission('gui-ma-read')) {
                    canEnter = false;
                }
                break;
            case 'alignmentsImport':
                if (!this.authService.havePermission('gui-ma-import')) {
                    canEnter = false;
                }
                break;
            // Phylotrees
            case 'phylotreesBrowse':
                if (!this.authService.havePermission('gui-pts')) {
                    canEnter = false;
                }
                break;
            case 'phylotreesImport':
                if (!this.authService.havePermission('gui-pt-import')) {
                    canEnter = false;
                }
                break;
            case 'phylotreeDetail':
                if (!this.authService.havePermission('gui-pt-read')) {
                    canEnter = false;
                }
                break;
            case 'discriminantMatricesBrowse':
                if (!this.authService.havePermission('gui-cmatrices')) {
                    canEnter = false;
                }
                break;
            case 'blastBrowse':
                if (!this.authService.havePermission('gui-blasts')) {
                    canEnter = false;
                }
                break;
            case 'supermatricesBrowse':
                if (!this.authService.havePermission('gui-smatrices')) {
                    canEnter = false;
                }
                break;
            case 'collectionsBrowse':
                if (!this.authService.havePermission('gui-collections')) {
                    canEnter = false;
                }
                break;
            // Layers
            case 'geolayersBrowse':
                if (!this.authService.havePermission('gui-layers')) {
                    canEnter = false;
                }
                break;
            case 'geolayerDetail':
                if (!this.authService.havePermission('gui-layer-read')) {
                    canEnter = false;
                }
                break;
            case 'geolayerImport':
                if (!this.authService.havePermission('gui-layer-import')) {
                    canEnter = false;
                }
                break;
            // Case studies
            case 'caseStudiesBrowse':
                if (!this.authService.havePermission('gui-case-studies')) {
                    canEnter = false;
                }
                break;
            case 'caseStudiesDetail':
                if (!this.authService.havePermission('gui-case-study-read')) {
                    canEnter = false;
                }
                break;
            // Processes
            case 'processSetup':
                if (!this.authService.havePermission('gui-job-create')) {
                    canEnter = false;
                }
                break;
            case 'processesBrowseTodDo':
                if (!(route.queryParams && route.queryParams["status"] && (route.queryParams["status"] == "todo" || route.queryParams["status"] == "done"))) {
                    canEnter = false;
                    break;
                }
                if (!this.authService.havePermission('gui-jobs-executing') && route.queryParams["status"] == "todo") {
                    canEnter = false;
                    break;
                }
                if (!this.authService.havePermission('gui-jobs-finished') && route.queryParams["status"] == "done") {
                    canEnter = false;
                    break;
                }
                break;
            case 'processesBrowseDone':
                if (!(route.queryParams && route.queryParams["status"] && (route.queryParams["status"] == "todo" || route.queryParams["status"] == "done"))) {
                    canEnter = false;
                    break;
                }
                if (!this.authService.havePermission('gui-jobs-executing') && route.queryParams["status"] == "todo") {
                    canEnter = false;
                    break;
                }
                if (!this.authService.havePermission('gui-jobs-finished') && route.queryParams["status"] == "done") {
                    canEnter = false;
                    break;
                }
                break;
            case 'processDetail': {
                if (!this.authService.havePermission('gui-job-read')) {
                    canEnter = false;
                }
                break;
            }
            case 'processTypesBrowse': {
                if (!this.authService.havePermission('gui-process-types')) {
                    canEnter = false;
                }
                break;
            }
            case 'processTypeDetail': {
                if (!this.authService.havePermission('gui-process-type-read')) {
                    canEnter = false;
                }
                break;
            }
            // JBrowse
            case 'jbrowseBrowse':
                if (!this.authService.havePermission('gui-seqs-graphical')) {
                    canEnter = false;
                }
                break;
            // Geoviewer
            case 'phylogeographyBrowse':
                if (!this.authService.havePermission('gui-layers-graphical')) {
                    canEnter = false;
                }
                break;
            // Ontologies
            case 'ontologiesBrowse':
                if (!this.authService.havePermission('gui-ontologies')) {
                    canEnter = false;
                }
                break;
            case 'ontologiesImport':
                if (!this.authService.havePermission('gui-ontology-import')) {
                    canEnter = false;
                }
                break;
            case 'ontologyDetail':
                if (!this.authService.havePermission('gui-ontology-read')) {
                    canEnter = false;
                }
                break;
            // Taxonomies
            case 'taxonomiesBrowse':
                if (!this.authService.havePermission('gui-taxonomies')) {
                    canEnter = false;
                }
                break;
            case 'organismsBrowse':
                if (!this.authService.havePermission('gui-organisms')) {
                    canEnter = false;
                }
                break;
            case 'individuals':
                if (!this.authService.havePermission('gui-individuals')) {
                    canEnter = false;
                }
                break;
            // Analyses
            case 'analysesBrowse':
                if (!this.authService.havePermission('gui-analyses')) {
                    canEnter = false;
                }
                break;
            case 'analysisDetail':
                if (!this.authService.havePermission('gui-analysis-read')) {
                    canEnter = false;
                }
                break;
            case 'publicationsBrowse':
                if (!this.authService.havePermission('gui-publications')) {
                    canEnter = false;
                }
                break;
            case 'themesBrowse':
                if (!this.authService.havePermission('gui-subjects')) {
                    canEnter = false;
                }
                break;
            case 'sourcesBrowse':
                if (!this.authService.havePermission('gui-sources')) {
                    canEnter = false;
                }
                break;
            case 'crsBrowse':
                if (!this.authService.havePermission('gui-crs')) {
                    canEnter = false;
                }
                break;
            // Annotations
            case 'annotationsFieldsBrowse':
                if (!this.authService.havePermission('gui-annotation-fields')) {
                    canEnter = false;
                }
                break;
            case 'annotationsFieldDetail':
                if (!this.authService.havePermission('gui-annotation-field-read')) {
                    canEnter = false;
                }
                break;
            case 'annotationsTemplatesBrowse':
                if (!this.authService.havePermission('gui-annotation-templates')) {
                    canEnter = false;
                }
                break;
            case 'annotationsTemplateDetail':
                if (!this.authService.havePermission('gui-annotation-template-read')) {
                    canEnter = false;
                }
                break;
            case 'processesBrowse':
                if (!this.authService.havePermission('gui-jobs')) {
                    canEnter = false;
                }
                break;
            case 'computeResourcesBrowse':
                if (!this.authService.havePermission('gui-cresources')) {
                    canEnter = false;
                }
                break;
            case 'computeResourcesDetail':
                if (!this.authService.havePermission('gui-cresource-read')) {
                    canEnter = false;
                }
                break;
            // Identities
            case 'identitiesBrowse':
                if (!this.authService.havePermission('gui-users')) {
                    canEnter = false;
                }
                break;
            case 'identityDetail':
                if (!this.authService.havePermission('gui-user-read')) {
                    canEnter = false;
                }
                break;
            case 'identityModify':
                if (!this.authService.havePermission('gui-user-edit')) {
                    canEnter = false;
                }
                break;
            // Organization
            case 'organizationsBrowse':
                if (!this.authService.havePermission('gui-organizations')) {
                    canEnter = false;
                }
                break;
            case 'organizationDetail':
                if (!this.authService.havePermission('gui-organization-read')) {
                    canEnter = false;
                }
                break;
            case 'organizationModify':
                if (!this.authService.havePermission('gui-organization-edit')) {
                    canEnter = false;
                }
                break;
            // Roles
            case 'rolesBrowse':
                if (!this.authService.havePermission('gui-roles')) {
                    canEnter = false;
                }
                break;
            case 'roleDetail':
                if (!this.authService.havePermission('gui-role-edit')) {
                    canEnter = false;
                }
                break;
            case 'roleModify':
                if (!this.authService.havePermission('gui-role-edit')) {
                    canEnter = false;
                }
                break;
        }
        if (!canEnter) {
            this.router.navigate(['home']);
            return false;
        }
        return true;
    }
}
