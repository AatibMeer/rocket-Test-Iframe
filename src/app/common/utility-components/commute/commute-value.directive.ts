import { Directive, ElementRef, Input, Renderer2, Inject } from '@angular/core';
import {TranslateService} from '@ngx-translate/core';

@Directive({
  selector: '[comValue]'
})
export class CommuteValue {
constructor(@Inject(TranslateService) private translate: TranslateService,
  private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.translate.get(this.value).subscribe( (translation) => {
      this.renderer.setAttribute(this.el.nativeElement, 'value', translation);
    });
  }

  @Input('comValue') value: string;
}