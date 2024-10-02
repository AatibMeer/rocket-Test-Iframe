import { Component, Input, Output, EventEmitter, OnInit, ElementRef, ViewChild, OnChanges, OnDestroy, Inject } from '@angular/core';

import { Store } from '../../../state/store';
import * as reduxActions from '../../../state/actions/sign';

import { SignatureInput, AbsoluteInputPosition } from '../../../services/sign-app/signature-input.interface';
import interact from 'interactjs';

import { Binder } from '../../../services/sign-app/binder.interface';
import { getAllInputs, getPartyAssignedToInput } from '../../../state/selectors';
import { Party } from '../../../services/sign-app/party.interface';
import { NotificationMessageService } from '../../../services/sign-app/notification.service';
import { resizeIconScaleAndFade, scaleAndFade } from '../../../animations/animations';
import { setSignatureBuilderMode } from '../../../state/actions/uiProps';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { UserAgentService } from '../../../services/common/user-agent.service';
import { getTranslatedDatePlaceholder } from '../../../common/utility-components/util-functions';

@Component({
  selector: 'new-input',
  templateUrl: './new-input.component.html',
  styleUrls: ['./new-input.component.scss'],
  animations: [resizeIconScaleAndFade, scaleAndFade]
})

// This component handles new inputs added by the user via the sign toolbox
export class NewInputComponent implements OnInit, OnChanges, OnDestroy {
    constructor(
        private store: Store,
        private notificationService: NotificationMessageService,
        private userAgentService: UserAgentService,
        @Inject(DOCUMENT) public documentEl: Document,
        @Inject(TranslateService) private translate: TranslateService
    ) {
        let sub = this.store.subscribe(state => this.setupComponent(state));
        this.subscriptions.push(sub);
    }

    // takes an input
    @Input() inputId: string;
    public input: SignatureInput;
    @Input() binder: Binder;
    @Input() zoomLevel = 1;
    @Input() currentLocale : string;
    @Input() imgClass = '.doc-img';
    // used to open edit-input-modal
    @Output() openInputEditor: EventEmitter<SignatureInput> = new EventEmitter();
    // when a tooltip is opened, other tooltips (from other new-inputs) need to be closed
    @Output() updateDefaultInputSize: EventEmitter<any> = new EventEmitter();
    @Output() inputClicked: EventEmitter<any> = new EventEmitter();
    @ViewChild('newInput', {static: false}) newInput : ElementRef;
    @ViewChild('tooltip', {read: ElementRef}) tooltip : ElementRef;
    @ViewChild('contentWrapper', {read: ElementRef}) contentWrapper : ElementRef;
    legalNamePlaceholder: string;

    translatedDateFormat: string;

    subscriptions: Function[] = [];

    signatureBuilderModeEnabled = false;
    public lastValidPosition = {
        x: 0,
        y: 0
    };

    readonly iconsSettings = {
        signature: {
            radix: 5,
            maxSize: 20 //80
        },
        initials: {
            radix: 8,
            maxSize: 18 //50
        },
        text: {
            radix: 6,
            maxSize: 20 //68
        }
    };

    customTextLineHeight: number;

    documentContainer = '.single-document';
    draggingAllowedFrom = '.draggable, .new-input, .legal-name';

    isIE: boolean = false;

    tooltipArrowStyles = {};
    tooltipStyles = {
        transform: 'none'
    };

    rectDimensions;
    partyAssignedToInput: Party;

    customTextLinesGradient;
    customTextBorderHeight;

    hasDragAndDropHandlers = false;
    KEYCODE_ESC = 27;

    docPage;
    docPageWidth;
    docPageHeight;

    minHeightForInputInPercent = 2.5;
    minWidthForInputInPercent = 10;

    inputEl;
    inputsNeedRepositioningAfterDocumentEdit = false;

    isDragging = false;
    isResizing = false;

    hover = false;

    iconFontSizes = {
    SIGNATURE_TEXT: '0px',
    CUSTOM_TEXT: '0px',
    INITIALS: '0px',
    }

