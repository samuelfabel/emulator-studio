import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateBucketDto {
  @ApiProperty({ example: 'my-local-bucket' })
  @IsString()
  name!: string;
}

export class DeleteBucketDto {
  @ApiProperty({ required: false, description: 'Delete all objects first' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
