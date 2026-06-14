import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class ParseJsonBodyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ParseJsonBodyInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();

    try {
      if (req.body?.data && typeof req.body.data === 'string') {
        this.logger.debug('Parsing JSON body data');
        req.body = JSON.parse(req.body.data);
      }
    } catch (error) {
      this.logger.error(`Failed to parse JSON body: ${error}`);
      throw new BadRequestException('Invalid JSON in request body');
    }

    return next.handle();
  }
}
