import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { StorageService } from '@emulator-studio/storage';
import { EmulatorsService } from '../emulators/emulators.service';

@Injectable()
export class StorageLifecycle implements OnModuleInit {
  constructor(
    @Inject(StorageService) private readonly storageService: StorageService,
    @Inject(EmulatorsService) private readonly emulatorsService: EmulatorsService
  ) {}

  async onModuleInit() {
    const config = await this.emulatorsService.initializeStorageConfiguration();
    this.storageService.syncProject(config.projectId);
  }
}
