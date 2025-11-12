import { 
  Module,
  DynamicModule,
  Global,
  Inject,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditSubscriber } from './audit.subscriber';
import { AuditService } from './audit.service';

export interface AuditModuleOptions {
  getUserIdFromRequest: (req: any) => string | undefined;
}

const AUDIT_MODULE_OPTIONS = 'AUDIT_MODULE_OPTIONS';

@Injectable()
export class ClsUserInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ClsUserInterceptor.name);

  constructor(
    private readonly cls: ClsService,
    @Inject(AUDIT_MODULE_OPTIONS)
    private readonly options: AuditModuleOptions,
  ) {
    this.logger.log('ClsUserInterceptor initialized');
  }

  intercept(context: ExecutionContext, next: CallHandler) {
    this.logger.debug('Interceptor called');
    // Run the entire request handler within a CLS context
    return this.cls.run(() => {
      const req = context.switchToHttp().getRequest();
      let userId: string | undefined;

      if (req && typeof this.options.getUserIdFromRequest === 'function') {
        userId = this.options.getUserIdFromRequest(req);
        this.logger.debug(`getUserIdFromRequest returned: ${userId}`);
        this.logger.debug(`Request user: ${JSON.stringify(req.user)}`);
      }

      this.cls.set('userId', userId ?? null);
      const clsId = this.cls.getId();
      this.logger.debug(`Set userId in CLS (ID: ${clsId}): ${userId ?? 'null'}`);

      return next.handle();
    });
  }
}
@Global()
@Module({})
export class AuditModule {
  static forRootAsync(options: {
    imports?: any[];
    useFactory: (...args: any[]) => AuditModuleOptions | Promise<AuditModuleOptions>;
    inject?: any[];
  }): DynamicModule {
    const optionsProvider = {
      provide:AUDIT_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const interceptorProvider = {
      provide: APP_INTERCEPTOR,
      useClass: ClsUserInterceptor,
    };

    return {
      module: AuditModule,
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: { 
            mount: false, // Disable middleware, use interceptor instead
          },
        }), 
        ...(options.imports || [])
      ],
      providers: [
        AuditSubscriber, 
        AuditService, 
        optionsProvider, 
        ClsUserInterceptor,
        interceptorProvider
      ],
      exports: [AuditSubscriber, AuditService],
    };
  }
}
