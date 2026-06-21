import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { MulterError } from 'multer';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
}

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  MulterError,
)
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | MulterError,
    host: ArgumentsHost,
  ): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const { method, url } = request;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error';

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(
        `Prisma error (${exception.code}): ${exception.message}`,
      );
      ({ status, message } = this.resolvePrismaException(exception));
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn('Prisma validation error detected');
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation error: invalid data provided';
    } else if (exception instanceof MulterError) {
      this.logger.warn(
        `File upload error (${exception.code}): ${exception.message}`,
      );
      ({ status, message } = this.resolveMulterException(exception));
    }

    this.logger.error(
      `Exception caught: ${method} ${url} - Status: ${status} - ${message}`,
    );

    const responseBody: ErrorResponse = {
      statusCode: status,
      error: HttpStatus[status].replace(/_/g, ' '),
      message,
    };

    httpAdapter.reply(ctx.getResponse(), responseBody, status);
  }

  private resolvePrismaException(
    exception: Prisma.PrismaClientKnownRequestError,
  ): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: `Unique constraint failed on: ${(exception.meta?.target as string[])?.join(', ')}`,
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint failed',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Relation violation: required relation missing',
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Database error: ${exception.code}`,
        };
    }
  }

  private resolveMulterException(exception: MulterError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          status: HttpStatus.PAYLOAD_TOO_LARGE,
          message: 'File size exceeds the allowed limit',
        };
      case 'LIMIT_FILE_COUNT':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Too many files uploaded',
        };
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Unexpected file field: ${exception.field}`,
        };
      case 'LIMIT_PART_COUNT':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Too many parts in the request',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `File upload error: ${exception.message}`,
        };
    }
  }
}
