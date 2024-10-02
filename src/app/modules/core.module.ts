import { ModuleWithProviders, NgModule }       from '@angular/core';
import { CommonModule }      from '@angular/common';

import { LocalizationModule }   from './localization.module';
import { LocalizeRouterModule }   from '@gilsdav/ngx-translate-router';


@NgModule({
  imports: [ 
    LocalizationModule, CommonModule, LocalizeRouterModule
  ],
  // Make available by all modules
  exports: [
    LocalizationModule, CommonModule, LocalizeRouterModule
  ]
})

export class CoreModule {
  constructor (){}
  static forRoot(): ModuleWithProviders<any> {
      return {
          ngModule: CoreModule
      };
  }
}