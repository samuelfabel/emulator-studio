import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ example: 'reports/2026/' })
  @IsString()
  path!: string;
}
