import {Directive, ElementRef, AfterViewInit} from '@angular/core'

 /**
 * @desc The directive bypassess Angular's ViewEncapsulation including _ngcontent-X attribute to children.
 *       Add the directive to comContent then component styles file affects elements in translation
 * @example <span [comContent]="'Manager-component_binder-canceled-with-reason'"
 *                   [params]="{name:entry?.details?.legalName, reason:entry.details.message}" propagateStyles></span>
 */
@Directive({
    selector: '[propagateStyles]'
})
export class CommutePropagateStyles implements AfterViewInit {

    constructor(private elementRef: ElementRef) {
    }

    ngAfterViewInit(): void {
        let nativeElement: Element = this.elementRef.nativeElement;
        if (nativeElement.children.length > 0) {
            this.assignEncapsulationAttributes(nativeElement);
        }
    }

    assignEncapsulationAttributes(nativeElement: Element) {
        let parentNgContentId = this.findNgContentId(nativeElement);
        Array.from(nativeElement.children).forEach((child:Element) => {
          child.setAttribute("_ngcontent-" + parentNgContentId, "");
        });
    }

    findNgContentId(nativeElement) {
      let ngContent: string = (<Node>(Array.from(nativeElement.attributes)
        .find((attribute:Node) => attribute.nodeName.startsWith('_ngcontent'))))
        .nodeName;
      return ngContent.substring(ngContent.indexOf('-') + 1);
    }
}