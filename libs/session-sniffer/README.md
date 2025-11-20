# NestJS Session Sniffer

A powerful NestJS library that automatically intercepts HTTP requests, logs user activity to your primary database (via TypeORM), and syncs logs to Elasticsearch for advanced analytics.

## Features

- 🕵️ **Automatic Interception**: Captures every HTTP request (Method, URL, Response Time, User ID).
- 🗄️ **Database Integration**: seamless integration with your existing TypeORM connection.
- 🔍 **Elasticsearch Sync**: Automatically indexes logs to Elasticsearch for search and visualization.
- ⚡ **Performance**: Uses nestjs-cls for context management and asynchronous event emitters to avoid blocking the main thread.

## Installation

npm install nestjs-session-sniffer  

### Peer Dependencies

Ensure you have the following peer dependencies installed in your host application:
```bash
npm install @nestjs/typeorm typeorm @nestjs/elasticsearch @nestjs/event-emitter nestjs-cls  
```

## Configuration

This library relies on your application's existing database connection. You do **not** need to configure a separate database connection for this library.

### 1\. Update Your AppModule

You need to:

- Register the ActivityLog entity in your TypeORM config.
- Import SessionSnifferModule.
- Configure ElasticConfigModule.
- Bind the global interceptor.

```typescript
// src/app.module.ts  
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  SessionSnifferModule,
  ElasticConfigModule,
  SessionSnifferService,
  ActivityLog,
} from 'nestjs-session-sniffer';

@Module({
  imports: [
    // 1. Required: Event Emitter
    EventEmitterModule.forRoot(),

    // 2. Database Configuration
    TypeOrmModule.forRoot({
      type: 'mysql', // or postgres, mariadb, etc.
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'my_app_db',
      // IMPORTANT: Register the library entity here
      entities: [ActivityLog, /* ... your other entities */],
      synchronize: true, // Set to false in production
    }),

    // 3. Elasticsearch Configuration (Optional but recommended)
    ElasticConfigModule.forRoot({
      elasticUrl: process.env.ELASTIC_NODE || 'http://localhost:9200',
    }),

    // 4. Import the Main Module
    SessionSnifferModule,
  ],
  providers: [
    // 5. Register the Interceptor Globally
    {
      provide: APP_INTERCEPTOR,
      useClass: SessionSnifferService,
    },
  ],
})
export class AppModule {}

```
## Elasticsearch Setup

This library automatically pushes logs to an Elasticsearch index named activity-logs-YYYY-MM-DD.

### Configuration Options

The ElasticConfigModule.forRoot() method accepts a simple configuration object:

```typescript
ElasticConfigModule.forRoot({  
    elasticUrl: 'http://localhost:9200', // URL of your Elasticsearch node  
})  
```

### Automatic Indexing

When a request is intercepted:

- The log is saved to your SQL database (activity_logs table).
- The same payload is asynchronously sent to Elasticsearch.
- Indices are automatically rotated daily (e.g., activity-logs-2023-10-25).

### Handling Connection Failures

If Elasticsearch is down or unreachable:

- The library will log a warning to the console.
- The operation **will not fail**; the log will still be saved to your primary database.
- Your API response will not be affected.

## How It Works

- **Interception**: The SessionSnifferService intercepts incoming requests.
- **Context**: It extracts the userId from the request (requires req.user.id to be populated by your Auth guard) or defaults to 'ANONYMOUS'.
- **Timing**: It calculates the execution time of the request.
- **Event Emission**: It emits an activity.log event via EventEmitter2.
- **Persistence**: The InsertLogSniffer listens for this event and saves the data to both TypeORM and Elasticsearch.

## Troubleshooting

### "No metadata for 'ActivityLog' was found"

**Solution**: Ensure you have imported the ActivityLog entity in your AppModule's TypeOrmModule.forRoot({ entities: \[ActivityLog\] }).

### "Nest can't resolve dependencies of SessionSnifferService (EventEmitter)"

**Solution**: Ensure EventEmitterModule.forRoot() is imported in your AppModule.

### Elasticsearch logs are not appearing

- Check if your Elasticsearch instance is running.
- Ensure the elasticUrl is correct.
- Logs are only sent for non-GET requests by default (check session-sniffer.service.ts logic).