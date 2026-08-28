import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  EmulatorListItem,
  EmulatorRuntimeStatus,
  PubSubEmulatorConfig,
  StorageEmulatorConfig,
} from '@emulator-studio/shared';
import { UpdatePubSubConfigDto } from './dto/update-pubsub-config.dto';
import { UpdateStorageConfigDto } from './dto/update-storage-config.dto';
import { InstallEmulatorDto } from './dto/install-emulator.dto';
import { EmulatorsService } from './emulators.service';

@ApiTags('Emulators')
@Controller('api/emulators')
export class EmulatorsController {
  constructor(@Inject(EmulatorsService) private readonly emulatorsService: EmulatorsService) {}

  @Get()
  @ApiOkResponse({ description: 'Catalog with installed state and runtime' })
  list(): Promise<EmulatorListItem[]> {
    return this.emulatorsService.list();
  }

  @Get('pubsub/runtime')
  pubSubRuntime(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.getRuntime('pubsub');
  }

  @Put('pubsub/config')
  updatePubSubConfig(@Body() body: UpdatePubSubConfigDto) {
    return this.emulatorsService.updatePubSubConfig(body);
  }

  @Get('pubsub/config')
  getPubSubConfig(): PubSubEmulatorConfig {
    return this.emulatorsService.getPubSubConfig();
  }

  @Post('pubsub/start')
  startPubSub(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.startPubSub();
  }

  @Post('pubsub/stop')
  stopPubSub(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.stopPubSub();
  }

  @Get('storage/runtime')
  storageRuntime(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.getRuntime('storage');
  }

  @Put('storage/config')
  updateStorageConfig(@Body() body: UpdateStorageConfigDto) {
    return this.emulatorsService.updateStorageConfig(body);
  }

  @Get('storage/config')
  getStorageConfig(): StorageEmulatorConfig {
    return this.emulatorsService.getStorageConfig();
  }

  @Post('storage/start')
  startStorage(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.startStorage();
  }

  @Post('storage/stop')
  stopStorage(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.stopStorage();
  }

  @Post('storage/restart')
  restartStorage(): Promise<EmulatorRuntimeStatus> {
    return this.emulatorsService.restartStorage();
  }

  // Parameterized routes after static pubsub/storage paths
  @Post(':id/install')
  install(@Param('id') id: string, @Body() body: InstallEmulatorDto) {
    return this.emulatorsService.install(id, body.config);
  }

  @Delete(':id/uninstall')
  async uninstall(@Param('id') id: string) {
    await this.emulatorsService.uninstall(id);
    return { id, uninstalled: true };
  }
}
