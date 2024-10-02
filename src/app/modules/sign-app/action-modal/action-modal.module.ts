import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ActionModalComponent } from './action-modal.component';
import { CopyDocumentActionsContainerComponent, CopyDocumentActionsLayoutComponent } from '../copy-document';
import { TestDirectiveModule } from '../test-directive.module';
import { PipeModule } from '../../../common/pipes/pipe.module';
import { GeneralModalModule } from '../modal/modal.module';
import { TypographyModule } from '../typography/typography.module';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';

@NgModule({
  imports: [
    CommonModule,
    PipeModule,
    TranslateModule,
    TestDirectiveModule,
    GeneralModalModule,
    TypographyModule,
    CommuteModule,
  ],
  declarations: [ActionModalComponent, CopyDocumentActionsLayoutComponent, CopyDocumentActionsContainerComponent],
  exports: [ActionModalComponent],
  providers: [CurrencyPipe],
})
export class ActionModalModule {}
