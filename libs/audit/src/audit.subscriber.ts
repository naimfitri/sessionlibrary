import {
    DataSource,
    EntitySubscriberInterface,
    InsertEvent,
    UpdateEvent,
} from 'typeorm';

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
    constructor(
        dataSource: DataSource,
        private readonly cls: ClsService,
    ) {
        dataSource.subscribers.push(this);
    }

    beforeInsert(event: InsertEvent<any>) {
        const userId = this.cls.get<string>('userId');
        if (!userId) {
            return;
        }

        if (event.entity) {
            if ('createdBy' in event.entity) {
                (event.entity as any).createdBy = userId;
            }
            if ('updatedBy' in event.entity) {
                (event.entity as any).updateBy = userId;
            }
        }
    }

    beforeUpdate(event: UpdateEvent<any>) {
        const userId = this.cls.get<string>('userId');
        if (!userId) {
            return;
        }

        if (event.entity) {

            if ('updatedBy' in event.entity) {
                (event.entity as any).updatedBy = userId;
            }
        }
    }
}