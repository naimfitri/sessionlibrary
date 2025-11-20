NestJS Session Libraries
A collection of three libraries for auditing, logging, and session sniffing in NestJS applications.

Installation
```bash
npm install nestjs-audit-session nestjs-session-log nestjs-session-sniffer
```
Overview
This monorepo contains three libraries:
- *nestjs-audit-session*: Tracks createdBy, updatedBy, and timestamps for TypeORM entities.
- *nestjs-session-log*: Interceptor-based logging for non-GET HTTP requests, emits events.
- *nestjs-session-sniffer*: Captures all HTTP requests and saves logs to DB and optionally Elasticsearch.

Usage
nestjs-audit-session
Tracks createdBy, updatedBy, and timestamps for TypeORM entities.

```Typescript
import { AuditSessionModule } from 'nestjs-audit-session';

@Module({
  imports: [AuditSessionModule],
})
export class AppModule {}

nestjs-session-log
Interceptor-based logging for non-GET HTTP requests, emits events.
import { SessionLogModule } from 'nestjs-session-log';

@Module({
  imports: [SessionLogModule],
})
export class AppModule {}

nestjs-session-sniffer
Captures all HTTP requests and saves logs to DB and optionally Elasticsearch.
import { SessionSnifferModule } from 'nestjs-session-sniffer';

@Module({
  imports: [SessionSnifferModule],
})
export class AppModule {}
```
Advanced Usage
For advanced usage, please refer to the individual library documentation.
- *nestjs-audit-session*: Use the `@Audit()` decorator to enable auditing on TypeORM entities.
- *nestjs-session-log*: Use the `SessionLogInterceptor` to log specific requests.
- *nestjs-session-sniffer*: Configure the `SessionSnifferModule` to save logs to Elasticsearch.