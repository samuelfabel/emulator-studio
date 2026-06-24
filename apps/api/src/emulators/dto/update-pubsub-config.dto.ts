import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import type { PubSubEmulatorConfig } from '@emulator-studio/shared';

export class InstallEmulatorDto {
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  config?: Partial<PubSubEmulatorConfig>;
}

export class UpdatePubSubConfigDto {
  @ApiPropertyOptional({ example: 'local-dev' })
  @IsString()
  projectId!: string;

  @ApiPropertyOptional({ example: 'localhost:8085' })
  @IsString()
  @Matches(/^.+:\d+$/, { message: 'hostPort must be in host:port format' })
  hostPort!: string;
}
