import { 
  Module,
  DynamicModule,
  Global,
  Inject,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
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
class ClsUserInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: ClsService,
    @Inject(AUDIT_MODULE_OPTIONS)
    private readonly options: AuditModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    let userId: string | undefined;

    if (req && typeof this.options.getUserIdFromRequest === 'function') {
      userId = this.options.getUserIdFromRequest(req);
    }

    this.cls.set('userId', userId ?? null);

    return next.handle();
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
      imports: [ClsModule, ...(options.imports || [])],
      providers: [AuditSubscriber, optionsProvider, interceptorProvider],
    };
  }
}
