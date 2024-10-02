/* eslint-disable max-classes-per-file */
import { Directive, ElementRef, Inject, Input, NgModule, OnDestroy, OnInit, Optional, Renderer2 } from '@angular/core';
import { fromEvent, Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';
import CreditCardHelper, { CreditCardNetwork } from './credit-card-helper';

@Directive({
  selector: '[rl-credit-card]',
})
export class CreditCardDirective implements OnDestroy, OnInit {
  private readonly cardNetwork$ = new Subject<CreditCardNetwork>();
  private readonly destroy$ = new Subject<void>();
  private readonly helper: CreditCardHelper;
  @Input('networkLogoDestination')
  private logo: HTMLElement | undefined;

  constructor(
    @Inject(DOCUMENT) private readonly document: HTMLDocument,
    private readonly elementRef: ElementRef,
    private readonly renderer: Renderer2,
    @Optional() @Inject('anyToken') helper?: CreditCardHelper
  ) {
    this.helper = helper || new CreditCardHelper();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  ngOnInit(): void {
    const input: HTMLInputElement = this.elementRef.nativeElement;
    this.renderer.setAttribute(input, 'inputmode', 'numeric');
    this.renderer.setAttribute(input, 'maxlength', '23');

    this.cardNetwork$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((network) => this.updateCardNetwork(network));

    this.updateCardNumber();
    fromEvent(input, 'input')
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateCardNumber());
  }

  updateCardNetwork(network: CreditCardNetwork | null): void {
    if (this.logo) {
      const image = CreditCardHelper.getNetworkLogo(network);
      this.renderer.setStyle(this.logo, 'backgroundImage', `url("${image}"`);
    }
  }

  updateCardNumber(): void {
    const input: HTMLInputElement = this.elementRef.nativeElement;
    const cursorPosition = input.selectionStart;
    const newPosition = this.helper.findPositionAfterFormat(cursorPosition, input.value);
    const { network, number } = this.helper.getCreditCardInfo(input.value);
    const formattedNumber = this.helper.format(network, number);
    this.renderer.setProperty(input, 'value', formattedNumber);
    this.cardNetwork$.next(network && network[0]);
    setTimeout(() => {
      // this check is necessary for Safari, since setting the selection range will cause a focus event, which makes the
      // control "touched" and shows an error (INNO-1964)
      if (this.document.activeElement === input) {
        input.setSelectionRange(newPosition, newPosition);
      }
    });
  }
}

@NgModule({
  declarations: [CreditCardDirective],
  exports: [CreditCardDirective],
})
export class CreditCardDirectiveModule {}
