import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsLesserThen(type: string, property: string, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isLesserThen',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = (args.object as any)[relatedPropertyName];
                    if (type === 'date' && typeof value === 'string' && typeof relatedValue === 'string') {
                        const valueDate = new Date(value);
                        const relatedDate = new Date(relatedValue);
                        return valueDate.getTime() < relatedDate.getTime();
                    } else if (type === 'number' && typeof value === 'number' && typeof relatedValue === 'number') {
                        return value < relatedValue;
                    } else {
                        return true; // If types do not match, do not validate
                    }
                },
            },
        });
    };
}