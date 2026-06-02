import {Injectable, Inject} from '@angular/core';
import {IButtonsModalInfo} from '../gui/miscellaneous/modal-info/modal-info.component';
import {INTERNATIONALIZATION_SERVICE, InternationalizationService, InternationalizationServiceInterface} from "ngt-gui/core";
@Injectable({
  providedIn: 'root'
})
export class ModalInfoService {

  titleModalInfo: any;
  contentModalInfo: any;
  contentParamsModalInfo: any;
  iconTypeModalInfo: any;
  iconThemeModalInfo: any;
  iconTwotoneColorModalInfo: any;
  buttonsModalInfo: any;
  isVisibleModalInfo = false;
  closeFunc: () => {}

  colorWarningDefault = '#faad14';
  colorErrorDefault = '#e30808';

  constructor(
    @Inject (INTERNATIONALIZATION_SERVICE) private readonly internationalizationService: InternationalizationServiceInterface,
  ) {
  }

  showModalInfo(title: string, content: string, contentParams: any, iconType: string, iconTheme: string, iconTwotone: string | null, buttons: IButtonsModalInfo[] | null, opts?: any) {
    this.titleModalInfo = title;
    this.contentModalInfo = content.replace(/(?:\r\n|\r|\n)/g, '<br>');
    this.contentParamsModalInfo = contentParams;
    this.iconTypeModalInfo = iconType;
    this.iconThemeModalInfo = iconTheme;
    this.iconTwotoneColorModalInfo = iconTwotone;
    this.buttonsModalInfo = buttons;
    this.isVisibleModalInfo = true;
    this.closeFunc = opts?.closeFunc
  }

  showModalInfoDefaultError(e: any) {
    if (e.error && typeof e.error.message === 'string') {
      this.showModalInfo(
        'MODAL_INFO.DEFAULT_ERROR.TITLE',
        e.error.message,
        null,
        'exclamation-circle',
        'twotone',
        '#ff0000',
        null,
      );
    } else if (e.message) {
      this.showModalInfo(
        'MODAL_INFO.DEFAULT_ERROR.TITLE',
        e.message,
        null,
        'exclamation-circle',
        'twotone',
        '#ff0000',
        null,
      );
    }
  }

  async showModalInfoError(message) {
    this.showModalInfo(
      'MODAL_INFO.DEFAULT_ERROR.TITLE',
      await this.internationalizationService.translate(message),
      null,
      'exclamation-circle',
      'twotone',
      '#ff0000',
      null,
    );
  }

  showNeedSaveChange(saveFunc: () => void, acceptFunc: () => void, cancelFunc: () => void,) {
    this.showModalInfo(
      'MODAL_NEED_SAVE_CHANGES.TITLE',
      'MODAL_NEED_SAVE_CHANGES.CONTENT',
      null,
      'exclamation-circle',
      'twotone',
      '#ffe000',
      [
        {
          text: 'MODAL_NEED_SAVE_CHANGES.SAVE_BUTTON',
          type: 'primary',
          onClickFunc: saveFunc,
        },
        {
          text: 'MODAL_NEED_SAVE_CHANGES.ACCEPT_BUTTON',
          onClickFunc: acceptFunc,
        },
        {
          text: 'MODAL_NEED_SAVE_CHANGES.CANCEL_BUTTON',
          danger: true,
          type: 'primary',
          onClickFunc: cancelFunc,
        },
      ]
    );
  }
}
