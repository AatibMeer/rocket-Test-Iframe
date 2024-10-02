import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import * as reduxActions from '../../../state/actions/sign';
import { Store } from '../../../state/store';
import { Binder } from '../../../services/sign-app/binder.interface';
import { scaleAndFade } from '../../../animations/animations';
import { InputType, SignatureInput} from '../../../services/sign-app/signature-input.interface';
import { getAllInputs, getPartyByRoleName } from '../../../state/selectors';
import { Party, RoleEnum } from '../../../services/sign-app/party.interface';

export const tempUUIDPrefix = 'TEMP-';

export class TooltipPosition {
  vAlignment: 'TOP' | 'MIDDLE' | 'BOTTOM';
  hAlignment: 'LEFT' | 'CENTER' | 'RIGHT';
}

export class Tooltip {
  type: InputType;
  iconClass: string;
  position: TooltipPosition;
  notificationMsgKey: string;
  mobileNotificationMsgKey: string;
  notificationShown: boolean;
  title: string;
}

@Component({
  selector: 'toolbox-tooltip',
  templateUrl: './toolbox-tooltip.component.html',
  styleUrls: ['./toolbox-tooltip.component.scss'],
  animations: [scaleAndFade],
})
export class ToolboxTooltipComponent implements OnChanges {
  constructor(private store: Store, private cdr: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  tools: Array<Tooltip> = [
    {
      type: 'SIGNATURE_TEXT',
      iconClass: 'toolbar-signature',
      position: {
        vAlignment: 'MIDDLE',
        hAlignment: 'LEFT',
      },
      notificationMsgKey: 'sign-toolbox_notification-signature',
      mobileNotificationMsgKey: 'sign-toolbox_notification-signature-mobile',
      notificationShown: false,
      title: 'Signature',
    },
    {
      type: 'INITIALS',
      iconClass: 'toolbar-initial',
      position: {
        vAlignment: 'MIDDLE',
        hAlignment: 'LEFT',
      },
      notificationMsgKey: 'sign-toolbox_notification-initials',
      mobileNotificationMsgKey: 'sign-toolbox_notification-initials-mobile',
      notificationShown: false,
      title: 'Initials',
    },
    {
      type: 'DATE_SIGNED',
      iconClass: 'toolbar-calendar',
      position: {
        vAlignment: 'MIDDLE',
        hAlignment: 'LEFT',
      },
      notificationMsgKey: 'sign-toolbox_notification-date',
      mobileNotificationMsgKey: 'sign-toolbox_notification-date-mobile',
      notificationShown: false,
      title: 'Date',
    },
    {
      type: 'CUSTOM_TEXT',
      iconClass: 'toolbar-textbox',
      position: {
        vAlignment: 'MIDDLE',
        hAlignment: 'LEFT',
      },
      notificationMsgKey: 'sign-toolbox_notification-text',
      mobileNotificationMsgKey: 'sign-toolbox_notification-text-mobile',
      notificationShown: false,
      title: 'Text',
    },
  ];

  @Input() binder: Binder = null;
  @Input() zoomLevel;
  @Input() clientWidth;
  @Input() fixedOffset;
  @Input() pageClickEvent = null;
  @Input() inputDimensions;
  @Output() hideTooltip = new EventEmitter();
  @ViewChild('tooltipArrow') tooltipArrow: ElementRef;
  @ViewChild('tooltip') tooltip: ElementRef;

  inputs: Array<SignatureInput> = [];

  tooltipArrowStyles: any = {};
  translateVal = '-50%';
  cssTranslateVal = this.sanitizer.bypassSecurityTrustStyle(`translateX(${this.translateVal})`);
  tooltipStyles: any = {
    width: '250px',
    height: '50px',
    top: '-65px',
    left: '50%',
  };

  ngOnChanges(changes): void {
    if (changes) {
      this.setArrowStyles(this.pageClickEvent);
      setTimeout(() => this.transformStyle(this.pageClickEvent), 1);
      Object.assign(this.tooltipArrowStyles, {
        transform: `scale(${this.zoomLevel})`,
        transformOrigin: '50% 100%',
      });
    }
  }

  setArrowStyles(event): void {
    if (!event) return;
    const topBanner = document.querySelector('.top-banner-container').clientHeight || 0;
    const headerHeight = document.querySelector('header') ? document.querySelector('header').clientHeight : 0;
    const topOffset = topBanner + headerHeight;
    this.tooltipArrowStyles = {
      top: `${event.pageY - topOffset - 20}px`,
      left: `${event.pageX - 14}px`,
    };
  }

  transformStyle(event): void {
    const clientWidth = this.clientWidth || document.documentElement.clientWidth;
    const fixedOffset = this.fixedOffset || ToolboxTooltipComponent.getFixedOffset();
    const tooltipWidth = this.tooltipStyles.width.replace('px', '');
    const scaledHalfTooltipWidth = (tooltipWidth * this.zoomLevel) / 2;
    const rightEdgeCoord = fixedOffset + clientWidth * this.zoomLevel;
    const arrowX = event.pageX - fixedOffset;

    if (arrowX < scaledHalfTooltipWidth) {
      this.setTransformCss('translateX(-8%)');
    } else if (event.pageX > rightEdgeCoord - scaledHalfTooltipWidth) {
      this.setTransformCss('translateX(-92%)');
    } else {
      this.setTransformCss('translateX(-50%)');
    }
    this.cdr.detectChanges();
  }

  private static getFixedOffset(): number {
    const fixedElem = document.createElement('div');
    fixedElem.style.cssText = 'position:fixed; top: 0; left: 0';
    document.body.appendChild(fixedElem);
    const rect = fixedElem.getBoundingClientRect();
    document.body.removeChild(fixedElem);
    return rect.left * -1;
  }

  setTransformCss(val: string): void {
    this.cssTranslateVal = this.sanitizer.bypassSecurityTrustStyle(val);
  }

  createInput(event: any, toolType: string): void {
    // values are % based unless specified otherwise
    const selectedTooltip = this.tools.find((t) => t.type === toolType);
    const pageDroppedInto = event.srcElement || event.target;

    const { docId } = pageDroppedInto.dataset;
    const { pageId } = pageDroppedInto.dataset;
    const pageHeight: number = pageDroppedInto.clientHeight;
    const pageWidth: number = pageDroppedInto.clientWidth;

    const clickedXOffset: number = ((event.offsetX ? event.offsetX : event.layerX) / pageWidth) * 100;
    const clickedYOffset: number = ((event.offsetY ? event.offsetY : event.layerY) / pageHeight) * 100;

    let inputXOffset: number;
    let inputYOffset: number;

    // by default, input will be centered around the X,Y coords of the click/tap event
    inputXOffset = clickedXOffset - this.inputDimensions.inputWidth / 2;
    inputYOffset = clickedYOffset - this.inputDimensions.inputHeight;

    if (clickedXOffset < this.inputDimensions.inputWidth / 2) inputXOffset += this.inputDimensions.inputWidth / 2;
    else if (clickedXOffset + this.inputDimensions.inputWidth / 2 > 100)
      inputXOffset -= this.inputDimensions.inputWidth / 2;

    if (inputYOffset < 0) inputYOffset = 0;
    else if (inputYOffset + this.inputDimensions.inputHeight > 100)
      inputYOffset = 100 - this.inputDimensions.inputHeight;

    const partyToBeAssignedToInput = this.getPartyToAssignToInput();
    const newInput: SignatureInput = {
      // fake id used in UI only
      id: ToolboxTooltipComponent.getRandomUuid(),
      type: selectedTooltip.type,
      docId,
      legalName: partyToBeAssignedToInput.legalName,
      partyReference: partyToBeAssignedToInput.reference,
      style: partyToBeAssignedToInput.metaData.style.background,
      optional: false,
      font: {
        sizeInPx: 16,
        type: 'CAVEAT_REGULAR',
      },
      position: {
        type: 'ABSOLUTE',
        width: this.inputDimensions.inputWidth,
        height: this.inputDimensions.inputHeight,
        hAlignment: selectedTooltip.position.hAlignment,
        vAlignment: selectedTooltip.position.vAlignment,
        xOffset: inputXOffset,
        yOffset: inputYOffset,
        pageId,
        unit: 'PCT',
      },
      active: true,
      isFresh: true,
    };

    // dispatch to store
    this.store.dispatch(reduxActions.addInput(newInput));
    this.store.dispatch(reduxActions.toggleInputActiveness({id: newInput.id}));
    this.hideTooltip.emit();
  }

  private static getRandomUuid(): string {
    // generates a basic random uuid
    let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      // eslint-disable-next-line no-bitwise
      const r = (Math.random() * 16) | 0;
      // eslint-disable-next-line no-bitwise
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      const uuid = v.toString(16);
      return uuid;
    });
    return tempUUIDPrefix + id;
  }

  getPartyToAssignToInput(): Readonly<Party> | undefined {
    const inputs = getAllInputs(this.store.getState());
    // by default we assign the doc owner to the input
    // otherwise assign whatever was the latest setting by the user
    if (inputs && inputs.length) {
      return this.binder.parties.find((party) => {
        return party.reference === inputs[inputs.length - 1].partyReference;
      });
    }
    return getPartyByRoleName(this.binder, RoleEnum.Owner);
  }
}
