import {Component, ElementRef, Input, OnChanges, SimpleChanges} from '@angular/core';
import {isColor as isTypographyColor, TypographyColors} from '../typography/typography.component';
import {bem} from '../../../common/utility-components/util-functions';

const baseClass = 'rl-avatar';
const colorProperty = '--custom-avatar-color';

@Component({
    selector: 'rl-avatar',
    styleUrls: ['./avatar.component.scss'],
    templateUrl: './avatar.component.html'
})
export class AvatarComponent implements OnChanges {
    /**
     * Either a preset color from Typography or a CSS-compatible color code
     */
    @Input()
    color: TypographyColors | string | undefined;
    private readonly elementRef: ElementRef;
    private _rootClassnames: string;
    get rootClassnames(): string {
        return this._rootClassnames;
    }

    constructor(elementRef: ElementRef) {
        this.elementRef = elementRef;
        this._rootClassnames = baseClass;
    }

    ngOnChanges({color}: SimpleChanges): void {
        if (color) {
            this.setCustomColor(color.currentValue);
        }
    }

    private removeCustomColor(): void {
        this._rootClassnames = baseClass;
        (this.elementRef.nativeElement as HTMLElement).style.removeProperty(colorProperty);
    }

    private setCustomColor(color: TypographyColors | string | undefined): void {
        if (!color) {
            return this.removeCustomColor();
        }
        const isCustomColor = !isTypographyColor(color);
        if (isCustomColor) {
            (this.elementRef.nativeElement as HTMLElement).style.setProperty(colorProperty, color);
        } else {
            this.removeCustomColor();
        }
        this._rootClassnames = bem(baseClass, {
            [`color-${color}`]: !isCustomColor
        });
    }
}
