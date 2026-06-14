import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Guard
 * - If JWT token is present: validates it (throws if invalid)
 * - If no token: allows request to proceed
 * - Marks authenticated requests for throttler to use 'authenticated' profile
 * - Use with @CurrentUser() to get user (undefined if not authenticated)
 */
@Injectable()
export class OptionalJwtGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    // Check if token is present
    const hasToken =
      this.hasAuthorizationHeader(request) || this.hasQueryToken(request);

    // If no token, allow the request (optional auth)
    if (!hasToken) {
      return true;
    }

    // If token exists, validate it (required to be valid)
    const result = await super.canActivate(context);

    // Mark request as authenticated for throttler to use 'authenticated' profile
    if (result && request.user) {
      request.isThrottlingAuthenticated = true;
    }

    return result as boolean;
  }

  private hasAuthorizationHeader(request: any): boolean {
    const authHeader = request.headers?.authorization;
    return authHeader?.startsWith('Bearer ') ?? false;
  }

  private hasQueryToken(request: any): boolean {
    return !!request.query?.token;
  }
}
