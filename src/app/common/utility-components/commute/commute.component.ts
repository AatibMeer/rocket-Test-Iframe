import { Component, Input } from '@angular/core';

@Component({
  selector: 'com',
  template: `
    {{ key | translate:params }}
  `,
  styles: []
})
export class CommuteComponent {
  @Input() key: string;
  @Input() params: any;
  constructor() {
  }
}
