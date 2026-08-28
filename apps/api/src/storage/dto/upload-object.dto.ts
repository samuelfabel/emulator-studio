import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadObjectDto {
  @ApiProperty({ example: 'folder/file.txt' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'UTF-8 text or base64 when encoding=base64' })
  @IsString()
  content!: string;

  @ApiProperty({ required: false, enum: ['utf8', 'base64'], default: 'utf8' })
  @IsOptional()
  @IsString()
  encoding?: 'utf8' | 'base64';

  @ApiProperty({ required: false, example: 'text/plain' })
  @IsOptional()
  @IsString()
  contentType?: string;
}
