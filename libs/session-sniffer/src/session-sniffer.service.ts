import { 
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';

export const ACTIVITY_LOG_EVENT = 'activity.log';

export interface ActivityLogPayload {
    userId: string;
    url: string;
    method: string;
    responseTimeMs: number;
}

@Injectable()
export class SessionSnifferService implements NestInterceptor {
    private readonly logger = new Logger(SessionSnifferService.name);

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {

        const req = context.switchToHttp().getRequest();
        const start = performance.now();

        return next.handle().pipe(
            tap(() => {
                const responseTimeMs = performance.now() - start;

                const userId = req.user?.id || 'ANONYMOUS';
                this.logger.debug(`user ID from request: ${userId}`);
                const payload: ActivityLogPayload = {
                    userId,
                    url: req.originalUrl,
                    method: req.method,
                    responseTimeMs
                };

                if (req.method.toUpperCase() !== 'GET') {
                    this.logger.debug(`Emitting activity log event with payload: ${JSON.stringify(payload)}`);

                    this.eventEmitter.emit(ACTIVITY_LOG_EVENT, payload);
                }
            })
        )
    }
}
