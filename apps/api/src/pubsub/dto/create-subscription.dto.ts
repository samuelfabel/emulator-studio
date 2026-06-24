import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'events-order' })
  @IsString()
  @IsNotEmpty()
  topicName!: string;

  @ApiProperty({ example: 'process-order-sub' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
