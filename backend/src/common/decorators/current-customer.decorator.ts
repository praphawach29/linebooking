import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export const CurrentCustomer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const customerUser = request.customerUser;

    if (!customerUser) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTH_REQUIRED,
        message: 'Customer authentication required',
      });
    }

    return customerUser;
  },
);
