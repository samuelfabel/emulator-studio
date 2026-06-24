import { Module } from '@nestjs/common';
import { PubSubService } from '@emulator-studio/pubsub';
import { EmulatorsModule } from '../emulators/emulators.module';
import { PubSubLifecycle } from './pubsub.lifecycle';
import { PubSubController } from './pubsub.controller';

@Module({
  imports: [EmulatorsModule],
  controllers: [PubSubController],
  providers: [
    {
      provide: PubSubService,
      useFactory: () =>
        new PubSubService({
          projectId: process.env.GOOGLE_CLOUD_PROJECT ?? 'local-dev',
        }),
    },
    PubSubLifecycle,
  ],
  exports: [PubSubService],
})
export class PubSubModule {}
