/**
 * Configuration options for autofill functionality
 */
export interface AutofillOptions {
    /** Enable argument suggestions in code completion */
    enableCompletion: boolean;
    /** Use parameter names as argument suggestions when available */
    useParameterNames: boolean;
    /** Use type names as fallback when parameter names are not available */
    fallbackToTypeName: boolean;
}

/**
 * Represents a method parameter
 */
export interface MethodParameter {
    /** Parameter name */
    name: string;
    /** Parameter type */
    type: string;
    /** Parameter index in the method signature */
    index: number;
}

/**
 * Represents a method signature
 */
export interface MethodSignature {
    /** Method name */
    name: string;
    /** Method parameters */
    parameters: MethodParameter[];
    /** Return type */
    returnType: string;
    /** Whether it's a constructor */
    isConstructor: boolean;
}

/**
 * Result of argument filling operation
 */
export interface ArgumentFillResult {
    /** Generated argument string */
    arguments: string;
    /** Start position for replacement */
    replaceStart: number;
    /** Length of text to replace */
    replaceLength: number;
}
