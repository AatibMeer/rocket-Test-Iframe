import { Directive, ElementRef, OnInit, Renderer2, HostListener } from '@angular/core';
import { DiffidentClassHelper } from '../class/diffident-class.directive';

@Directive({
  selector: '[rl-tooltip-host]'
})
export class TooltipHost implements OnInit {
  private readonly helper: DiffidentClassHelper;
  private toggled: boolean = false;

  constructor(elementRef: ElementRef, renderer: Renderer2) {
    this.helper = new DiffidentClassHelper(elementRef, renderer);
  }

  // Adds one class to handle non-encapsulated CSS bahvior.

  ngOnInit(): void {
    this.helper.setClassnames('tooltip-host');
  }
  
  // Touch event handling is just for iOS which has a problem with CSS :hover

  @HostListener('touchstart', ['$event'])
  onTouchStart($event){
    this.toggled = !this.toggled;
    if (this.toggled) {
      this.helper.setClassnames('touched', 'untouched');
    } else {
      this.helper.setClassnames('untouched', 'touched');
    }
  }
}
