# nestjs-session-log

A NestJS library for automatic activity logging via interceptors. Tracks user activity for non-GET HTTP requests and emits events for custom handling.

## Features

- 🔍 **Automatic activity logging** for non-GET requests (POST, PUT, DELETE, etc.)
- ⏱️ **Response time tracking** with high-resolution timer
- 📡 **Event-based architecture** using @nestjs/event-emitter
- 🎯 **Easy integration** with existing NestJS applications
- 🛠️ **Flexible** - handle events however you want (database, external API, etc.)

## Installation

```bash
npm install nestjs-session-log
```

## Quick Start

### 1. Import the Module

In your root module (e.g., `app.module.ts`), import the `LogModule`:

```typescript
import { Module } from '@nestjs/common';
import { LogModule } from 'nestjs-session-log';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    LogModule.forRoot(),
    // ... other imports
  ],
})
export class AppModule {}
```

### 2. Apply the Interceptor

Apply the `ActivityLogInterceptor` to your controllers or globally:

**Option A: Global (recommended)**

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ActivityLogInterceptor } from 'nestjs-session-log';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
  ],
})
export class AppModule {}
```

**Option B: Controller Level**

```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { ActivityLogInterceptor } from 'nestjs-session-log';

@Controller('users')
@UseInterceptors(ActivityLogInterceptor)
export class UsersController {
  // Your controller methods
}
```

### 3. Create an Event Listener

Create a listener to handle the activity log events:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { 
  ACTIVITY_LOG_EVENT, 
  ActivityLogPayload 
} from 'nestjs-session-log';
import { ActivityLog } from './activity-log.entity';

@Injectable()
export class ActivityLogListener {
  private readonly logger = new Logger(ActivityLogListener.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepository: Repository<ActivityLog>,
    private readonly clsService: ClsService, // For CLS context
  ) {}

  @OnEvent(ACTIVITY_LOG_EVENT)
  async handleLogEvent(payload: ActivityLogPayload) {
    this.logger.log(
      `Activity: User ${payload.userId} - ${payload.processType} ${payload.url} (${payload.responseTimeMs.toFixed(2)}ms)`
    );
    
    try {
      // If you're using nestjs-audit-session, wrap the save in CLS context
      await this.clsService.run(async () => {
        this.clsService.set('userId', payload.userId);
        const log = this.logRepository.create(payload);
        await this.logRepository.save(log);
      });
    } catch (error) {
      this.logger.error('Failed to save activity log', error);
    }
  }
}
```

### 4. Create the Entity

Create an entity to store the activity logs:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditedEntity } from 'nestjs-audit-session'; // Optional

@Entity('activity_logs')
export class ActivityLog extends AuditedEntity { // Or extend your base entity
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  url: string;

  @Column()
  processType: string;

  @Column('decimal', { precision: 10, scale: 2 })
  responseTimeMs: number;
}
```

## How It Works

1. **Interceptor captures requests**: The `ActivityLogInterceptor` intercepts all HTTP requests
2. **Filters GET requests**: Only non-GET requests (POST, PUT, DELETE, PATCH, etc.) are logged
3. **Extracts user information**: Gets user ID from `req.user.id` (or 'ANONYMOUS' if not authenticated)
4. **Measures response time**: Uses high-resolution timer to track request duration
5. **Emits event**: Publishes an event with the activity data
6. **Your listener handles it**: You decide how to store or process the logs

## Event Payload

The `ActivityLogPayload` interface includes:

```typescript
interface ActivityLogPayload {
  userId: string;          // User ID from req.user.id or 'ANONYMOUS'
  url: string;             // Request URL (req.originalUrl)
  processType: string;     // HTTP method (GET, POST, PUT, DELETE, etc.)
  responseTimeMs: number;  // Response time in milliseconds
}
```

## Advanced Usage

### Custom User ID Extraction

The interceptor looks for `req.user.id` by default. If your authentication stores user data differently, you may need to modify your authentication middleware to ensure `req.user.id` is set.

### Filtering Specific Routes

If you want to exclude certain routes from logging, you can create a custom interceptor:

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ActivityLogInterceptor } from 'nestjs-session-log';

@Injectable()
export class CustomActivityLogInterceptor extends ActivityLogInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    
    // Skip logging for health check endpoints
    if (req.url.startsWith('/health')) {
      return next.handle();
    }
    
    return super.intercept(context, next);
  }
}
```

### Using with nestjs-cls

The library works seamlessly with `nestjs-cls` for request context management. If you're using `nestjs-audit-session`, make sure to wrap your save operations in CLS context as shown in the listener example above.

