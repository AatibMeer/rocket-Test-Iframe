import { Injectable, EventEmitter } from '@angular/core';

@Injectable()
export class NotificationMessageService {

    static instance: NotificationMessageService; // temp fix for singleton
    notification: NotificationMessage = null;
    notificationChanges: EventEmitter<NotificationMessage> = new EventEmitter();

    constructor(){
        return NotificationMessageService.instance = NotificationMessageService.instance || this; // temp fix for singleton
    }

    // closes the last alert
    // adds backward compatibility for components that use this method
    closeNotification() {
        this.notification = null;
        this.notificationChanges.emit(this.notification);
    }

    setNotification(msgData: NotificationMessage) {
        this.notification = {
            key: msgData.key,
            params: msgData.params,
            mobileKey: msgData.mobileKey,
            autoClose: msgData.autoClose
        };
        this.notificationChanges.emit(this.notification);
        if(msgData.autoClose) {
          setTimeout(() => { this.closeNotification(); }, 3000);
        }
    }
}

export interface NotificationMessage {
    key: string,
    params?: Object,
    mobileKey?: string,
    mobileParams?: any,
    autoClose?: boolean
}