    ngOnInit() {
        var state = this.store.getState();
        this.setupComponent(state);
        if(this.input.isFresh) {
            //Autoselect new input, and open edit input modal. This has to be done asychronously or Angular change detection will go mad.
            setTimeout(() => {
                this.elemClicked(null);
                this.openInputEditor.emit(this.input);
                this.store.dispatch(reduxActions.updateInput({...this.input, isFresh: true}))
            });
        }
    }

    ngOnDestroy() {
        this.subscriptions.forEach(unsub => unsub());
    }

    documentWasEditedUsingAdvancedEditor = false;

    setupComponent(state) {
        this.input = getAllInputs(state).find(input => input.id == this.inputId);
        if(!this.input) {
            // input is changing from API
            return;
        }
        this.iconFontSizes = {
            SIGNATURE_TEXT: this.getSignIconFontSize(this.iconsSettings.signature.radix, this.iconsSettings.signature.maxSize),
            INITIALS: this.getSignIconFontSize(this.iconsSettings.initials.radix, this.iconsSettings.initials.maxSize),
            CUSTOM_TEXT: this.getSignIconFontSize(this.iconsSettings.text.radix, this.iconsSettings.initials.maxSize)
        };

        this.inputEl = 'div.draggable[data-id="' + this.input.id + '"]';
        this.inputsNeedRepositioningAfterDocumentEdit = state.get('inputsNeedRepositioningAfterDocumentEdit')
        this.signatureBuilderModeEnabled = state.get('signatureBuilderModeEnabled');
        this.documentWasEditedUsingAdvancedEditor = this.binder.metaData ? this.binder.metaData.documentUpdatedFromAdvancedEditor == true : false;
        this.customTextLineHeight = this.getCustomTextLineHeight();
        this.customTextBorderHeight = this.getCustomTextBorderHeight();
        this.partyAssignedToInput = getPartyAssignedToInput(state, this.input);
        this.calculatePlaceholderIfNeeded();
        this.isIE = this.userAgentService.isInternetExplorerBrowser();
        this.lastValidPosition = {
            x: this.input.position.xOffset,
            y: this.input.position.yOffset
        };

        if(!this.hasDragAndDropHandlers &&
            this.input.position.type != 'PLACEHOLDER' &&
            (this.signatureBuilderModeEnabled || this.inputsNeedRepositioningAfterDocumentEdit)) {
                this.attachDragAndDropHandlers(this.inputEl);
        }
        if(this.inputsNeedRepositioningAfterDocumentEdit) {
            if(this.input.warning && !this.inputIsInViewport()) this.scrollToSelf();
        }
        this.translatedDateFormat = getTranslatedDatePlaceholder(this.binder.dateFormat, this.translate.currentLang);
    }

    private calculatePlaceholderIfNeeded() {
        if (this.hasLegalNamePlaceholder()) {
            this.translate.get('new-input_party-name-placeholder').subscribe((translation) => {
                this.legalNamePlaceholder = translation + this.partyAssignedToInput.missingLegalNameIndex;
            });
        }
    }

   hasLegalNamePlaceholder(): boolean {
        return !this.partyAssignedToInput.legalName;
    }

    ngOnChanges(changes) {
        if(changes) {
            this.input = getAllInputs(this.store.getState()).find(input => input.id == this.inputId);
            if(!this.input) {
                // input is changing from API
                return;
            }
            this.partyAssignedToInput = getPartyAssignedToInput(this.store.getState(), this.input);
            if(changes.zoomLevel && this.tooltip) {
                this.setTooltipArrowStyles();
            }
        }
    }

    inputIsInViewport() {
        if(this.newInput && this.newInput.nativeElement) {
            var rect = this.newInput.nativeElement.getBoundingClientRect();
            return rect.bottom > 0 &&
            rect.right > 0 &&
            rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
            rect.top < (window.innerHeight || document.documentElement.clientHeight);
        }
        return false;
    }

    getBoundingClientRect() {
        return this.newInput.nativeElement.getBoundingClientRect();
    }

