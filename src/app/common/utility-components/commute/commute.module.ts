import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommuteComponent } from './commute.component';
import { CommutePropagateStyles } from './commute-propagate-styles.directive';
import { CommuteContent } from './commute-content.directive';
import { CommutePlaceholder } from './commute-placeholder.directive';
import { CommuteTitle } from './commute-title.directive';
import { CommuteValue } from './commute-value.directive';
import { PipeModule } from '../../pipes/pipe.module';
import { CommuteLinkNewTab } from './commute-link-new-tab.directive';

@NgModule({
  imports: [TranslateModule, PipeModule],
  declarations: [
    CommuteComponent,
    CommuteContent,
    CommutePlaceholder,
    CommutePropagateStyles,
    CommuteTitle,
    CommuteValue,
    CommuteLinkNewTab,
  ],
  exports: [
    CommuteComponent,
    CommuteContent,
    CommutePlaceholder,
    CommutePropagateStyles,
    CommuteTitle,
    CommuteValue,
    CommuteLinkNewTab,
  ],
})
export class CommuteModule {}
