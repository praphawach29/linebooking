import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Matches the same loose UUID shape already enforced by the tenant guards
// (customer-tenant.guard.ts, tenant-access.guard.ts, line-id-token.guard.ts):
// well-formed hex-dash UUID shape without enforcing RFC 4122 version/variant
// nibbles, since Postgres's `uuid` column type — and this project's existing
// seed data — does not require strict UUIDv4.
const LOOSE_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function IsLooseUuid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isLooseUuid',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return typeof value === 'string' && LOOSE_UUID_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid UUID`;
        },
      },
    });
  };
}