### Logging to External Services

You can send logs to external services instead of (or in addition to) your database:

```typescript
@OnEvent(ACTIVITY_LOG_EVENT)
async handleLogEvent(payload: ActivityLogPayload) {
  // Send to external logging service
  await this.httpService.post('https://logs.example.com/api/logs', payload);
  
  // Or send to message queue
  await this.rabbitMQService.publish('activity.logs', payload);
  
  // Or both database and external
  await Promise.all([
    this.saveToDatabase(payload),
    this.sendToExternalService(payload),
  ]);
}
```

## Configuration Options

### Module Configuration

```typescript
LogModule.forRoot()
```

The module is currently simple and doesn't require configuration options. Future versions may add:
- Custom user extraction function
- Route filtering patterns
- Response time thresholds
- Custom event names

## Integration with nestjs-audit-session

If you're using `nestjs-audit-session` for entity auditing, you need to preserve the CLS context when saving activity logs:

```typescript
import { ClsService } from 'nestjs-cls';

@OnEvent(ACTIVITY_LOG_EVENT)
async handleLogEvent(payload: ActivityLogPayload) {
  // Wrap in CLS context to preserve userId for audit tracking
  await this.clsService.run(async () => {
    this.clsService.set('userId', payload.userId);
    const log = this.logRepository.create(payload);
    await this.logRepository.save(log);
  });
}
```

This ensures that the `createdBy` and `updatedBy` fields in your activity log entity are properly populated.

## Troubleshooting

### User ID is always 'ANONYMOUS'

**Problem:** The `userId` in logs is always 'ANONYMOUS' even for authenticated requests.

**Solutions:**
1. Verify your authentication middleware sets `req.user.id`
2. Check that authentication middleware runs before the interceptor
3. Add debug logging to see what's in `req.user`:
   ```typescript
   console.log('req.user:', req.user);
   ```

### Events not being received

**Problem:** The activity log events are emitted but not received by your listener.

**Solutions:**
1. Ensure `EventEmitterModule.forRoot()` is imported in your module
2. Verify your listener is a provider in your module
3. Check that the event name matches: `ACTIVITY_LOG_EVENT`
4. Make sure your listener method has the `@OnEvent()` decorator

### CLS userId is undefined

**Problem:** When saving to database with `nestjs-audit-session`, the `createdBy` field is NULL.

**Solution:** Wrap your save operation in CLS context:
```typescript
await this.clsService.run(async () => {
  this.clsService.set('userId', payload.userId);
  await this.logRepository.save(log);
});
```

## API Reference

### `ActivityLogInterceptor`

Interceptor that captures activity for non-GET requests.

**Behavior:**
- Captures all HTTP requests
- Filters out GET requests (only logs mutations)
- Extracts user ID from `req.user.id`
- Measures response time with `performance.now()`
- Emits `ACTIVITY_LOG_EVENT` with payload

### `ACTIVITY_LOG_EVENT`

Constant string: `'activity.log'`

Use this constant when creating event listeners.

### `ActivityLogPayload`

Interface for the event payload.

```typescript
interface ActivityLogPayload {
  userId: string;
  url: string;
  processType: string;
  responseTimeMs: number;
}
```

### `LogModule`

The main module that provides the interceptor.

**Methods:**
- `forRoot()`: Static method to configure the module

## Complete Example

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LogModule, ActivityLogInterceptor } from 'nestjs-session-log';
import { ClsModule } from 'nestjs-cls';
import { ActivityLog } from './activity-log.entity';
import { ActivityLogListener } from './activity-log.listener';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* config */ }),
    TypeOrmModule.forFeature([ActivityLog]),
    EventEmitterModule.forRoot(),
    ClsModule.forRoot({ /* config */ }),
    LogModule.forRoot(),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLogInterceptor,
    },
    ActivityLogListener,
  ],
})
export class AppModule {}

// activity-log.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditedEntity } from 'nestjs-audit-session';

@Entity('activity_logs')
export class ActivityLog extends AuditedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  url: string;

  @Column()
  processType: string;

  @Column('decimal', { precision: 10, scale: 2 })
  responseTimeMs: number;
}

// activity-log.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClsService } from 'nestjs-cls';
import { ACTIVITY_LOG_EVENT, ActivityLogPayload } from 'nestjs-session-log';
import { ActivityLog } from './activity-log.entity';

@Injectable()
export class ActivityLogListener {
  private readonly logger = new Logger(ActivityLogListener.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly logRepository: Repository<ActivityLog>,
    private readonly clsService: ClsService,
  ) {}

