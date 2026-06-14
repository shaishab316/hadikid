import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/api-response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        return this.buildResponse(data, res);
      }),
    );
  }

  private buildResponse(data: ApiResponse, res: Response) {
    const statusCode = res.statusCode;

    // Build response object
    const response: ApiResponse = {
      success: true,
      statusCode,
      message: data?.message ?? 'Success',
    };

    // Add pagination if present
    if (data?.pagination) {
      response.pagination = data.pagination;
    }

    // Add meta if present
    if (data?.meta) {
      response.meta = data.meta;
    }

    // Determine the data field
    if (data?.data !== undefined) {
      response.data = data.data;
    } else if (!data?.message && !data?.pagination && !data?.meta) {
      response.data = data;
    } else {
      // Don't include data field if it's empty and we have special fields
      response.data = null;
    }

    return response;
  }
}
