import * as assert from 'assert';
import { ArgumentFiller } from '../autofill';
import { AutofillOptions } from '../autofill/types';

suite('Autofill Test Suite', () => {
    const defaultOptions: AutofillOptions = {
        enableCompletion: true,
        useParameterNames: true,
        fallbackToTypeName: true
    };

    test('ArgumentFiller should be instantiable', () => {
        const filler = new ArgumentFiller(defaultOptions);
        assert.ok(filler);
    });

    test('ArgumentFiller with custom options', () => {
        const customOptions: AutofillOptions = {
            enableCompletion: false,
            useParameterNames: false,
            fallbackToTypeName: false
        };
        const filler = new ArgumentFiller(customOptions);
        assert.ok(filler);
    });

    test('Options interface should have correct properties', () => {
        const options: AutofillOptions = {
            enableCompletion: true,
            useParameterNames: true,
            fallbackToTypeName: true
        };
        
        assert.strictEqual(typeof options.enableCompletion, 'boolean');
        assert.strictEqual(typeof options.useParameterNames, 'boolean');
        assert.strictEqual(typeof options.fallbackToTypeName, 'boolean');
    });
});
