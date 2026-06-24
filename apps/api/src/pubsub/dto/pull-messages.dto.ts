import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PullMessagesDto {
  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxMessages?: number;

  @ApiPropertyOptional({
    default: true,
    description: 'When true, acknowledges messages and removes them from the subscription queue.',
  })
  @IsOptional()
  @IsBoolean()
  ack?: boolean;
}
