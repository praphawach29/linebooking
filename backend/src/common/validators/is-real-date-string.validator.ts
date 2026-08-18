import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsRealDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRealDateString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          if (!/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(value)) {
            return false;
          }

          const [year, month, day] = value.split('-').map(Number);
          const date = new Date(Date.UTC(year, month - 1, day));

          return (
            date.getUTCFullYear() === year &&
            date.getUTCMonth() + 1 === month &&
            date.getUTCDate() === day
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid real date in YYYY-MM-DD format`;
        },
      },
    });
  };
}