    scrollToSelf() {
        // if page not rendered, retry again
        let inputPage = $(this.imgClass + '[data-page-id="' + this.input.position.pageId + '"]');
        let input = this.newInput;
        if(inputPage.height() == 0 || !input) {
            setTimeout(() => this.scrollToSelf(), 200);
            return;
        }
        let elem = $(this.newInput.nativeElement);
        let topOffset = elem.offset().top - (window.innerHeight/2);
        $('html,body').animate({ scrollTop: topOffset }, 'fast');
    }
    setCustomTextGradient(party) {
        let color = party.metaData.style.background;
        let gradientHeight = this.customTextLineHeight - this.customTextBorderHeight;
        return `linear-gradient(${color}, ${color} ${gradientHeight}px, #ffffff 0px)`;
    }

    setIECustomTextGradient(party) {
        let color = party.metaData.style.background;
        let gradientHeight = this.customTextLineHeight - this.customTextBorderHeight;
        return `-ms-linear-gradient(${color}, ${color} ${gradientHeight}px, #ffffff 0px)`;
    }

    getCustomTextLineHeight(): number {
        // returned value should be 2.5% of document page expressed in pixels
        let docPage = document.querySelector(this.imgClass);
        let docPageHeight = docPage.clientHeight;
        return Math.floor((docPageHeight / 100) * this.minHeightForInputInPercent);
    }

    getCustomTextBorderHeight(): number {
        // value in px
        return 1;
    }

    onMouseDown(event) {
        // disable right clicks
        if(event.which == 3) return;
    }

    onMouseUp(event) {
        // disable right clicks
        if(event.which == 3) return;
        if(this.isDragging || this.isResizing) {
            event.stopPropagation();
            event.preventDefault();
        }
        else this.elemClicked(event);
    }

    elemClicked(event) {
        if(this.input.position.type == 'PLACEHOLDER') {
            this.onPlaceholderInputClicked();
        }
        else {
            this.onAbsoluteInputClicked();
        }
    }

    onPlaceholderInputClicked() {
        if(this.inputsNeedRepositioningAfterDocumentEdit) return;
        else this.toggleInputAndSetupTooltip();
    }

    onAbsoluteInputClicked() {
        // if we're in repositioning mode (after doc edit), show warning for that input
        if(this.inputsNeedRepositioningAfterDocumentEdit ) {
            this.setWarningToCurrentInput();
            return;
        }
        if(!this.signatureBuilderModeEnabled) {
            this.store.dispatch(setSignatureBuilderMode(true));
            this.toggleInputAndSetupTooltip();
        }
        else {
            this.toggleInputAndSetupTooltip();
        }
    }

    toggleInputAndSetupTooltip(active = !this.input.active) {
        this.toggleInput(active);
        this.onInputActivation();
    }

    setWarningToCurrentInput() {
        this.store.dispatch(reduxActions.removeInputWarning());
        this.store.dispatch(reduxActions.setInputWarning({id: this.input.id}));
        this.toggleInputAndSetupTooltip();
    }

    destroyDragAndDropHandlers() {
        interact(this.inputEl).unset();
    }

    openInputEditModal(event?) {
        if(event) {
            event.stopPropagation();
            event.preventDefault();
        }
        this.openInputEditor.emit(this.input);
    }

    deleteInput(event) {
        event.stopPropagation();
        this.notificationService.setNotification({key: 'new-input_notification-delete-message', autoClose: true});
        this.store.dispatch(reduxActions.removeInput(this.input));
    }

