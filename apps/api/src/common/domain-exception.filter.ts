import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(typeof body === 'string' ? { error: body } : body);
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    const status =
      message.includes('does not exist') || message.includes('No messages')
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

    response.status(status).json({ error: message });
  }
}

export function assertValidName(error: string | null): void {
  if (error) throw new BadRequestException({ error });
}
