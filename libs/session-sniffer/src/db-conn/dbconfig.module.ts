import { Module, DynamicModule } from '@nestjs/common';


export interface DBConfig {
    type: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    database: string;
}

export interface DBConfigOption {
    config?: DBConfig;
    synchronize?: boolean;
}
@Module({})
export class DatabaseConfigModule {
    static forRoot(dbConfig?: DBConfigOption): DynamicModule {
        return {
            module: DatabaseConfigModule,
            providers: [
                {
                    provide: 'DB_CONFIG',
                    useValue: dbConfig,
                },
            ],
            exports: ['DB_CONFIG'],
        }
    };
        
}
