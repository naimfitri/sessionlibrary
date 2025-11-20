import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const ACTIVITY_LOG_EVENT = 'activity.log';
export const LOG_REDIS_SERVICE = 'LOG_REDIS_SERVICE';

export interface ActivityLogPayload {
  userId: string;
  url: string;
  method: string;
  responseTimeMs: number;
}

export interface ILogRedisService {
  publishEvent(payload: ActivityLogPayload): Promise<void>;
}

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ActivityLogInterceptor.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Optional() @Inject(LOG_REDIS_SERVICE) private readonly redisService?: ILogRedisService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = performance.now(); 

    return next.handle().pipe(
      tap(() => {
        const responseTimeMs = performance.now() - start;

        const userId = req.user?.id || 'ANONYMOUS';
        this.logger.debug(`getUserIdFromRequest returned: ${userId}`);
        const payload: ActivityLogPayload = {
          userId,
          url: req.originalUrl,
          method: req.method,
          responseTimeMs
        };

        if (req.method.toUpperCase() !== 'GET') {
          this.logger.debug(`Emitting activity log event with payload: ${JSON.stringify(payload)}`);
          
          // Publish to Redis if available (for distributed systems)
          if (this.redisService) {
            this.logger.debug(`Publishing to Redis via redisService`);
            this.redisService.publishEvent(payload).catch((error) => {
              this.logger.error('Failed to publish to Redis', error);
            });
          } else {
            this.logger.debug('No Redis service, emitting locally only');
            // Emit locally only
            this.eventEmitter.emit(ACTIVITY_LOG_EVENT, payload);
          }
        }
      })
    );
  }
}
