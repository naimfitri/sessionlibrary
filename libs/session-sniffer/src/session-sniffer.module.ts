import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLog } from './session-sniffer.entity';
import { ElasticConnModule } from './elastic-conn/elastic.module';
import { InsertLogSniffer } from './session-sniffer.insert';
import { ClsModule } from 'nestjs-cls';
import { DbConnModule } from './db-conn/dbconn.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ActivityLog]),
    ElasticConnModule,
    ClsModule,
    DbConnModule,
  ],
  providers: [InsertLogSniffer],
  exports: [],
})
export class SessionSnifferModule {}
