import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { Party, pii } from '../../../services/sign-app/party.interface';
import { bem, makeBlockBoundBEMFunction } from '../../../common/utility-components/util-functions';

const baseClass = 'rl-party';

function hexToDec(hex: string): string[] {
  const num = parseInt(hex.substring(0, 2), 16).toString(10);
  return hex.length > 2 ? [num, ...hexToDec(hex.substring(2))] : [num];
}

const highlightOpacity = 0.2;
function makeHighlightColor(color: string): string {
  if (color.substring(0, 3).toLowerCase() === 'rgb') {
    const rgbColors = color.replace(/[^\d,]/, '');
    const parts = rgbColors.split(',');
    if (parts.length === 4) {
      parts[3] = (parseFloat(parts[3]) * highlightOpacity).toFixed(2);
      return `rgba(${parts.join(',')})`;
    }
    return `rgba(${rgbColors},${highlightOpacity})`;
  }
  if (color.charAt(0) === '#') {
    return `rgba(${hexToDec(color.substring(1)).join(',')},${highlightOpacity})`;
  }
  return 'inherit';
}

@Component({
  selector: 'rl-party',
  styleUrls: ['./party.component.scss'],
  templateUrl: './party.component.html',
})
export class PartyComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input()
  party: Party;
  /** The property of <code>Party</code> to be displayed. The default is "legalName". */
  @Input()
  displayProperty: keyof Party = 'legalName';
  /** If the display value is falsey, this value will be displayed instead. */
  @Input()
  defaultDisplayValue: string | undefined;
  /** Is the data Personally Identifiable Information (PII)?
   * If not explicitly set then it will be true if `displayProperty` is one of:
   * * `legalName`
   * * `personId`
   * * `email`
   */
  @Input('is-pii')
  isPIIInput?: boolean;

  @Input()
  showRadio = false;
  /** Whether the checkbox is checked. Only applicable when <code>showRadio</code> is <code>true</code>. */
  @Input()
  checked = false;

  @Input()
  color: string | undefined;
  @Input()
  showCog = false;

  @Output()
  onCogClick = new EventEmitter<Party>();
  @Output('toggle')
  onClick = new EventEmitter<Party>();

  @ViewChild('cog')
  readonly cogElement: ElementRef;
  @ViewChild('component', {
    read: ElementRef,
  })
  readonly element: ElementRef;

  get ariaRole(): 'radio' | null {
    return this.showRadio ? 'radio' : null;
  }
  get ariaChecked(): boolean | null {
    return this.showRadio ? !!this.checked : null;
  }
  readonly bem = makeBlockBoundBEMFunction(baseClass);
  readonly click: (event: MouseEvent) => void;
  get displayValue(): string {
    return this._displayValue;
  }
  get inputClassnames(): string {
    return bem(baseClass, 'input', {
      isRadio: this.showRadio,
    });
  }
  get isPII(): boolean {
    return this._isPII;
  }
  get radioClassnames(): string {
    return bem(baseClass, 'radio', {
      checked: this.checked,
      visible: this.showRadio,
    });
  }
  get tabIndex(): number | null {
    return this.checked ? 0 : -1;
  }

  private readonly destroy = new Subject<void>();
  private _displayValue: string;
  private _isPII = false;

  constructor(@Inject(DOCUMENT) private readonly document: HTMLDocument) {
    this.click = (event) => this.handleClick(event);
  }

  private handleClick(event: MouseEvent): void {
    // fire click if there is no cog or the click originated from outside the cog button
    if (
      !(this.cogElement && this.cogElement.nativeElement) ||
      !(this.cogElement.nativeElement as HTMLElement).contains(event.target as HTMLElement)
    ) {
      this.onClick.emit(this.party);
    }
  }

  ngAfterViewInit(): void {
    if (this.color) {
      this.setCustomColor(this.color);
    }
  }

  ngOnChanges({ color, displayProperty, defaultDisplayValue, isPIIInput, party }: SimpleChanges): void {
    if (color) {
      if (color.currentValue && this.element) {
        this.setCustomColor(color.currentValue);
      } else {
        this.removeCustomColor();
      }
    }
    if (displayProperty || defaultDisplayValue || party) {
      this.setDisplayValue();
    }
    if (displayProperty || defaultDisplayValue || party || isPIIInput) {
      this._isPII = this.valueIsPII();
    }
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  private removeCustomColor(): void {
    if (this.element) {
      (this.element.nativeElement as HTMLElement).style.removeProperty('--party-color');
      (this.element.nativeElement as HTMLElement).style.removeProperty('--party-translucent-color');
    }
  }

  private setCustomColor(color: string): void {
    if (this.element) {
      (this.element.nativeElement as HTMLElement).style.setProperty('--party-color', color);
      (this.element.nativeElement as HTMLElement).style.setProperty(
        '--party-translucent-color',
        makeHighlightColor(color)
      );
    }
  }

  private setDisplayValue(): void {
    this._displayValue = (this.party && this.party[this.displayProperty]) || this.defaultDisplayValue;
  }

  private valueIsPII(): boolean {
    if (this.isPIIInput === undefined) {
      if (this.party?.[this.displayProperty]) {
        return pii.includes(this.displayProperty);
      }
      return false;
    }
    return this.isPIIInput;
  }
}
