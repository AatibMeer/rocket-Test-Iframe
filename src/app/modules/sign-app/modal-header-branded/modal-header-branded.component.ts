import {
  AfterContentInit,
  Component,
  ContentChildren,
  Input,
  OnChanges,
  QueryList,
  SecurityContext,
  SimpleChanges,
} from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { ModalHeaderBase, WithWidgets } from '../modal/modal-header';
import { ModalHeaderWidgetDirective } from '../modal/modal-header-widget.directive';
import { Store } from '../../../state/store';

const Base = WithWidgets(ModalHeaderBase);

@Component({
  selector: 'rl-modal-header-branded',
  templateUrl: './modal-header-branded.component.html',
})
export class ModalHeaderBrandedComponent extends Base implements AfterContentInit, OnChanges {
  @Input() product?: 'sign' | 'wallet' | 'notary';

  @ContentChildren(ModalHeaderWidgetDirective) widgets?: QueryList<ModalHeaderWidgetDirective>;

  get canShowLogo(): boolean {
    return this.logoURL !== undefined;
  }

  logoURL?: SafeStyle;

  constructor(private readonly sanitizer: DomSanitizer, private readonly store: Store) {
    super();
  }

  ngOnChanges({ product }: SimpleChanges): void {
    if (product) {
      // using the sanitizer is the only way to get Angular to insert CSS variables (otherwise they are stripped out).
      // Style HostBinding also works, but we are using multiple variables where only 1 is used at a time
      // https://github.com/angular/angular/issues/9343
      const { brandConfig, globalBrandConfig } = this.store.getState();
      if (globalBrandConfig && globalBrandConfig.brandingLevel !== 1) {
        this.logoURL = undefined;
        return;
      }
      if (product.currentValue === 'sign' && brandConfig?.lookAndFeel.signLogoUrl) {
        this.logoURL = this.sanitizer.bypassSecurityTrustStyle(
          `--rl-logo--product--sign--image: ${this.sanitizer.sanitize(
            SecurityContext.STYLE,
            `url("${brandConfig.lookAndFeel.signLogoUrl}")`
          )}`
        );
      } else if (product.currentValue === 'wallet' && brandConfig?.lookAndFeel.walletLogoUrl) {
        this.logoURL = this.sanitizer.bypassSecurityTrustStyle(
          `--rl-logo--product--wallet--image: ${this.sanitizer.sanitize(
            SecurityContext.STYLE,
            `url("${brandConfig.lookAndFeel.walletLogoUrl}")`
          )}`
        );
      } else if (product.currentValue === 'notary') {
        this.logoURL = this.sanitizer.bypassSecurityTrustStyle(
          `--rl-logo--product--notary--image: ${this.sanitizer.sanitize(
            SecurityContext.STYLE,
            `url("images/rocketnotarize-logo.svg")`
          )}`
        );
      } else {
        this.logoURL = undefined;
      }
    }
  }

  ngAfterContentInit(): void {
    this.setupWidgets();
  }
}
