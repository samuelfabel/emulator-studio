import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class UpdateStorageConfigDto {
  @ApiProperty({ example: 'local-dev' })
  @IsString()
  projectId!: string;

  @ApiProperty({ example: 'localhost:4443' })
  @IsString()
  @Matches(/^.+:\d+$/, { message: 'hostPort must be in host:port format' })
  hostPort!: string;
}
