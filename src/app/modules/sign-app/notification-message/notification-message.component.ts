/* eslint-disable max-classes-per-file */
import { Component, OnInit, Input, NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationMessageService, NotificationMessage } from '../../../services/sign-app/notification.service';
import { CommuteModule } from '../../../common/utility-components/commute/commute.module';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'notification-message',
  templateUrl: './notification-message.component.html',
  styleUrls: ['./notification-message.component.scss'],
})
export class NotificationMessageComponent implements OnInit {
  constructor(private notificationService: NotificationMessageService) {}
  notification: NotificationMessage = null;
  @Input() pushDown = false;

  ngOnInit() {
    this.notificationService.notificationChanges.subscribe((data) => (this.notification = data));
  }

  hideNotification() {
    this.notification = null;
  }
}

@NgModule({
  imports: [TranslateModule, CommuteModule, CommonModule],
  declarations: [NotificationMessageComponent],
  providers: [NotificationMessageService],
  exports: [NotificationMessageComponent],
})
export class NotificationMessageModule {}
