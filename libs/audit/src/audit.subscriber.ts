import {
    DataSource,
    EntitySubscriberInterface,
    InsertEvent,
    UpdateEvent,
} from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuditSubscriber implements EntitySubscriberInterface {
    private readonly logger = new Logger(AuditSubscriber.name);

    constructor(
        dataSource: DataSource,
        private readonly cls: ClsService,
    ) {
        dataSource.subscribers.push(this);
        this.logger.log('AuditSubscriber initialized and registered');
    }

    beforeInsert(event: InsertEvent<any>) {
        try {
            const userId = this.cls.get('userId');
            const clsId = this.cls.getId();
            this.logger.debug(`beforeInsert - CLS ID: ${clsId}, userId from CLS: ${userId}`);
            
            if (!userId) {
                this.logger.warn(`No userId found in CLS context (CLS ID: ${clsId})`);
                return;
            }

            if (event.entity) {
                if ('createdBy' in event.entity) {
                    (event.entity as any).createdBy = userId;
                    this.logger.debug(`Set createdBy to: ${userId}`);
                }
                if ('updatedBy' in event.entity) {
                    (event.entity as any).updatedBy = userId;
                    this.logger.debug(`Set updatedBy to: ${userId}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error in beforeInsert: ${error.message}`);
        }
    }

    beforeUpdate(event: UpdateEvent<any>) {
        try {
            const userId = this.cls.get('userId');
            const clsId = this.cls.getId();
            this.logger.debug(`beforeUpdate - CLS ID: ${clsId}, userId from CLS: ${userId}`);
            
            if (!userId) {
                this.logger.warn(`No userId found in CLS context (CLS ID: ${clsId})`);
                return;
            }

            if (event.entity) {
                if ('updatedBy' in event.entity) {
                    (event.entity as any).updatedBy = userId;
                    this.logger.debug(`Set updatedBy to: ${userId}`);
                }
            }
        } catch (error) {
            this.logger.error(`Error in beforeUpdate: ${error.message}`);
        }
    }
}