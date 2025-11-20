import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfigModule, DBConfigOption } from './dbconfig.module';
import { ActivityLog } from '../session-sniffer.entity';

@Module({
    imports: [

        TypeOrmModule.forRootAsync({
            imports: [DatabaseConfigModule],
            inject: ['DB_CONFIG'],
            useFactory: async (
                dbConfig: DBConfigOption,
            ) => ({
                type: dbConfig.config?.type as any,
                host: dbConfig.config?.host || '',
                port: dbConfig.config?.port || '',
                username: dbConfig.config?.username || '',
                password: dbConfig.config?.password || '',
                database: dbConfig.config?.database || '',
                entities: [ActivityLog],
                synchronize: dbConfig.synchronize,
            }),
        }),
    ],
})
export class DbConnModule {}