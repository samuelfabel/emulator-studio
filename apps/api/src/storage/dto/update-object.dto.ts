import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateObjectDto {
  @ApiPropertyOptional({ example: 'folder/renamed.txt' })
  @IsOptional()
  @IsString()
  newName?: string;

  @ApiPropertyOptional({ example: 'text/plain' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ example: 'gzip' })
  @IsOptional()
  @IsString()
  contentEncoding?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { author: 'dev', env: 'local' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
