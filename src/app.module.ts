import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
//import { DatabaseConfigModule, ElasticConfigModule } from 'nestjs-session-sniffer';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    // DatabaseConfigModule.forRoot({
    //   config : {
    //     type: process.env.DB_TYPE || '',
    //     host: process.env.DB_HOST || '',
    //     port: parseInt(process.env.DB_PORT || ''),
    //     username: process.env.DB_USERNAME || '',
    //     password: process.env.DB_PASSWORD || '',
    //     database: process.env.DB_NAME || '',
    //   },
    //   synchronize: process.env.DB_SYNC === 'true',
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
