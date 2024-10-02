import {
  Component,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  Renderer2,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import {bem} from '../../../common/utility-components/util-functions';
import {ClassInput, DiffidentClassHelper} from '../../../common/utility-components/class/diffident-class.directive';

const baseClass = 'rl-typography';

const boldModifier = 'bold';

export type TypographyColors =
  | 'alert'
  | 'error'
  | 'happy'
  | 'primary'
  | 'secondary';
export const typographyColors = Object.freeze<TypographyColors[]>([
  'alert',
  'error',
  'happy',
  'primary',
  'secondary'
]);
export function isColor(candidate: string): candidate is TypographyColors {
  return typographyColors.includes(candidate as TypographyColors);
}
function makeColorModifier(color: TypographyColors): string {
  return `color-${color}`;
}

export type TypographySizes =
  | 'small'
  | 'normalSize'
  | 'large'; // could add smaller, smallest etc but ask yourself "why? would a variant be better"
export const typographySizes = Object.freeze<TypographySizes[]>([
  'small',
  'normalSize',
  'large'
]);
export function isSize(candidate: string): candidate is TypographySizes {
  return typographySizes.includes(candidate as TypographySizes);
}
function makeSizeModifier(size: TypographySizes): string {
  return `size-${size}`;
}

export type TypographyVariants =
  | 'body'
  | 'button'
  | 'heading'
  | 'tooltip';
export const typographyVariants = Object.freeze<TypographyVariants[]>([
  'body',
  'button',
  'heading',
  'tooltip'
]);
export function isVariant(candidate: string): candidate is TypographyVariants {
  return typographyVariants.includes(candidate as TypographyVariants);
}
function makeVariantModifier(variant: TypographyVariants): string {
  return `variant-${variant}`;
}

const allModifiers = [
  `${baseClass}--${boldModifier}`,
  ...typographyColors.map((color) => `${baseClass}--${makeColorModifier(color)}`),
  ...typographySizes.map((size) => `${baseClass}--${makeSizeModifier(size)}`),
  ...typographyVariants.map((variant) => `${baseClass}--${makeVariantModifier(variant)}`)
];

const defaults: {
  bold: boolean,
  color: TypographyColors,
  size: TypographySizes,
  variant: TypographyVariants
} = {
  bold: false, // this one won't get set automatically; see setDefaults()
  color: 'secondary',
  size: 'normalSize',
  variant: 'body'
};

@Directive({
  selector: '[rl-typography]'
})
export class TypographyDirective implements OnChanges, OnInit {
  private _bold: boolean;
  get bold(): boolean {
    return this._bold;
  }
  @Input()
  set bold(bold: boolean | undefined) {
    this._bold = !!bold;
  };
  private readonly classHelper: DiffidentClassHelper;
  @Input('class')
  externalClassnames: ClassInput;
  @Input()
  color: TypographyColors;
  @Input()
  size: TypographySizes;
  @Input('rl-typography')
  typography: 'bold' | 'normalWeight' | TypographyColors | TypographySizes | TypographyVariants;
  @Input()
  variant: TypographyVariants;

  constructor(private readonly elementRef: ElementRef, private readonly renderer: Renderer2) {
    this.classHelper = new DiffidentClassHelper(elementRef, renderer);
  }

  private addClassnamesToRootElement(): void {
    // remove any existing classnames
    allModifiers.forEach((classname) => {
      this.renderer.removeClass(this.elementRef.nativeElement, classname);
    });

    // add new ones
    this.getClassnames().split(' ').slice(1).forEach((classname) => {
      this.renderer.addClass(this.elementRef.nativeElement, classname);
    });
  }

  private getClassnames(properties: Partial<Pick<TypographyDirective, 'bold' | 'color' | 'size' | 'variant'>> = this): string {
    const modifiers: Record<string, boolean> = {};
    if (properties.bold) {
      modifiers[boldModifier] = properties.bold;
    }
    if (properties.color) {
      const colorModifier = makeColorModifier(properties.color);
      modifiers[colorModifier] = true;
    }
    if (properties.size) {
      const sizeModifier = makeSizeModifier(properties.size);
      modifiers[sizeModifier] = true;
    }
    if (properties.variant) {
      const variantModifier = makeVariantModifier(properties.variant);
      modifiers[variantModifier] = true;
    }
    return bem(baseClass, modifiers);
  }

  ngOnChanges({bold, color, externalClassnames, size, typography, variant}: SimpleChanges): void {
    const enum InputType {
      bold,
      color,
      size,
      variant
    }
    let setByDefaultInput: InputType | undefined;
    if (typography) {
      if (typography.previousValue) {
        if (typography.previousValue === 'bold') {
          this.bold = false;
        } else if (isColor(typography.previousValue)) {
          this.setColor(undefined);
        } else if (isSize(typography.previousValue)) {
          this.setSize(undefined);
        } else if (isVariant(typography.previousValue)) {
          this.setVariant(undefined);
        }
      }

      if (typography.currentValue) {
        if (typography.currentValue === 'bold' || typography.currentValue === 'normalWeight') {
          this.bold = typography.currentValue === 'bold';
          setByDefaultInput = InputType.bold;
        } else if (isColor(typography.currentValue)) {
          this.setColor(typography.currentValue);
          setByDefaultInput = InputType.color;
        } else if (isSize(typography.currentValue)) {
          this.setSize(typography.currentValue);
          setByDefaultInput = InputType.size;
        } else if (isVariant(typography.currentValue)) {
          this.setVariant(typography.currentValue);
          setByDefaultInput = InputType.variant;
        }
      }
    }
    if (bold && (bold.currentValue || setByDefaultInput !== InputType.bold)) {
      this.bold = bold.currentValue;
    }
    if (color && (color.currentValue || setByDefaultInput !== InputType.color)) {
      this.setColor(color.currentValue);
    }
    if (size && (size.currentValue || setByDefaultInput !== InputType.size)) {
      this.setSize(size.currentValue);
    }
    if (variant && (variant.currentValue || setByDefaultInput !== InputType.variant)) {
      this.setVariant(variant.currentValue);
    }
    this.addClassnamesToRootElement();

    if (externalClassnames) {
      this.classHelper.setClassnames(externalClassnames.currentValue, externalClassnames.previousValue);
    }
  }

  ngOnInit(): void {
    this.setColor(this.color);
    this.setSize(this.size);
    this.setVariant(this.variant);
    this.renderer.addClass(this.elementRef.nativeElement, baseClass);
    this.addClassnamesToRootElement();
  }

  private setColor(color: string | undefined, defaultColor = defaults.color): void {
    this.color = color && isColor(color) ? color : defaultColor;
  }

  private setSize(size: string | undefined, defaultSize = defaults.size): void {
    this.size = size && isSize(size) ? size : defaultSize;
  }

  private setVariant(variant: string | undefined, defaultVariant = defaults.variant): void {
    this.variant = variant && isVariant(variant) ? variant : defaultVariant;
  }
}

@Component({
  encapsulation: ViewEncapsulation.None,
  selector: 'rl-typography',
  styleUrls: ['./typography.style.scss'],
  template: '<ng-content></ng-content>'
})
export class TypographyComponent extends TypographyDirective {}
