import { Module, DynamicModule } from '@nestjs/common';

export interface ElasticConfig {
    elasticUrl: string;
}

@Module({})
export class ElasticConfigModule {
    static forRoot(elasticConfig?: ElasticConfig): DynamicModule {
        return {
            module: ElasticConfigModule,
            providers: [
                {
                    provide: 'ELASTIC_CONFIG',
                    useValue: elasticConfig
                },
            ],
            exports: ['DB_CONFIG'],
        }
    };
}