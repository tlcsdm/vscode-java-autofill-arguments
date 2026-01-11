import * as vscode from 'vscode';
import { AutofillOptions, MethodParameter } from './types';

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
 * Completion provider that suggests argument names for method calls
 */
export class ArgumentCompletionProvider implements vscode.CompletionItemProvider {
    private options: AutofillOptions;

    constructor(options: AutofillOptions) {
        this.options = options;
    }

    /**
     * Update the options for this completion provider
     * @param options The new options to use
     */
    updateOptions(options: AutofillOptions): void {
        this.options = options;
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        _token: vscode.CancellationToken,
        _context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[] | null> {
        if (!this.options.enableCompletion) {
            return null;
        }

        // Check if we're inside a method call's parentheses
        const lineText = document.lineAt(position.line).text;
        const textBeforeCursor = lineText.substring(0, position.character);

        // Quick check: are we likely inside a method call?
        if (!this.isInsideMethodCall(textBeforeCursor)) {
            return null;
        }

        const hasJavaSupport = isRedHatJavaExtensionAvailable();
        
        let parameters: MethodParameter[] | null = null;

        if (hasJavaSupport) {
            parameters = await this.getParametersFromSignatureHelp(document, position);
        }

        if (!parameters || parameters.length === 0) {
            return null;
        }

        // Generate completion items
        return this.createCompletionItems(parameters, document, position);
    }

    /**
     * Check if cursor is likely inside a method call
     */
    private isInsideMethodCall(textBeforeCursor: string): boolean {
        let parenDepth = 0;
        
        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
            const char = textBeforeCursor[i];
            if (char === ')') {
                parenDepth++;
            } else if (char === '(') {
                if (parenDepth === 0) {
                    // Check if there's an identifier before this parenthesis
                    const beforeParen = textBeforeCursor.substring(0, i).trim();
                    return /[a-zA-Z0-9_]$/.test(beforeParen);
                }
                parenDepth--;
            }
        }
        
        return false;
    }

    /**
     * Get parameters from signature help
     */
    private async getParametersFromSignatureHelp(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<MethodParameter[] | null> {
        try {
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

        return { name: trimmed, type: 'Object' };
    }

    /**
     * Create completion items from parameters
     */
    private createCompletionItems(
        parameters: MethodParameter[],
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const items: vscode.CompletionItem[] = [];

        // Create a completion item for filling all arguments
        const allArgsItem = new vscode.CompletionItem(
            'Fill all arguments',
            vscode.CompletionItemKind.Snippet
        );
        
        const allArgsString = parameters.map(p => p.name).join(', ');
        allArgsItem.insertText = new vscode.SnippetString(
            parameters.map((p, i) => `\${${i + 1}:${p.name}}`).join(', ')
        );
        allArgsItem.detail = `Fill with: ${allArgsString}`;
        allArgsItem.documentation = new vscode.MarkdownString(
            `Fills all method arguments with parameter names:\n\n\`${allArgsString}\``
        );
        allArgsItem.sortText = '0'; // Show first
        allArgsItem.preselect = true;
        
        // Calculate the range to replace (from current position to closing paren or next comma)
        const range = this.calculateReplaceRange(document, position);
        if (range) {
            allArgsItem.range = range;
        }

        items.push(allArgsItem);

        // Also add individual parameter suggestions
        parameters.forEach((param, index) => {
            const item = new vscode.CompletionItem(
                param.name,
                vscode.CompletionItemKind.Variable
            );
            item.detail = `Parameter ${index + 1}: ${param.type}`;
            item.sortText = `1${index}`;
            items.push(item);
        });

        return items;
    }

    /**
     * Calculate the range to replace for completion
     */
    private calculateReplaceRange(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.Range | undefined {
        const lineText = document.lineAt(position.line).text;
        const textAfterCursor = lineText.substring(position.character);

        // Find the end of the current argument (next comma or closing paren)
        let endChar = position.character;
        let depth = 0;

        for (let i = 0; i < textAfterCursor.length; i++) {
            const char = textAfterCursor[i];
            if (char === '(' || char === '[' || char === '{') {
                depth++;
            } else if (char === ')' || char === ']' || char === '}') {
                if (depth === 0) {
                    endChar = position.character + i;
                    break;
                }
                depth--;
            } else if (char === ',' && depth === 0) {
                endChar = position.character + i;
                break;
            }
        }

        // Find the start of the current word/argument
        const textBeforeCursor = lineText.substring(0, position.character);
        let startChar = position.character;

        for (let i = textBeforeCursor.length - 1; i >= 0; i--) {
            const char = textBeforeCursor[i];
            if (char === '(' || char === ',') {
                startChar = i + 1;
                // Skip whitespace
                while (startChar < position.character && /\s/.test(lineText[startChar])) {
                    startChar++;
                }
                break;
            }
        }

        return new vscode.Range(
            new vscode.Position(position.line, startChar),
            new vscode.Position(position.line, endChar)
        );
    }
}
