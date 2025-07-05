import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsGreaterThen(type: string, property: string, validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isGreaterThen',
            target: object.constructor,
            propertyName: propertyName,
            constraints: [property],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    const [relatedPropertyName] = args.constraints;
                    const relatedValue = (args.object as any)[relatedPropertyName];
                    if (type == 'date' && typeof value === 'object' && typeof relatedValue === 'object') {
                        const valueDate = new Date(value);
                        const relatedDate = new Date(relatedValue);
                        return relatedDate.getTime() > valueDate.getTime();
                    } else if (type == 'number' && typeof value === 'number' && typeof relatedValue === 'number') {
                        return relatedValue > value;
                    } else {
                        return true; // If types do not match, do not validate
                    }
                },
            },
        });
    };
}