  @OnEvent(ACTIVITY_LOG_EVENT)
  async handleLogEvent(payload: ActivityLogPayload) {
    this.logger.log(
      `User ${payload.userId} - ${payload.processType} ${payload.url} (${payload.responseTimeMs.toFixed(2)}ms)`
    );
    
    try {
      await this.clsService.run(async () => {
        this.clsService.set('userId', payload.userId);
        const log = this.logRepository.create(payload);
        await this.logRepository.save(log);
      });
    } catch (error) {
      this.logger.error('Failed to save activity log', error);
    }
  }
}
```

## License

This library is part of the sessionlibrary project.

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/naimfitri/sessionlibrary).

## Features

- 🔍 **Automatic tracking** of `createdBy` and `updatedBy` fields
- ⏰ **Timestamp tracking** with `auditCreatedAt` and `auditUpdatedAt`
- 🔄 **Works with HTTP requests** - automatically captures user from request context
- 🛠️ **Background task support** - manual context for non-HTTP operations
- 🎯 **TypeORM integration** - uses entity subscribers for seamless tracking

## Installation

```bash
npm install nestjs-audit-session
```

## Quick Start

### 1. Configure the Module

In your root module (e.g., `app.module.ts`), import and configure the `AuditModule`:

```typescript
import { Module } from '@nestjs/common';
import { AuditModule } from 'nestjs-audit-session';

@Module({
  imports: [
    // ... other imports
    
    AuditModule.forRootAsync({
      useFactory: () => ({
        getUserIdFromRequest: (req) => {
          // Extract user ID from your request object
          // This depends on how you store authentication info
          return req.user?.id || req.session?.userId;
        }
      })
    }),
  ],
})
export class AppModule {}
```

### 2. Extend Your Entities

Make your entities extend `AuditedEntity`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditedEntity } from 'nestjs-audit-session';

@Entity()
export class User extends AuditedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;
  
  // The following fields are inherited from AuditedEntity:
  // - createdBy?: string
  // - updatedBy?: string
  // - auditCreatedAt: Date
  // - auditUpdatedAt: Date
}
```

### 3. Use Repository Methods

The audit tracking works automatically when you use TypeORM's entity-based methods:

```typescript
// ✅ INSERT - Automatically tracks createdBy and updatedBy
const user = this.userRepo.create({
  name: 'John Doe',
  email: 'john@example.com'
});
await this.userRepo.save(user);
// Result: createdBy and updatedBy are set to current user's ID

// ✅ UPDATE - Automatically tracks updatedBy
const user = await this.userRepo.findOne({ where: { id: 1 } });
user.name = 'Jane Doe';
await this.userRepo.save(user);
// Result: updatedBy is updated to current user's ID

// ❌ This does NOT trigger audit tracking
await this.userRepo.update({ id: 1 }, { name: 'Jane' });
```

## Important: Repository Methods

The audit subscriber only works with **entity-based methods**:

### ✅ Methods that trigger audit tracking:
- `repository.save(entity)` - For INSERT and UPDATE
- `repository.insert(entity)` - For INSERT only
- `repository.remove(entity)` - For DELETE

### ❌ Methods that DON'T trigger audit tracking:
- `repository.update(criteria, partialEntity)` - Direct SQL UPDATE
- `repository.delete(criteria)` - Direct SQL DELETE
- QueryBuilder operations - Direct SQL queries

**Always use `save()` for updates** to ensure audit tracking works!

## Database Schema

When you extend `AuditedEntity`, these columns are added to your table:

| Column Name       | Type      | Nullable | Description                          |
|-------------------|-----------|----------|--------------------------------------|
| `audit_created_at`| timestamp | No       | When the record was created          |
| `audit_updated_at`| timestamp | No       | When the record was last updated     |
| `created_by`      | varchar   | Yes      | User ID who created the record       |
| `updated_by`      | varchar   | Yes      | User ID who last updated the record  |

**Note:** Due to TypeScript inheritance, these audit columns will appear before your entity's columns in the database. This is cosmetic and doesn't affect functionality.

## Advanced Usage

### Background Tasks and Cron Jobs

