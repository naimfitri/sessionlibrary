# nestjs-audit-session

A NestJS library for automatic audit tracking of database entities. Automatically tracks who created and updated records, along with timestamps.

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
