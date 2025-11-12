import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuditService {
  constructor(private readonly cls: ClsService) {}

  /**
   * Execute a function within an audit context with a specific userId
   * Use this for background tasks, cron jobs, or any non-HTTP operations
   * @param userId - The user ID to set in the audit context
   * @param fn - The function to execute within the audit context
   */
  async runWithUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    return this.cls.run(async () => {
      this.cls.set('userId', userId);
      return await fn();
    });
  }

  /**
   * Execute a function within an audit context for system operations
   * Use this for automated tasks that don't have a specific user
   */
  async runAsSystem<T>(fn: () => Promise<T>): Promise<T> {
    return this.runWithUser('SYSTEM', fn);
  }
}
