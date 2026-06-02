export interface IObjectType {
  pageDetail: string,
  readPermission?: string,
  translation: string,
}

const OBJECT_TYPES_TRANSLATION_PREFIX = 'OBJECT_TYPES.'

const OBJECT_TYPES: { [key: string]: IObjectType } = {
  sequence: {
    pageDetail: 'sequenceDetail',
    readPermission: 'gui-seq-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}SEQUENCE`,
  },
  'multiple-sequence-alignment': {
    pageDetail: 'alignmentDetail',
    readPermission: 'gui-ma-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}MULTIPLE_SEQUENCE_ALIGNMENT`,
  },
  'phylogenetic-tree': {
    pageDetail: 'phylotreeDetail',
    readPermission: 'gui-pt-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}PHYLOGENETIC_TREE`,
  },
  blast: {
    pageDetail: 'blastDetail',
    readPermission: 'gui-blast-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}BLAST`,
  },
  'sequence-similarity': {
    pageDetail: 'sequenceSimilarityDetail',
    readPermission: 'gui-sequence-similarity-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}SEQUENCE_SIMILARITY_DETAIL`,
  },
  'discriminant-matrix': {
    pageDetail: 'discriminantMatrixDetail',
    readPermission: 'gui-discriminant-matrix-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}DISCRIMINANT_MATRIX`,
  },
  supermatrix: {
    pageDetail: 'supermatrixDetail',
    readPermission: 'gui-smatrix-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}SUPERMATRIX`,
  },
  geolayer: {
    pageDetail: 'geolayerDetail',
    readPermission: 'gui-layer-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}GEOLAYER`,
  },
  'case-studies': {
    pageDetail: 'caseStudiesDetail',
    readPermission: 'gui-case-study-read',
    translation: `${OBJECT_TYPES_TRANSLATION_PREFIX}CASE_STUDIES`,
  }
};

export default OBJECT_TYPES;
