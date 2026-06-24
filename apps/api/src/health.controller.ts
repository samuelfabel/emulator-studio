import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOkResponse({ description: 'API health check' })
  health() {
    return { status: 'ok', service: 'emulator-studio-api' };
  }
}
