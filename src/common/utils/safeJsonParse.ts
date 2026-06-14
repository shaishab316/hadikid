import { BadRequestException, Logger } from '@nestjs/common';

export const safeJsonParse = <T>(data: string, logger?: Logger): T => {
  try {
    return JSON.parse(data) as T;
  } catch (error: any) {
    const message = `Invalid JSON: ${error.message}`;
    if (logger) {
      logger.error(message);
    }
    throw new BadRequestException(message);
  }
};
