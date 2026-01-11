import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('unknowIfGuestInDream.tlcsdm-java-autofill-arguments'));
    });

    test('Commands should be registered', async () => {
        const extension = vscode.extensions.getExtension('unknowIfGuestInDream.tlcsdm-java-autofill-arguments');
        await extension?.activate();

        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('tlcsdm.autofill.fillArguments'));
    });

    test('Configuration should have default values', () => {
        const config = vscode.workspace.getConfiguration('tlcsdm.autofill');
        
        const enableCompletion = config.get<boolean>('enableCompletion');
        assert.strictEqual(enableCompletion, true);

        const useParameterNames = config.get<boolean>('useParameterNames');
        assert.strictEqual(useParameterNames, true);

        const fallbackToTypeName = config.get<boolean>('fallbackToTypeName');
        assert.strictEqual(fallbackToTypeName, true);
    });
});
