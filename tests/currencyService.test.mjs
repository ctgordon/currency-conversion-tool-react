import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test, afterEach } from 'node:test';
import ts from 'typescript';

// Load the TypeScript service for Node tests.
const source = await readFile(new URL('../src/services/currencyService.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
});
const { getCurrencies, convertCurrency } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const respond = (payload) => {
    globalThis.fetch = async () => Response.json(payload);
};
const envelope = (response) => ({ meta: { code: 200 }, response });

test('reports malformed JSON', async () => {
    globalThis.fetch = async () => new Response('{');
    await assert.rejects(getCurrencies(), /malformed JSON/);
});

test('rejects invalid envelopes', async () => {
    for (const payload of [null, [], {}, { response: [] }, { meta: {} }, { meta: { code: 200 } }, envelope(null)]) {
        respond(payload);
        await assert.rejects(getCurrencies(), /invalid response envelope/);
    }
});

test('validates currency lists and retains full currency objects', async () => {
    for (const payload of [{}, [null], [{}], [{ short_code: '' }], [{ short_code: 123 }]]) {
        respond(envelope(payload));
        await assert.rejects(getCurrencies(), /invalid currency list/);
    }
    const currency = {
        id: 1, name: 'UAE Dirham', short_code: 'AED', code: '784',
        precision: 2, subunit: 100, symbol: 'د.إ', symbol_first: true,
        decimal_mark: '.', thousands_separator: ',',
    };
    respond(envelope([currency]));
    assert.deepEqual(await getCurrencies(), [currency]);
    for (const field of Object.keys(currency)) {
        const invalid = { ...currency };
        delete invalid[field];
        respond(envelope([invalid]));
        await assert.rejects(getCurrencies(), /invalid currency list/);
    }
});

test('rejects unexpected conversion values, including non-finite numbers', async () => {
    for (const value of [undefined, null, '12', -1, NaN, Infinity]) {
        globalThis.fetch = async () => ({ ok: true, json: async () => envelope({ value }) });
        await assert.rejects(convertCurrency('GBP', 'EUR', 10), /invalid conversion value/);
    }
    for (const value of [0, 12.5]) {
        respond(envelope({ value }));
        assert.equal(await convertCurrency('GBP', 'EUR', 10), value);
    }
});

test('preserves request cancellation for both endpoints', async () => {
    const controller = new AbortController();
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
        assert.equal(signal, controller.signal);
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
    const pending = getCurrencies(controller.signal);
    controller.abort();
    await assert.rejects(pending, { name: 'AbortError' });
    await assert.rejects(convertCurrency('GBP', 'EUR', 10, controller.signal), { name: 'AbortError' });
});

test('preserves cancellation while reading the response body', async () => {
    globalThis.fetch = async () => ({ ok: true, json: async () => { throw new DOMException('Aborted', 'AbortError'); } });
    await assert.rejects(getCurrencies(), { name: 'AbortError' });
});

test('reports HTTP and API failures', async () => {
    globalThis.fetch = async () => new Response('', { status: 429 });
    await assert.rejects(getCurrencies(), /429/);
    respond({ meta: { code: 403 }, response: {} });
    await assert.rejects(getCurrencies(), /403/);
});


test('uses the same-origin proxy without sending an API key from the browser', async () => {
    globalThis.fetch = async (url) => {
        assert.equal(url, '/api/currency/convert?from=GBP&to=EUR&amount=10');
        return Response.json(envelope({ value: 12 }));
    };
    assert.equal(await convertCurrency('GBP', 'EUR', 10), 12);
});
