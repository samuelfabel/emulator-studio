import { Module } from '@nestjs/common';
import { StorageService } from '@emulator-studio/storage';
import { EmulatorsModule } from '../emulators/emulators.module';
import { StorageController } from './storage.controller';
import { StorageLifecycle } from './storage.lifecycle';

@Module({
  imports: [EmulatorsModule],
  controllers: [StorageController],
  providers: [
    {
      provide: StorageService,
      useFactory: () =>
        new StorageService({
          projectId: process.env.GOOGLE_CLOUD_PROJECT ?? 'local-dev',
        }),
    },
    StorageLifecycle,
  ],
  exports: [StorageService],
})
export class StorageModule {}
