import * as vscode from 'vscode';
import { AutofillOptions, ArgumentFillResult, MethodParameter } from './types';

// Extension ID for Red Hat Java Language Support
const REDHAT_JAVA_EXTENSION_ID = 'redhat.java';

/**
 * Checks if the Red Hat Java extension is available
 */
function isRedHatJavaExtensionAvailable(): boolean {
    const extension = vscode.extensions.getExtension(REDHAT_JAVA_EXTENSION_ID);
    return extension !== undefined;
}

/**
 * Core class for filling method arguments in Java code
 */
export class ArgumentFiller {
    private options: AutofillOptions;

    constructor(options: AutofillOptions) {
        this.options = options;
    }

    /**
     * Find method call at the current cursor position and fill arguments
     * @param document The text document
     * @param position The cursor position
     * @returns The argument fill result or null if unable to fill
     */
    async fillArguments(document: vscode.TextDocument, position: vscode.Position): Promise<ArgumentFillResult | null> {
        // Check if Red Hat Java extension is available for better analysis
        const hasJavaSupport = isRedHatJavaExtensionAvailable();

        // Get the text content to analyze
        const text = document.getText();
        const offset = document.offsetAt(position);

        // Find the method call context
        const methodCallInfo = this.findMethodCallContext(text, offset);
        if (!methodCallInfo) {
            return null;
        }

        // Try to get parameter information
        let parameters: MethodParameter[] | null = null;

        if (hasJavaSupport) {
            // Try to get parameters from Java Language Server
            parameters = await this.getParametersFromLanguageServer(document, position, methodCallInfo);
        }

        if (!parameters) {
            // Fall back to simple parsing
            parameters = this.parseParametersFromContext(text, methodCallInfo);
        }

        if (!parameters || parameters.length === 0) {
            return null;
        }

        // Generate argument string
        const argumentString = this.generateArgumentString(parameters);

        return {
            arguments: argumentString,
            replaceStart: methodCallInfo.argumentsStart,
            replaceLength: methodCallInfo.argumentsLength
        };
    }

    /**
     * Find the method call context at the given offset
     */
    private findMethodCallContext(text: string, offset: number): MethodCallContext | null {
        // Find the opening parenthesis before the cursor
        let parenDepth = 0;
        let openParenOffset = -1;
        let closeParenOffset = -1;

        // Start scanning from offset - 1 to correctly handle the case when cursor is
        // between parentheses (e.g., "print(|)"). The offset points to the character
        // at the cursor position, so we need to start before it to find the containing '('.
        const scanStart = offset > 0 ? offset - 1 : 0;

        // First, scan backward to find the context
        for (let i = scanStart; i >= 0; i--) {
            const char = text[i];
            if (char === ')') {
                parenDepth++;
            } else if (char === '(') {
                if (parenDepth === 0) {
                    openParenOffset = i;
                    break;
                }
                parenDepth--;
            }
        }

        if (openParenOffset === -1) {
            return null;
        }

        // Find the closing parenthesis
        parenDepth = 1;
        for (let i = openParenOffset + 1; i < text.length; i++) {
            const char = text[i];
            if (char === '(') {
                parenDepth++;
            } else if (char === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                    closeParenOffset = i;
                    break;
                }
            }
        }

        if (closeParenOffset === -1) {
            return null;
        }

        // Extract method name
        const methodName = this.extractMethodName(text, openParenOffset);
        if (!methodName) {
            return null;
        }

        // Get existing arguments
        const existingArgs = text.substring(openParenOffset + 1, closeParenOffset).trim();