For operations outside of HTTP requests (background tasks, cron jobs, etc.), you need to manually provide the audit context:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditService } from 'nestjs-audit-session';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  constructor(
    private readonly auditService: AuditService,
    private readonly userRepo: Repository<User>,
  ) {}

  @Cron('0 0 * * *')
  async dailyCleanup() {
    // Option 1: Run as SYSTEM user
    await this.auditService.runAsSystem(async () => {
      const users = await this.userRepo.find({ where: { active: false } });
      users.forEach(user => user.status = 'archived');
      await this.userRepo.save(users);
      // createdBy/updatedBy will be set to 'SYSTEM'
    });

    // Option 2: Run with a specific user ID
    await this.auditService.runWithUser('ADMIN_USER_ID', async () => {
      // Your database operations here
      await this.userRepo.save(entity);
      // createdBy/updatedBy will be set to 'ADMIN_USER_ID'
    });
  }
}
```

### Custom User ID Extraction

You can customize how the user ID is extracted from requests:

```typescript
AuditModule.forRootAsync({
  useFactory: () => ({
    getUserIdFromRequest: (req) => {
      // From JWT token
      if (req.user?.sub) {
        return req.user.sub;
      }
      
      // From session
      if (req.session?.userId) {
        return req.session.userId;
      }
      
      // From custom header
      if (req.headers['x-user-id']) {
        return req.headers['x-user-id'];
      }
      
      // Default to anonymous
      return 'ANONYMOUS';
    }
  })
})
```

### Dependency Injection

If you need to inject services to extract the user ID:

```typescript
import { ConfigService } from '@nestjs/config';

AuditModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    getUserIdFromRequest: (req) => {
      // Use injected services
      const userIdHeader = configService.get('USER_ID_HEADER');
      return req.headers[userIdHeader] || req.user?.id;
    }
  })
})
```

## Troubleshooting

### Audit fields are NULL

**Problem:** `createdBy` and `updatedBy` are always NULL.

**Solutions:**
1. Make sure you're using `repository.save()` and not `repository.update()`
2. Verify `getUserIdFromRequest` is returning a value (add console.log to debug)
3. Check that your entity extends `AuditedEntity`
4. Ensure the operation is happening in an HTTP request context (or use `AuditService` for background tasks)

### TypeScript errors about missing properties

**Problem:** TypeScript complains about `createdBy`, `updatedBy`, etc.

**Solution:** Make sure your entity extends `AuditedEntity`:
```typescript
export class MyEntity extends AuditedEntity { // ← Must extend
  // ...
}
```

### Columns appear in wrong order

**Problem:** The `id` column appears after audit columns in the database.

**This is expected behavior** due to TypeScript inheritance. The audit columns from the parent class are processed first. This is purely cosmetic and doesn't affect functionality. Your application will work perfectly regardless of column order.

## API Reference

### `AuditedEntity`

Abstract base class that adds audit fields to your entity.

**Fields:**
- `auditCreatedAt: Date` - Automatically set when entity is created
- `auditUpdatedAt: Date` - Automatically updated when entity is saved
- `createdBy?: string` - User ID who created the record
- `updatedBy?: string` - User ID who last updated the record

### `AuditModule.forRootAsync(options)`

Configure the audit module.

**Options:**
- `imports?: any[]` - Optional modules to import
- `inject?: any[]` - Optional services to inject into useFactory
- `useFactory: (...args) => AuditModuleOptions` - Factory function to create configuration

**AuditModuleOptions:**
- `getUserIdFromRequest: (req: any) => string | undefined` - Function to extract user ID from request

### `AuditService`

Service for manual audit context management.

**Methods:**

#### `runWithUser<T>(userId: string, fn: () => Promise<T>): Promise<T>`
Execute a function with a specific user ID in the audit context.

```typescript
await this.auditService.runWithUser('USER_123', async () => {
  await this.repo.save(entity);
});
```

#### `runAsSystem<T>(fn: () => Promise<T>): Promise<T>`
Execute a function with 'SYSTEM' as the user ID.

```typescript
await this.auditService.runAsSystem(async () => {
  await this.repo.save(entity);
});
```

## Examples

### Complete Example

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from 'nestjs-audit-session';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // your database config
    }),
    AuditModule.forRootAsync({
      useFactory: () => ({
        getUserIdFromRequest: (req) => req.user?.id
      })
    }),
  ],
})
export class AppModule {}

// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AuditedEntity } from 'nestjs-audit-session';

@Entity()
export class User extends AuditedEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;
}

// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async createUser(username: string): Promise<User> {
    const user = this.userRepo.create({ username });
    return await this.userRepo.save(user);
    // createdBy and updatedBy are automatically set!
  }

  async updateUser(id: number, username: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    user.username = username;
    return await this.userRepo.save(user);
    // updatedBy is automatically updated!
  }
}
```

## License

This library is part of the sessionlibrary project.

## Support

For issues and questions, please open an issue on the [GitHub repository](https://github.com/naimfitri/sessionlibrary).
