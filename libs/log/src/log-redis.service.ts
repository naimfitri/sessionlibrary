import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACTIVITY_LOG_EVENT, ActivityLogPayload } from './log.middleware';
import Redis from 'ioredis';

@Injectable()
export class LogRedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogRedisService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private readonly channelName = 'activity-log-events';

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly redisConfig: { host: string; port: number; password?: string; db?: number },
  ) {}

  async onModuleInit() {
    try {
      // Create Redis publisher
      this.publisher = new Redis({
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        password: this.redisConfig.password,
        db: this.redisConfig.db || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Create Redis subscriber
      this.subscriber = new Redis({
        host: this.redisConfig.host,
        port: this.redisConfig.port,
        password: this.redisConfig.password,
        db: this.redisConfig.db || 0,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Subscribe to the channel
      await this.subscriber.subscribe(this.channelName);
      this.logger.log(`Subscribed to Redis channel: ${this.channelName}`);

      // Listen for messages
      this.subscriber.on('message', (channel, message) => {
        if (channel === this.channelName) {
          try {
            const payload: ActivityLogPayload = JSON.parse(message);
            this.logger.log(`Received event from Redis: ${message}`);
            // Re-emit the event locally for this instance
            this.eventEmitter.emit(ACTIVITY_LOG_EVENT, payload);
          } catch (error) {
            this.logger.error('Failed to parse Redis message', error);
          }
        }
      });

      this.publisher.on('connect', () => {
        this.logger.log('Redis publisher connected');
      });

      this.subscriber.on('connect', () => {
        this.logger.log('Redis subscriber connected');
      });

      this.publisher.on('error', (error) => {
        this.logger.error('Redis publisher error', error);
      });

      this.subscriber.on('error', (error) => {
        this.logger.error('Redis subscriber error', error);
      });
    } catch (error) {
      this.logger.error('Failed to initialize Redis connections', error);
    }
  }

  async publishEvent(payload: ActivityLogPayload): Promise<void> {
    try {
      const message = JSON.stringify(payload);
      const numSubscribers = await this.publisher.publish(this.channelName, message);
      this.logger.log(`Published to Redis (${numSubscribers} subscribers): ${message}`);
    } catch (error) {
      this.logger.error('Failed to publish to Redis', error);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting Redis connections...');
    await this.publisher?.quit();
    await this.subscriber?.quit();
  }
}