    attachDragAndDropHandlers(element) {
        this.destroyDragAndDropHandlers();
        // rectDimensions are the min and max values for resizing the input
        // units used by default are % only
        var pageWidth = document.querySelector(this.imgClass).getBoundingClientRect().width;
        var pageHeight = document.querySelector(this.imgClass).getBoundingClientRect().height;
        var minWidthForInput = (pageWidth / 100) * this.minWidthForInputInPercent;
        var maxWidthForInput = pageWidth;
        var minHeightForInput = (pageHeight / 100) * this.minHeightForInputInPercent;
        var maxHeightForInput = pageHeight;

        // if pageWidth or pageHeight are undefined, doc images arent yet rendered, try again later
        if(!pageWidth || !pageHeight) {
            setTimeout(this.attachDragAndDropHandlers.bind(this, element), 100);
            return;
        }

        this.rectDimensions = {
            minWidth: minWidthForInput,
            maxWidth: maxWidthForInput,
            minHeight: minHeightForInput,
            maxHeight: maxHeightForInput
        }
        // set event handlers for repositioning and resizing
        interact(element)
        .draggable({
            allowFrom: this.draggingAllowedFrom,
            // disable inertial throwing
            inertia: false,
            // enable user to scroll while dragging the element
            autoScroll: true,
            onmove: this.onDragMove.bind(this),
            onstart: this.onDragStart.bind(this),
            onend: this.onDragEnd.bind(this)
        })
        .pointerEvents({
            ignoreFrom: '.arrow'
        })
        .resizable({
            preserveAspectRatio: false,
            edges: {
                left: '.resize-control.left',
                right: '.resize-control.right',
                bottom: '.resize-control.bottom',
                top: '.resize-control.top'
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width:this.rectDimensions.minWidth, height: this.rectDimensions.minHeight },
                    max: { width:this.rectDimensions.maxWidth, height: this.rectDimensions.maxHeight }
                })
            ],
            allowFrom: '.resize-control'
        })
        .on('resizemove', this.onResizeMove.bind(this))
        .on('resizestart', this.onResizeStart.bind(this))
        .on('resizeend', this.onResizeEnd.bind(this));

        this.hasDragAndDropHandlers = true;
    }


    onDragStart(e) {
        this.isDragging = true;
        if(this.inputsNeedRepositioningAfterDocumentEdit) {
            this.setWarningToCurrentInput();
        }
        this.toggleInputAndSetupTooltip(true);
        this.docPage = document.querySelector(this.imgClass);
        this.docPageWidth = this.docPage.clientWidth;
        this.docPageHeight = this.docPage.clientHeight;
        var target = e.target || e.srcElement;
        this.updateLastValidPosition();
        this.inputClicked.emit();
    }

    updateLastValidPosition() {
      var xStart = this.input.position.xOffset;
      var yStart = this.input.position.yOffset;
      this.lastValidPosition = {
        x: xStart,
        y: yStart
      }
    }

    onDragEnd(e) {
        // 10ms delay means the mouseUP event from dragging will NOT toggle the tooltip
        setTimeout(() => {
            this.isDragging = false;
        }, 10)
        if(!e) return;
        if(!e.relatedTarget) {
            this.deleteInput(e);
        }
    }

    onDragMove(e) {
        if(!e) return;
        var widthDiffInPercent = (e.dx / this.docPageWidth) * 100;
        var heightDiffInPercent = (e.dy / this.docPageHeight) * 100;
        // update positioning
        this.input.position.xOffset += widthDiffInPercent;
        this.input.position.yOffset += heightDiffInPercent;
        e.stopPropagation();
    }

    onResizeStart(e) {
        this.isResizing = true;
        var target = e.target || e.srcElement;
        if(this.inputsNeedRepositioningAfterDocumentEdit) {
            this.setWarningToCurrentInput();
        }
    }

    onResizeEnd(e) {
        // 10ms delay means the mouseUP event from resizing will NOT toggle the tooltip
        setTimeout(() => {
            this.isResizing = false;
        }, 10)
        var target = e.target || e.srcElement;

        // update input position and size in store
        var pageRect = document.querySelector(this.imgClass + '[data-page-id="' + this.input.position.pageId + '"]');
        var inputRect = target.getBoundingClientRect();
        var newInputPositioning = this.calculateInputPositionAndSize(pageRect, inputRect);
        this.updateInputPositionAndSize(newInputPositioning);
    }

    onResizeMove(e) {
        var docPage: HTMLElement = document.querySelector(this.imgClass + '[data-page-id="' + this.input.position.pageId + '"]')
        var docPageRect = docPage.getBoundingClientRect();
        var imgOffset = (<any>document).querySelector(this.documentContainer).offsetLeft;
        var docPageBottomOffset = docPageRect.bottom + window.pageYOffset;

        var docPage: HTMLElement = document.querySelector(this.imgClass + '[data-page-id="' + this.input.position.pageId + '"]')
        var docPageRect = docPage.getBoundingClientRect();
        var imgOffset = (<any>document).querySelector(this.documentContainer).offsetLeft;
        var docPageBottomOffset = docPageRect.bottom + window.pageYOffset;

        if(e.rect && docPageBottomOffset && imgOffset) {
            // if user tries to resize past bottom or right doc page boundaries, do nothing
            if((e.rect.bottom > docPageBottomOffset) ||
            ((e.rect.right - imgOffset) >= docPage.offsetWidth)) return;
        }

        var target = e.target || e.srcElement;
        var x = (parseFloat(target.getAttribute('data-x')) || 0);
        var y = (parseFloat(target.getAttribute('data-y')) || 0);

        // update the element's style
        if(this.input.type == 'CUSTOM_TEXT') {
            // custom_text inputs should jump to next line when resized
            var lineHeight = this.customTextLineHeight;
            var lines = Math.round(e.rect.height / lineHeight);
            var elHeight = Math.round(lineHeight * lines);
            target.style.height = elHeight + 'px';
        }
        else {
            target.style.height = e.rect.height + 'px';
        }

        target.style.width  = e.rect.width + 'px';

        // translate when resizing from top or left edges
        x += e.deltaRect.left;
        y += e.deltaRect.top;

        target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

        this.sendResizeEvent();
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }

    calculateInputPositionAndSize(page, inputRect) {
        var pageDroppedInto = page;

        var pageWidth = pageDroppedInto.clientWidth;
        var pageHeight = pageDroppedInto.clientHeight;
        var pageRect = pageDroppedInto.getBoundingClientRect();

        var pageOffsetFromTop = pageRect.top + window.scrollY;
        var pageOffsetFromLeft = pageRect.left + window.scrollX;
        var inputYOffsetFromDocument = inputRect.top + window.scrollY;
        var inputXOffsetFromDocument = inputRect.left + window.scrollX;

        var inputXOffsetFromDocPage = inputXOffsetFromDocument - pageOffsetFromLeft;
        var inputYOffsetFromDocPage = inputYOffsetFromDocument - pageOffsetFromTop;

        var inputXOffsetInPercent = (inputXOffsetFromDocPage / pageWidth) * 100;
        var inputYOffsetInPercent = (inputYOffsetFromDocPage / pageHeight) * 100;
        var newPageId = pageDroppedInto.dataset.pageId;
        var preciseInputWidth = (inputRect.width / pageWidth) * 100;
        var preciseInputHeight = (inputRect.height / pageHeight) * 100;
        var roundedInputWidth = Math.round(preciseInputWidth / 0.5) * 0.5;
        var roundedInputHeight = Math.round(preciseInputHeight / 0.5) * 0.5;

        return {
            xOffset: inputXOffsetInPercent,
            yOffset: inputYOffsetInPercent,
            pageId: newPageId,
            width: roundedInputWidth,
            height: roundedInputHeight
        }
    }

    updateInputPositionAndSize(opts: AbsoluteInputPosition) {
        var newPosition = Object.assign({}, this.input.position, {
            xOffset: opts.xOffset || this.input.position.xOffset,
            yOffset: opts.yOffset || this.input.position.yOffset,
            pageId: opts.pageId || this.input.position.pageId,
            width: opts.width || this.input.position.width,
            height: opts.height || this.input.position.height,
            type: this.input.position.type
        }),
        inputWithNewPosition = Object.assign({}, this.input, {
            position: newPosition,
            font: {
                type: 'CAVEAT_REGULAR'
            }
        });
        this.store.dispatch(reduxActions.updateInput(inputWithNewPosition));
        // when updating input size, also update defaultSize for inputs
        this.updateDefaultInputSize.emit({
            inputWidth: newPosition.width,
            inputHeight: newPosition.height
        });
    }

    getSignIconFontSize(radix, max) {
        //these values are set to ensure icon rescaling on input resize.
        const inputMargins = 10;
        const sizeRadix = 8;
        if(!this.newInput) return `0px`;
        if((this.newInput.nativeElement.clientWidth / radix) + inputMargins < this.newInput.nativeElement.clientHeight)
        return Math.round(this.newInput.nativeElement.clientWidth / radix) < max ? Math.round(this.newInput.nativeElement.clientWidth / radix) + 'px' : max + 'px';
        else return Math.round(this.newInput.nativeElement.clientHeight - (this.newInput.nativeElement.clientHeight / sizeRadix)) < max ? Math.round(this.newInput.nativeElement.clientHeight - (this.newInput.nativeElement.clientHeight / sizeRadix)) + 'px'  : max + 'px';
    }

    setTooltipArrowStyles() {
        Object.assign(this.tooltipArrowStyles, {
            transform: 'scale(' + this.zoomLevel + ')',
            transformOrigin: '50% 135%'
        });
    }

    getBoxStyle() {
        var styleUnits = this.getCssPositionUnits(this.input);
        return {
            position: 'absolute',
            top: this.input.position.yOffset + styleUnits,
            left: this.input.position.xOffset + styleUnits,
            width: this.input.position.width + styleUnits,
            height: this.input.position.height + styleUnits,
            display: 'flex',
            flexDirection: 'row',
            color: this.partyAssignedToInput.metaData.style.background,
            borderColor: this.partyAssignedToInput.metaData.style.background,
            justifyContent: this.getHorizontalPosition(this.input),
            alignItems: this.getVerticalPosition(this.input),
        };
    }

    getInputTextAlignment() {
        return {
            justifyContent: this.getHorizontalPosition(this.input),
            alignItems: 'center',
        };
    }

    getVerticalPosition(input) {
        switch(input.position.vAlignment) {
            case 'TOP':
                return 'flex-start';
            case 'MIDDLE':
                return 'center';
            case 'BOTTOM':
                return 'flex-end';
        }
        // default
        return 'center';
    }

    getHorizontalPosition(input) {
        switch(input.position.hAlignment) {
            case 'LEFT':
                return 'flex-start';
            case 'CENTER':
                return 'center';
            case 'RIGHT':
                return 'flex-end';
        }
        // default
        return 'center';
    }

    getCssPositionUnits(input: SignatureInput): string {
        var apiUnits = input.position.unit;
        if (apiUnits == 'PX') return 'px';
        if (apiUnits == 'PCT') return '%';
        return '%'; // default
    }


    toggleInput(active: boolean) {
        let inputs = getAllInputs(this.store.getState());
        inputs.forEach(input => this.store.dispatch(reduxActions.updateInput({...input, active: false})));
        this.store.dispatch(reduxActions.updateInput({...this.input, active: active}));
        this.inputClicked.emit();
    }

    onInputActivation() {
        this.setTooltipArrowStyles();
        this.setTooltipPosition();
    }

    sendResizeEvent() {
        if (this.isIE) {
            var event = document.createEvent('UIEvents');
            (<any>event).initUIEvent('resize', true, false, window, 0);
            window.dispatchEvent(event);
        }
        else {
            window.dispatchEvent(new Event('resize'));
        }
    }

    getSpacingAroundElement(elem: HTMLElement) {
        // will return distance from edge of viewport to elements nearest border
        // e.g. from the top edge of the viewport, to the top edge of the element; from the right edge of the viewport, to the right edge of the element; etc
        var viewportWidth = document.documentElement.clientWidth;
        var viewportHeight = document.documentElement.clientHeight;
        var elemRect = elem.getBoundingClientRect();

        return {
            top: elemRect.top,
            right: viewportWidth - elemRect.right,
            bottom: viewportHeight - elemRect.bottom,
            left: elemRect.left
        };
    }

    setTooltipPosition() {
        if(this.tooltip) {
            var el = this.tooltip.nativeElement.getBoundingClientRect();
            var clientWidth = document.documentElement.clientWidth;
            if(el.left < 0) {
                Object.assign(this.tooltipStyles, {
                    transform: 'translateX(' + (el.left * -1) + 'px)'
                })
            }
            else if(el.right > clientWidth) {
                Object.assign(this.tooltipStyles, {
                    transform: 'translateX(' + (clientWidth - el.right) + 'px)'
                })
            }
            return;
        }
    }

    isJustCreated() {
        let isFresh = true;
        this.binder.documents.forEach((document)=>{
            document.inputs.forEach((input) => {
                if(this.input.id == input.id) {
                    isFresh = false;
                }
            });
        });
        if(this.input.modalOpened) {
            isFresh = false;
        }
        return isFresh;
    }
}