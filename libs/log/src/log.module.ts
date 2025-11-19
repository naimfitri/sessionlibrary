import { DynamicModule, Global, Module } from '@nestjs/common';
import { ActivityLogInterceptor, LOG_REDIS_SERVICE } from './log.middleware';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { LogRedisService } from './log-redis.service';

export interface LogModuleRedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface LogModuleOptions {
  redis?: LogModuleRedisOptions;
  broadcast?: boolean;
}

@Global()
@Module({})
export class LogModule {
  static forRoot(options?: LogModuleOptions): DynamicModule {
    const providers: any[] = [ActivityLogInterceptor];

    // Add Redis service if broadcast is enabled
    if (options?.redis && options?.broadcast) {
      providers.push({
        provide: LOG_REDIS_SERVICE,
        useFactory: (eventEmitter: EventEmitter2) => {
          return new LogRedisService(eventEmitter, options.redis!);
        },
        inject: [EventEmitter2],
      });
    }

    return {
      module: LogModule,
      imports: [EventEmitterModule.forRoot()],
      providers,
      exports: [ActivityLogInterceptor, LOG_REDIS_SERVICE],
      global: true,
    };
  }
}
