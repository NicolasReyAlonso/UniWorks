export enum TYPE_RANGE {
  TEXT_OPTIONS = 'TEXT_OPTIONS',
}

export interface IViewTypes {
  label: string,
  value: string,
  canMultiple: boolean,
  typeRange?: TYPE_RANGE,
}

export const viewTypes: IViewTypes[] = [
    {
      label: 'ANNOTATIONS.FIELDS.VIEW_TYPES.TEXT.LABEL',
      value: 'annotation-text',
      canMultiple: true,
    },
    {
      label: 'ANNOTATIONS.FIELDS.VIEW_TYPES.TEXT_OPTIONS.LABEL',
      value: 'annotation-text-options',
      canMultiple: true,
      typeRange: TYPE_RANGE.TEXT_OPTIONS,
    }
];
