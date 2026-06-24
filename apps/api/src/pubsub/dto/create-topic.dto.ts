import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTopicDto {
  @ApiProperty({ example: 'events-order' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
