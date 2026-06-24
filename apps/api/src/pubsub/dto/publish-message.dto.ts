import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PublishMessageDto {
  @ApiProperty({ example: 'events-order' })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ example: '{"event":"test"}' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
