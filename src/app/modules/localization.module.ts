import { NgModule }           from '@angular/core';
import { CommonModule }        from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { LocalizationService } from '../services/common/localization.service';

import { LocalizeRouterModule } from '@gilsdav/ngx-translate-router';
import { CommuteModule } from '../common/utility-components/commute/commute.module';
import { PipeModule } from '../common/pipes/pipe.module';

@NgModule({
  imports: [
    CommonModule,
    TranslateModule,
    LocalizeRouterModule,
    PipeModule,
    CommuteModule
  ],
  declarations: [
  ],
  providers: [ LocalizationService ],
  exports: [
    TranslateModule,
    LocalizeRouterModule,
    CommuteModule,
    PipeModule
  ]
})
export class LocalizationModule { }