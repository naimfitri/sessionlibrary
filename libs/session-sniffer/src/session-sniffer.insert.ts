import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './session-sniffer.entity';
import { ClsService } from 'nestjs-cls';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ACTIVITY_LOG_EVENT } from './session-sniffer.service'; 
import type { ActivityLogPayload } from './session-sniffer.service';

@Injectable()
export class InsertLogSniffer {

    private readonly logger = new Logger(InsertLogSniffer.name);

    constructor(
        @InjectRepository(ActivityLog)
        private readonly logRepository: Repository<ActivityLog>,
        private readonly clsService: ClsService,
        private readonly elasticService: ElasticsearchService,
    ) {}

    @OnEvent(ACTIVITY_LOG_EVENT)
    async handleLogEvent(payload: ActivityLogPayload) {
        this.logger.log(`Caught log event for user: ${payload.userId}, URL: ${payload.url}`);

        try {
            await this.clsService.run(async () => {
                this.clsService.set('userId',payload.userId);
                const newLog = this.logRepository.create(payload);
                await this.logRepository.save(newLog);
            });
            this.logger.log('Save to MariaDB');
        } catch (e) {
            this.logger.error('Failed to save activity log to MariaDB', e);
        }

        try {

            const date = new Date().toISOString().split('T')[0];
            const indexName = `activity-logs-${date}`;

            if (this.elasticService) {
                await this.elasticService.index({
                    index: indexName,
                    body: {
                        ...payload,
                        timestamp: new Date().toISOString(),
                    },
                });

                this.logger.log('Saved to Elasticsearch');
            }
        } catch (e) {
            this.logger.warn('Elasticsearch not available, skipping ES save');
        }
    }

}