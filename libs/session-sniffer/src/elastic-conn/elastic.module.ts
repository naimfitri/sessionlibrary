import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ElasticConfigModule, ElasticConfig } from './elasticconfig.module';

@Module({
    imports: [
        ElasticsearchModule.registerAsync({
            imports: [ElasticConfigModule],
            inject: ['ELASTIC_CONFIG'],
            useFactory: async (
                elasticConfig: ElasticConfig,
            ) => ({
                node: elasticConfig.elasticUrl,
            })
        })
    ]
})
export class ElasticConnModule {}