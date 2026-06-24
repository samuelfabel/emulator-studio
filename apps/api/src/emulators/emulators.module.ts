import { Module } from '@nestjs/common';
import { EmulatorsController } from './emulators.controller';
import { EmulatorsService } from './emulators.service';

@Module({
  controllers: [EmulatorsController],
  providers: [EmulatorsService],
  exports: [EmulatorsService],
})
export class EmulatorsModule {}