        return {
            methodName: methodName.name,
            isConstructor: methodName.isConstructor,
            openParenOffset,
            closeParenOffset,
            argumentsStart: openParenOffset + 1,
            argumentsLength: closeParenOffset - openParenOffset - 1,
            existingArguments: existingArgs
        };
    }

    /**
     * Extract method name from the position before opening parenthesis
     */
    private extractMethodName(text: string, openParenOffset: number): { name: string; isConstructor: boolean } | null {
        let end = openParenOffset;
        let start = end;

        // Skip whitespace
        while (start > 0 && /\s/.test(text[start - 1])) {
            start--;
        }

        end = start;

        // Find the start of the identifier
        while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) {
            start--;
        }

        if (start === end) {
            return null;
        }

        const name = text.substring(start, end);
        
        // Check if it's a constructor call (preceded by 'new')
        let beforeName = start;
        while (beforeName > 0 && /\s/.test(text[beforeName - 1])) {
            beforeName--;
        }
        
        const isConstructor = beforeName >= 3 && text.substring(beforeName - 3, beforeName) === 'new';

        return { name, isConstructor };
    }

    /**
     * Try to get parameters from the Java Language Server
     */
    private async getParametersFromLanguageServer(
        document: vscode.TextDocument, 
        position: vscode.Position,
        _context: MethodCallContext
    ): Promise<MethodParameter[] | null> {
        try {
            // Get signature help from the language server
            const signatureHelp = await vscode.commands.executeCommand<vscode.SignatureHelp>(
                'vscode.executeSignatureHelpProvider',
                document.uri,
                position
            );

            if (!signatureHelp || signatureHelp.signatures.length === 0) {
                return null;
            }

            const activeSignature = signatureHelp.signatures[signatureHelp.activeSignature || 0];
            if (!activeSignature.parameters || activeSignature.parameters.length === 0) {
                return null;
            }

            return activeSignature.parameters.map((param, index) => {
                // Extract parameter name and type from label
                const paramLabel = typeof param.label === 'string' 
                    ? param.label 
                    : activeSignature.label.substring(param.label[0], param.label[1]);
                
                const { name, type } = this.parseParameterLabel(paramLabel);
                
                return {
                    name: name || `arg${index + 1}`,
                    type: type || 'Object',
                    index
                };
            });
        } catch {
            return null;
        }
    }

    /**
     * Parse parameter label to extract name and type
     */
    private parseParameterLabel(label: string): { name: string; type: string } {
        const trimmed = label.trim();
        
        // Java parameter format: "Type name" or "Type... name" for varargs
        const parts = trimmed.split(/\s+/);
        
        if (parts.length >= 2) {
            const name = parts[parts.length - 1];
            const type = parts.slice(0, parts.length - 1).join(' ');
            return { name, type };
        }
        
        // If we can't parse, use the whole thing as name
        return { name: trimmed, type: 'Object' };
    }

    /**
     * Parse parameters from context using simple heuristics
     */
    private parseParametersFromContext(text: string, context: MethodCallContext): MethodParameter[] | null {
        // If there are already arguments, don't override them unless empty
        if (context.existingArguments.length > 0) {
            // Count how many arguments already exist
            const existingCount = this.countArguments(context.existingArguments);
            if (existingCount > 0) {
                return null;
            }
        }

        // For simple cases, we can't determine parameters without language server
        // Return generic placeholders based on method name patterns
        if (this.options.fallbackToTypeName) {
            return this.generatePlaceholderParameters(context.methodName, context.isConstructor);
        }

        return null;
    }

    /**
     * Count the number of arguments in an argument string
     */
    private countArguments(argsString: string): number {
        if (!argsString.trim()) {
            return 0;
        }

        let count = 1;
        let depth = 0;
        let inString = false;
        let stringChar = '';

        for (const char of argsString) {
            if (!inString) {
                if (char === '"' || char === '\'') {
                    inString = true;
                    stringChar = char;
                } else if (char === '(' || char === '[' || char === '{') {
                    depth++;
                } else if (char === ')' || char === ']' || char === '}') {
                    depth--;
                } else if (char === ',' && depth === 0) {
                    count++;
                }
            } else if (char === stringChar) {
                inString = false;
            }
        }

        return count;
    }

    /**
     * Generate placeholder parameters based on method name patterns
     */
    private generatePlaceholderParameters(methodName: string, _isConstructor: boolean): MethodParameter[] {
        // Common setter pattern
        if (methodName.startsWith('set') && methodName.length > 3) {
            const fieldName = methodName.charAt(3).toLowerCase() + methodName.substring(4);
            return [{
                name: fieldName,
                type: 'Object',
                index: 0
            }];
        }

        // Common patterns for methods with known parameters
        const knownPatterns: { [key: string]: string[] } = {
            'equals': ['obj'],
            'compareTo': ['other'],
            'indexOf': ['element'],
            'contains': ['element'],
            'add': ['element'],
            'remove': ['element'],
            'put': ['key', 'value'],
            'get': ['key'],
            'substring': ['beginIndex', 'endIndex'],
            'replace': ['oldValue', 'newValue'],
            'split': ['regex'],
            'format': ['format', 'args'],
            'printf': ['format', 'args'],
            'println': ['message'],
            'print': ['message'],
            'append': ['str'],
            'insert': ['offset', 'str']
        };

        const patternParams = knownPatterns[methodName];
        if (patternParams) {
            return patternParams.map((name, index) => ({
                name,
                type: 'Object',
                index
            }));
        }

        return [];
    }

    /**
     * Generate argument string from parameters
     */
    private generateArgumentString(parameters: MethodParameter[]): string {
        if (this.options.useParameterNames) {
            return parameters.map(p => p.name).join(', ');
        } else if (this.options.fallbackToTypeName) {
            return parameters.map(p => {
                // Convert type to a variable name
                const typeName = p.type.replace(/[<>[\]]/g, '').split('.').pop() || 'arg';
                return typeName.charAt(0).toLowerCase() + typeName.substring(1);
            }).join(', ');
        }
        return parameters.map((_, i) => `arg${i + 1}`).join(', ');
    }
}

/**
 * Context information about a method call
 */
interface MethodCallContext {
    methodName: string;
    isConstructor: boolean;
    openParenOffset: number;
    closeParenOffset: number;
    argumentsStart: number;
    argumentsLength: number;
    existingArguments: string;
}
