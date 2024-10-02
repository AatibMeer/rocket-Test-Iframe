import { Directive, ElementRef, Input, Inject, SecurityContext, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {TranslateService} from '@ngx-translate/core';

@Directive({
  selector: '[comContent]'
})
export class CommuteContent implements OnInit {
  constructor(
    @Inject(TranslateService) private translate: TranslateService,
    private sanitizer: DomSanitizer,
    private elementRef: ElementRef) {
  }

  ngOnInit() {
    this.translate.get(this.content, this.params).subscribe( (translation) => {
      var sanitized = this.sanitizer.sanitize(SecurityContext.HTML, translation);
      this.elementRef.nativeElement.innerHTML = sanitized;
    });
  }

  @Input('comContent') content: string;
  @Input() params: any;

}
