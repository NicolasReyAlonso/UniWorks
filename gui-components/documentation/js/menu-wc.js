'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">bcs-gui documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="overview.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                            <li class="link">
                                <a href="index.html" data-type="chapter-link">
                                    <span class="icon ion-ios-paper"></span>
                                        README
                                </a>
                            </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/FormlyComponentsModule.html" data-type="entity-link" >FormlyComponentsModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-FormlyComponentsModule-820bbd516905e59b7e8f3fd421b66f4fc3f9bf40bcacbcfdef6fda49a5aa08a2a3670d1363cfa7797db92e339f085b10bb6b261ef60dc575f4026e8a5fa2eabf"' : 'data-bs-target="#xs-components-links-module-FormlyComponentsModule-820bbd516905e59b7e8f3fd421b66f4fc3f9bf40bcacbcfdef6fda49a5aa08a2a3670d1363cfa7797db92e339f085b10bb6b261ef60dc575f4026e8a5fa2eabf"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-FormlyComponentsModule-820bbd516905e59b7e8f3fd421b66f4fc3f9bf40bcacbcfdef6fda49a5aa08a2a3670d1363cfa7797db92e339f085b10bb6b261ef60dc575f4026e8a5fa2eabf"' :
                                            'id="xs-components-links-module-FormlyComponentsModule-820bbd516905e59b7e8f3fd421b66f4fc3f9bf40bcacbcfdef6fda49a5aa08a2a3670d1363cfa7797db92e339f085b10bb6b261ef60dc575f4026e8a5fa2eabf"' }>
                                            <li class="link">
                                                <a href="components/AdvancedParametersWrapperComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AdvancedParametersWrapperComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AlignmentSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AlignmentSelectorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AnnotationTextFieldComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnnotationTextFieldComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AnnotationTextFieldReadComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnnotationTextFieldReadComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AnnotationTextOptionsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnnotationTextOptionsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/AnnotationTextOptionsReadComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnnotationTextOptionsReadComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/CollectionsBrowseComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >CollectionsBrowseComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/DataWrapperComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DataWrapperComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/DynamicBrowseComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >DynamicBrowseComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/FileAdditionSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >FileAdditionSelectorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/GeolayerSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GeolayerSelectorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/InfoModalComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >InfoModalComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/InputFormlyComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >InputFormlyComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/InputRangeFormlyComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >InputRangeFormlyComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/LabelComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >LabelComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MonophylyComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MonophylyComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/MultipleSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MultipleSelectorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/PhylotreeSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PhylotreeSelectorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SelectComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SelectComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SelectLazyLoadingComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SelectLazyLoadingComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SelectLazyLoadingFormlyComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SelectLazyLoadingFormlyComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SequenceSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SequenceSelectorComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SubprocessWrapperComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SubprocessWrapperComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/SuperMatrixBrowseComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SuperMatrixBrowseComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/TaxsetComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TaxsetComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/TaxsetFieldComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >TaxsetFieldComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/Upload2filesAPIComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Upload2filesAPIComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/WoodedSelectorComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WoodedSelectorComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/NextgendemGeolayerModule.html" data-type="entity-link" >NextgendemGeolayerModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#components-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' : 'data-bs-target="#xs-components-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' }>
                                            <span class="icon ion-md-cog"></span>
                                            <span>Components</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="components-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' :
                                            'id="xs-components-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' }>
                                            <li class="link">
                                                <a href="components/GeolayerExportModalComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GeolayerExportModalComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/JqueryQuerybuilderComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >JqueryQuerybuilderComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerAddAttributeModalComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerAddAttributeModalComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerConfigurationPanelComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerConfigurationPanelComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerConfigurationPanelWindowComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerConfigurationPanelWindowComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerCreateMapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerCreateMapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerEditStyleModalComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerEditStyleModalComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerMapComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerMapComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerMapSettingsComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerMapSettingsComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerModalCqlGenerateByFilterComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerModalCqlGenerateByFilterComponent</a>
                                            </li>
                                            <li class="link">
                                                <a href="components/NextgendemGeolayerTopAreaComponent.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >NextgendemGeolayerTopAreaComponent</a>
                                            </li>
                                        </ul>
                                    </li>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#pipes-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' : 'data-bs-target="#xs-pipes-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' }>
                                            <span class="icon ion-md-add"></span>
                                            <span>Pipes</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="pipes-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' :
                                            'id="xs-pipes-links-module-NextgendemGeolayerModule-c7a19e860c8aae9720ce4919ff690b00a1672146c7d12c61835abf445118219a3b2f7dd5d7568eafc6348201d66ee04550bb156eb36ec87ce24c30619beacd17"' }>
                                            <li class="link">
                                                <a href="pipes/KeyValueCustomPipe.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >KeyValueCustomPipe</a>
                                            </li>
                                        </ul>
                                    </li>
                            </li>
                            <li class="link">
                                <a href="modules/SharedModule.html" data-type="entity-link" >SharedModule</a>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#components-links"' :
                            'data-bs-target="#xs-components-links"' }>
                            <span class="icon ion-md-cog"></span>
                            <span>Components</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="components-links"' : 'id="xs-components-links"' }>
                            <li class="link">
                                <a href="components/AclModalComponent.html" data-type="entity-link" >AclModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AclRulesModalComponent.html" data-type="entity-link" >AclRulesModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AligmentNextgendemMissingEditorComponent.html" data-type="entity-link" >AligmentNextgendemMissingEditorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AlignmentBrowseComponent.html" data-type="entity-link" >AlignmentBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AlignmentDetailComponent.html" data-type="entity-link" >AlignmentDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AlignmentsImportComponent.html" data-type="entity-link" >AlignmentsImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AnalysesBrowseComponent.html" data-type="entity-link" >AnalysesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AnalysisDetailComponent.html" data-type="entity-link" >AnalysisDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AnnotationsFormComponent.html" data-type="entity-link" >AnnotationsFormComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AnonymousSvgComponent.html" data-type="entity-link" >AnonymousSvgComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/AppComponent.html" data-type="entity-link" >AppComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ArchaeopteryxBrowserComponent.html" data-type="entity-link" >ArchaeopteryxBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ArchaeopteryxPageComponent.html" data-type="entity-link" >ArchaeopteryxPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BackButtonComponent.html" data-type="entity-link" >BackButtonComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BasiclayoutComponent.html" data-type="entity-link" >BasiclayoutComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BlasterjsComponent.html" data-type="entity-link" >BlasterjsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BlasterjsPageComponent.html" data-type="entity-link" >BlasterjsPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BlastResultsBrowseComponent.html" data-type="entity-link" >BlastResultsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BlastResultsBrowseComponent-1.html" data-type="entity-link" >BlastResultsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/BOCardComponent.html" data-type="entity-link" >BOCardComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CaseStudiesAddItemsModalComponent.html" data-type="entity-link" >CaseStudiesAddItemsModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CaseStudiesBrowseComponent.html" data-type="entity-link" >CaseStudiesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CaseStudiesDetailComponent.html" data-type="entity-link" >CaseStudiesDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CaseStudiesModalCreateComponent.html" data-type="entity-link" >CaseStudiesModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CollectionsAddItemsModalComponent.html" data-type="entity-link" >CollectionsAddItemsModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CollectionsBrowseComponent.html" data-type="entity-link" >CollectionsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CollectionsDetailComponent.html" data-type="entity-link" >CollectionsDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CollectionsModalCreateComponent.html" data-type="entity-link" >CollectionsModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ComputeResourcesBrowseComponent.html" data-type="entity-link" >ComputeResourcesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ComputeResourcesDetailComponent.html" data-type="entity-link" >ComputeResourcesDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ComputeResourcesModalCreateComponent.html" data-type="entity-link" >ComputeResourcesModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ContainerizationImagesBrowserComponent.html" data-type="entity-link" >ContainerizationImagesBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ContainerizationImagesDetailComponent.html" data-type="entity-link" >ContainerizationImagesDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ContainerizationImagesDetailGeneralTabComponent.html" data-type="entity-link" >ContainerizationImagesDetailGeneralTabComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ContainerizationImagesModalCreateComponent.html" data-type="entity-link" >ContainerizationImagesModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CrsBrowseComponent.html" data-type="entity-link" >CrsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CrsCreateModalComponent.html" data-type="entity-link" >CrsCreateModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/CrsDetailComponent.html" data-type="entity-link" >CrsDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DiscriminantMatrixBrowseComponent.html" data-type="entity-link" >DiscriminantMatrixBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DiscriminantMatrixDetailComponent.html" data-type="entity-link" >DiscriminantMatrixDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicAnalysesImportComponent.html" data-type="entity-link" >DynamicAnalysesImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicAnalysisDetailComponent.html" data-type="entity-link" >DynamicAnalysisDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicBrowseComponent.html" data-type="entity-link" >DynamicBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicEntitiesTableComponent.html" data-type="entity-link" >DynamicEntitiesTableComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicInputModalComponent.html" data-type="entity-link" >DynamicInputModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicTableComponent.html" data-type="entity-link" >DynamicTableComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/DynamicTableObjectsComponent.html" data-type="entity-link" >DynamicTableObjectsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FieldDetailComponent.html" data-type="entity-link" >FieldDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FieldModalCreateComponent.html" data-type="entity-link" >FieldModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FieldsBrowseComponent.html" data-type="entity-link" >FieldsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/FilterDetailComponent.html" data-type="entity-link" >FilterDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GenerateLayerViewerModalComponent.html" data-type="entity-link" >GenerateLayerViewerModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GeolayerBrowseComponent.html" data-type="entity-link" >GeolayerBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GeolayerDetailComponent.html" data-type="entity-link" >GeolayerDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GeolayerExportModalComponent.html" data-type="entity-link" >GeolayerExportModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GeolayerImportComponent.html" data-type="entity-link" >GeolayerImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GeolayersViewerComponent.html" data-type="entity-link" >GeolayersViewerComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GeopropertyEditModalComponent.html" data-type="entity-link" >GeopropertyEditModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/GoogleSvgComponent.html" data-type="entity-link" >GoogleSvgComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/HomeComponent.html" data-type="entity-link" >HomeComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IdentitiesBrowserComponent.html" data-type="entity-link" >IdentitiesBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IdentityDetailsComponent.html" data-type="entity-link" >IdentityDetailsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IdentityFormComponent.html" data-type="entity-link" >IdentityFormComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IdentityModifyComponent.html" data-type="entity-link" >IdentityModifyComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IndividualBrowseComponent.html" data-type="entity-link" >IndividualBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IndividualDetailComponent.html" data-type="entity-link" >IndividualDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/IndividualsModalCreateComponent.html" data-type="entity-link" >IndividualsModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/InfoModalComponent.html" data-type="entity-link" >InfoModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/JqueryQuerybuilderComponent.html" data-type="entity-link" >JqueryQuerybuilderComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/LoginComponent.html" data-type="entity-link" >LoginComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MessageGridComponent.html" data-type="entity-link" >MessageGridComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModalInfoComponent.html" data-type="entity-link" >ModalInfoComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ModalsComponent.html" data-type="entity-link" >ModalsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/MsaBrowserComponent.html" data-type="entity-link" >MsaBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NextgendemMissingEditorComponent.html" data-type="entity-link" >NextgendemMissingEditorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NextgendemMsaBrowserComponent.html" data-type="entity-link" >NextgendemMsaBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NextgendemMsaPageComponent.html" data-type="entity-link" >NextgendemMsaPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NexusTreeSelectorComponent.html" data-type="entity-link" >NexusTreeSelectorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NgdBarcodingComponent.html" data-type="entity-link" >NgdBarcodingComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/NgdBarcodingPageComponent.html" data-type="entity-link" >NgdBarcodingPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OntologiesBrowseComponent.html" data-type="entity-link" >OntologiesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OntologiesImportComponent.html" data-type="entity-link" >OntologiesImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OntologyDetailComponent.html" data-type="entity-link" >OntologyDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrganismDetailComponent.html" data-type="entity-link" >OrganismDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrganismsBrowseComponent.html" data-type="entity-link" >OrganismsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrganizationDetailsComponent.html" data-type="entity-link" >OrganizationDetailsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrganizationFormComponent.html" data-type="entity-link" >OrganizationFormComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrganizationModifyComponent.html" data-type="entity-link" >OrganizationModifyComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/OrganizationsBrowserComponent.html" data-type="entity-link" >OrganizationsBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PhylotreeDetailComponent.html" data-type="entity-link" >PhylotreeDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PhylotreesBrowseComponent.html" data-type="entity-link" >PhylotreesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PhylotreesImportComponent.html" data-type="entity-link" >PhylotreesImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/PreferencesModalComponent.html" data-type="entity-link" >PreferencesModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessDetailComponent.html" data-type="entity-link" >ProcessDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesBrowseComponent.html" data-type="entity-link" >ProcessesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesBrowserComponent.html" data-type="entity-link" >ProcessesTypesBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesDetailAnnotationsTabComponent.html" data-type="entity-link" >ProcessesTypesDetailAnnotationsTabComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesDetailComponent.html" data-type="entity-link" >ProcessesTypesDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesDetailGeneralTabComponent.html" data-type="entity-link" >ProcessesTypesDetailGeneralTabComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesDetailSchemaInputTabComponent.html" data-type="entity-link" >ProcessesTypesDetailSchemaInputTabComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesDetailSchemaOutputTabComponent.html" data-type="entity-link" >ProcessesTypesDetailSchemaOutputTabComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesDetailSourceCodeTabComponent.html" data-type="entity-link" >ProcessesTypesDetailSourceCodeTabComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessesTypesModalCreateComponent.html" data-type="entity-link" >ProcessesTypesModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessLogComponent.html" data-type="entity-link" >ProcessLogComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ProcessSetupComponent.html" data-type="entity-link" >ProcessSetupComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ReferencesAclBrowseComponent.html" data-type="entity-link" >ReferencesAclBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RegistrationComponent.html" data-type="entity-link" >RegistrationComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RoleDetailsComponent.html" data-type="entity-link" >RoleDetailsComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RoleFormComponent.html" data-type="entity-link" >RoleFormComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RoleModifyComponent.html" data-type="entity-link" >RoleModifyComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/RolesBrowserComponent.html" data-type="entity-link" >RolesBrowserComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SelectLazyLoadingComponent.html" data-type="entity-link" >SelectLazyLoadingComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SequenceDetailComponent.html" data-type="entity-link" >SequenceDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SequencesBrowseComponent.html" data-type="entity-link" >SequencesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SequencesImportComponent.html" data-type="entity-link" >SequencesImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SidebarComponent.html" data-type="entity-link" >SidebarComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SourceCreateModalComponent.html" data-type="entity-link" >SourceCreateModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SourcesBrowseComponent.html" data-type="entity-link" >SourcesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/StatusCheckersDetailComponent.html" data-type="entity-link" >StatusCheckersDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SuperMatrixBrowseComponent.html" data-type="entity-link" >SuperMatrixBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SuperMatrixDetailComponent.html" data-type="entity-link" >SuperMatrixDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SuperMatrixImportComponent.html" data-type="entity-link" >SuperMatrixImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SuperMatrixNextgendemMissingEditorComponent.html" data-type="entity-link" >SuperMatrixNextgendemMissingEditorComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/SystemFunctionsBrowseComponent.html" data-type="entity-link" >SystemFunctionsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TabLayoutComponent.html" data-type="entity-link" >TabLayoutComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TaxonomiesBrowseComponent.html" data-type="entity-link" >TaxonomiesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TaxonomiesImportComponent.html" data-type="entity-link" >TaxonomiesImportComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TaxonomyDetailComponent.html" data-type="entity-link" >TaxonomyDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TaxsetComponent.html" data-type="entity-link" >TaxsetComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TemplateDetailComponent.html" data-type="entity-link" >TemplateDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TemplateModalCreateComponent.html" data-type="entity-link" >TemplateModalCreateComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TemplatesBrowseComponent.html" data-type="entity-link" >TemplatesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TermDetailComponent.html" data-type="entity-link" >TermDetailComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TermsBrowseComponent.html" data-type="entity-link" >TermsBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TestPageComponent.html" data-type="entity-link" >TestPageComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ThemeCreateModalComponent.html" data-type="entity-link" >ThemeCreateModalComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ThemesBrowseComponent.html" data-type="entity-link" >ThemesBrowseComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/TopAreaComponent.html" data-type="entity-link" >TopAreaComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/Upload2filesAPIComponent.html" data-type="entity-link" >Upload2filesAPIComponent</a>
                            </li>
                            <li class="link">
                                <a href="components/ViewersBrowseComponent.html" data-type="entity-link" >ViewersBrowseComponent</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#directives-links"' :
                                'data-bs-target="#xs-directives-links"' }>
                                <span class="icon ion-md-code-working"></span>
                                <span>Directives</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="directives-links"' : 'id="xs-directives-links"' }>
                                <li class="link">
                                    <a href="directives/AutofocusDirective.html" data-type="entity-link" >AutofocusDirective</a>
                                </li>
                                <li class="link">
                                    <a href="directives/DisableControlDirective.html" data-type="entity-link" >DisableControlDirective</a>
                                </li>
                                <li class="link">
                                    <a href="directives/FormlyUser.html" data-type="entity-link" >FormlyUser</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/MapController.html" data-type="entity-link" >MapController</a>
                            </li>
                            <li class="link">
                                <a href="classes/Message.html" data-type="entity-link" >Message</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AnalysesResolver.html" data-type="entity-link" >AnalysesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AnnotationsFieldsResolver.html" data-type="entity-link" >AnnotationsFieldsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AnnotationsTemplatesResolver.html" data-type="entity-link" >AnnotationsTemplatesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AuthService.html" data-type="entity-link" >AuthService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/BackendService.html" data-type="entity-link" >BackendService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CanEnterPage.html" data-type="entity-link" >CanEnterPage</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CaseStudiesResolver.html" data-type="entity-link" >CaseStudiesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CheckLoginGuard.html" data-type="entity-link" >CheckLoginGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CheckProcedenceGuard.html" data-type="entity-link" >CheckProcedenceGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/CheckRoleGuard.html" data-type="entity-link" >CheckRoleGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FastaFileService.html" data-type="entity-link" >FastaFileService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/FilesService.html" data-type="entity-link" >FilesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GlobalService.html" data-type="entity-link" >GlobalService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GroupsResolver.html" data-type="entity-link" >GroupsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/IdentitiesResolver.html" data-type="entity-link" >IdentitiesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ImportResolver.html" data-type="entity-link" >ImportResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/IndividualResolver.html" data-type="entity-link" >IndividualResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/InternationalizationService.html" data-type="entity-link" >InternationalizationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/JobResolver.html" data-type="entity-link" >JobResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LayerResolver.html" data-type="entity-link" >LayerResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/LayerStylesResolver.html" data-type="entity-link" >LayerStylesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MessageLogService.html" data-type="entity-link" >MessageLogService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MetadataCrsResolver.html" data-type="entity-link" >MetadataCrsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MetadataSourcesResolver.html" data-type="entity-link" >MetadataSourcesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MetadataThemesResolver.html" data-type="entity-link" >MetadataThemesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ModalInfoService.html" data-type="entity-link" >ModalInfoService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/NotificationService.html" data-type="entity-link" >NotificationService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/OrganismsResolver.html" data-type="entity-link" >OrganismsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/OrganizationsResolver.html" data-type="entity-link" >OrganizationsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ProcessResolver.html" data-type="entity-link" >ProcessResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ResourceResolver.html" data-type="entity-link" >ResourceResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RolesResolver.html" data-type="entity-link" >RolesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RoutePathService.html" data-type="entity-link" >RoutePathService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SequencesResolver.html" data-type="entity-link" >SequencesResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SidebarService.html" data-type="entity-link" >SidebarService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SocketService.html" data-type="entity-link" >SocketService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/StateService.html" data-type="entity-link" >StateService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SystemFunctionsResolver.html" data-type="entity-link" >SystemFunctionsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TermsResolver.html" data-type="entity-link" >TermsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ThemeService.html" data-type="entity-link" >ThemeService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/TopAreaService.html" data-type="entity-link" >TopAreaService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#guards-links"' :
                            'data-bs-target="#xs-guards-links"' }>
                            <span class="icon ion-ios-lock"></span>
                            <span>Guards</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="guards-links"' : 'id="xs-guards-links"' }>
                            <li class="link">
                                <a href="guards/AuthResolver.html" data-type="entity-link" >AuthResolver</a>
                            </li>
                            <li class="link">
                                <a href="guards/GeoRegionResolver.html" data-type="entity-link" >GeoRegionResolver</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/Annotation.html" data-type="entity-link" >Annotation</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ButtonsInfoModal.html" data-type="entity-link" >ButtonsInfoModal</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ContainerizationImageItem.html" data-type="entity-link" >ContainerizationImageItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ContainerizationImageItemResponse.html" data-type="entity-link" >ContainerizationImageItemResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ContainerizationImagesItemResponse.html" data-type="entity-link" >ContainerizationImagesItemResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Contraints.html" data-type="entity-link" >Contraints</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Contraints-1.html" data-type="entity-link" >Contraints</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DetailTableACL.html" data-type="entity-link" >DetailTableACL</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DynamicTab.html" data-type="entity-link" >DynamicTab</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FieldInterface.html" data-type="entity-link" >FieldInterface</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetProcessesInResourceResponse.html" data-type="entity-link" >GetProcessesInResourceResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetProcessesInResourceResponseContent.html" data-type="entity-link" >GetProcessesInResourceResponseContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetProcessResponse.html" data-type="entity-link" >GetProcessResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetProcessResponseContent.html" data-type="entity-link" >GetProcessResponseContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetProcessResponseExecution.html" data-type="entity-link" >GetProcessResponseExecution</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetResourceResponseContent.html" data-type="entity-link" >GetResourceResponseContent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GetResourcesResponse.html" data-type="entity-link" >GetResourcesResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IButtonsModalInfo.html" data-type="entity-link" >IButtonsModalInfo</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ICreateMapEvent.html" data-type="entity-link" >ICreateMapEvent</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ICustomActionButton.html" data-type="entity-link" >ICustomActionButton</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IEditStylePropertyEditValue.html" data-type="entity-link" >IEditStylePropertyEditValue</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IMenuItem.html" data-type="entity-link" >IMenuItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/INextgendemGeoLayerModalMapSettingsFormValue.html" data-type="entity-link" >INextgendemGeoLayerModalMapSettingsFormValue</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/INgdBarcodingData.html" data-type="entity-link" >INgdBarcodingData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/INgdBarcodingPosition.html" data-type="entity-link" >INgdBarcodingPosition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IObjectType.html" data-type="entity-link" >IObjectType</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IPreferencesValue.html" data-type="entity-link" >IPreferencesValue</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IProcessTypesSourceCodeFileListNode.html" data-type="entity-link" >IProcessTypesSourceCodeFileListNode</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IThemeOption.html" data-type="entity-link" >IThemeOption</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IView.html" data-type="entity-link" >IView</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/IViewTypes.html" data-type="entity-link" >IViewTypes</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Jm_credentials.html" data-type="entity-link" >Jm_credentials</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Jm_location.html" data-type="entity-link" >Jm_location</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Jm_params.html" data-type="entity-link" >Jm_params</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProcessesSourceCode.html" data-type="entity-link" >ProcessesSourceCode</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProcessesSourceCodeResponse.html" data-type="entity-link" >ProcessesSourceCodeResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ProcessesTypeDetailGeneralTabForm.html" data-type="entity-link" >ProcessesTypeDetailGeneralTabForm</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SidebarItem.html" data-type="entity-link" >SidebarItem</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StringResult.html" data-type="entity-link" >StringResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Taxset.html" data-type="entity-link" >Taxset</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Taxset-1.html" data-type="entity-link" >Taxset</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#pipes-links"' :
                                'data-bs-target="#xs-pipes-links"' }>
                                <span class="icon ion-md-add"></span>
                                <span>Pipes</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="pipes-links"' : 'id="xs-pipes-links"' }>
                                <li class="link">
                                    <a href="pipes/KeyValueCustomPipe.html" data-type="entity-link" >KeyValueCustomPipe</a>
                                </li>
                                <li class="link">
                                    <a href="pipes/SafeHtmlPipe.html" data-type="entity-link" >SafeHtmlPipe</a>
                                </li>
                                <li class="link">
                                    <a href="pipes/SafeNullPipe.html" data-type="entity-link" >SafeNullPipe</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});