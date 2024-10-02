import { Directive, ElementRef, Input, Renderer2, Inject } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

@Directive({
  selector: '[comPlaceholder]'
})
export class CommutePlaceholder {
  @Input('params') params: any;
  @Input('comPlaceholder') placeholder: string;
  @Input('extraText') extraText: string;

  constructor(@Inject(TranslateService) private translate: TranslateService,
    private el: ElementRef, private renderer: Renderer2) {
  }

  ngOnInit() {
    this.translate.get(this.placeholder, this.params).subscribe( (translation) => {
      if(this.extraText) {
        this.renderer.setAttribute(this.el.nativeElement, 'placeholder', translation + ' ' + this.extraText);
      } else {
        this.renderer.setAttribute(this.el.nativeElement, 'placeholder', translation);
      }
    });
  }
}