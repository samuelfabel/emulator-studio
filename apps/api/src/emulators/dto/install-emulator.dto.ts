import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PubSubConfigDto {
  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  hostPort?: string;
}

export class InstallEmulatorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PubSubConfigDto)
  config?: PubSubConfigDto;
}
