import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { HealthController } from './health.controller';
import { DomainExceptionFilter } from './common/domain-exception.filter';
import { PubSubModule } from './pubsub/pubsub.module';
import { StorageModule } from './storage/storage.module';
import { EmulatorsModule } from './emulators/emulators.module';

@Module({
  imports: [PubSubModule, StorageModule, EmulatorsModule],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionFilter }],
})
export class AppModule {}
