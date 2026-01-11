import * as vscode from 'vscode';
import { ArgumentFiller, ArgumentCompletionProvider, AutofillOptions } from './autofill';

// Extension ID for Red Hat Java Language Support
const REDHAT_JAVA_EXTENSION_ID = 'redhat.java';

/**
 * Get autofill options from VS Code configuration
 */
function getAutofillOptions(): AutofillOptions {
    const config = vscode.workspace.getConfiguration('tlcsdm.autofill');
    return {
        enableCompletion: config.get<boolean>('enableCompletion', true),
        useParameterNames: config.get<boolean>('useParameterNames', true),
        fallbackToTypeName: config.get<boolean>('fallbackToTypeName', true)
    };
}

/**
 * Check if the Red Hat Java extension is installed
 */
function isRedHatJavaExtensionAvailable(): boolean {
    const extension = vscode.extensions.getExtension(REDHAT_JAVA_EXTENSION_ID);
    return extension !== undefined;
}

/**
 * Format the document using Red Hat Java extension if available
 */
async function formatDocumentWithRedHatJava(): Promise<void> {
    if (!isRedHatJavaExtensionAvailable()) {
        return;
    }

    try {
        // Execute the format document command
        await vscode.commands.executeCommand('editor.action.formatDocument');
    } catch {
        // Silently ignore formatting errors
    }
}

/**
 * Fill method arguments at the current cursor position
 */
async function fillArguments(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active text editor');
        return;
    }

    if (editor.document.languageId !== 'java') {
        vscode.window.showWarningMessage('This command only works with Java files');
        return;
    }

    const document = editor.document;
    const position = editor.selection.active;

    try {
        const options = getAutofillOptions();
        const filler = new ArgumentFiller(options);
        const result = await filler.fillArguments(document, position);

        if (!result) {
            vscode.window.showInformationMessage('No method call found at cursor position or unable to determine arguments');
            return;
        }

        if (result.arguments.length === 0) {
            vscode.window.showInformationMessage('Method has no parameters');
            return;
        }

        // Apply the edit
        const startPos = document.positionAt(result.replaceStart);
        const endPos = document.positionAt(result.replaceStart + result.replaceLength);
        const range = new vscode.Range(startPos, endPos);

        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, result.arguments);
        await vscode.workspace.applyEdit(edit);

        // Optionally format the document
        await formatDocumentWithRedHatJava();

        vscode.window.showInformationMessage(`Arguments filled: ${result.arguments}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fill arguments';
        vscode.window.showErrorMessage(message);
    }
}

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
    // Register the fill arguments command
    const fillArgumentsCmd = vscode.commands.registerCommand(
        'tlcsdm.autofill.fillArguments',
        fillArguments
    );

    // Register the completion provider
    const options = getAutofillOptions();
    const completionProvider = new ArgumentCompletionProvider(options);
    
    const completionProviderRegistration = vscode.languages.registerCompletionItemProvider(
        { language: 'java', scheme: 'file' },
        completionProvider,
        '(' // Trigger on opening parenthesis
    );

    // Re-register completion provider when configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
        if (event.affectsConfiguration('tlcsdm.autofill')) {
            // Update completion provider options
            const newOptions = getAutofillOptions();
            completionProvider.updateOptions(newOptions);
        }
    });

    context.subscriptions.push(
        fillArgumentsCmd,
        completionProviderRegistration,
        configChangeListener
    );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
    // Clean up resources if needed
}
