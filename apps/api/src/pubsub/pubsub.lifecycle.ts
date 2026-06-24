import { Inject, Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PubSubService } from '@emulator-studio/pubsub';
import { EmulatorsService } from '../emulators/emulators.service';

@Injectable()
export class PubSubLifecycle implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(PubSubService) private readonly pubsubService: PubSubService,
    @Inject(EmulatorsService) private readonly emulatorsService: EmulatorsService
  ) {}

  async onModuleInit() {
    const config = await this.emulatorsService.initializePubSubConfiguration();
    this.pubsubService.syncProject(config.projectId);
  }

  async onApplicationShutdown() {
    await this.pubsubService.close();
  }
}
