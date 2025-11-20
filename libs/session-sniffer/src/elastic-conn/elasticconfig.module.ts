import { Module, DynamicModule, Global } from '@nestjs/common';

export interface ElasticConfig {
    elasticUrl: string;
}

@Global()
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
            exports: ['ELASTIC_CONFIG'],
        }
    };
}