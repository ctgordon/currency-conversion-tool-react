import type { Currency } from "../types/currency";

// Call our same-origin proxy; credentials are added on the server, never by browser code.
const baseUrl = "/api/currency";

// API payloads are unknown at runtime; TypeScript interfaces alone do not validate JSON.
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Centralise transport, cancellation, JSON parsing and the shared API response envelope.
async function request(
    endpoint: string,
    params: Record<string, string> = {},
    signal?: AbortSignal,
): Promise<unknown> {
    const query = new URLSearchParams(params);
    const url = `${baseUrl}/${endpoint}?${query}`;

    // Forward the signal through both the request and response-body read.
    const response = await fetch(url, { signal });
    if (!response.ok) {
        throw new Error(`CurrencyBeacon request failed (${response.status}).`);
    }

    let data: unknown;
    try {
        data = await response.json();
    } catch (error) {
        // Preserve cancellation and network errors while reading the body.
        if (error instanceof SyntaxError) {
            throw new Error("CurrencyBeacon returned malformed JSON.", { cause: error });
        }
        throw error;
    }

    // HTTP success is insufficient: validate the envelope before accessing endpoint-specific data.
    if (!isRecord(data) || !isRecord(data.meta) ||
        typeof data.meta.code !== "number" || !Number.isFinite(data.meta.code) ||
        !Object.hasOwn(data, "response") || data.response === null || data.response === undefined) {
        throw new Error("CurrencyBeacon returned an invalid response envelope.");
    }
    if (data.meta.code !== 200) {
        throw new Error(`CurrencyBeacon request failed (${data.meta.code}).`);
    }
    return data.response;
}

// Preserve the provider field names and validate every field promised by the Currency type.
function isCurrency(value: unknown): value is Currency {
    if (!isRecord(value)) return false;
    return typeof value.id === "number" && Number.isInteger(value.id) &&
        typeof value.name === "string" && value.name.trim() !== "" &&
        typeof value.short_code === "string" && value.short_code.trim() !== "" &&
        typeof value.code === "string" &&
        typeof value.precision === "number" && Number.isInteger(value.precision) && value.precision >= 0 &&
        typeof value.subunit === "number" && Number.isFinite(value.subunit) && value.subunit > 0 &&
        typeof value.symbol === "string" && typeof value.symbol_first === "boolean" &&
        typeof value.decimal_mark === "string" && typeof value.thousands_separator === "string";
}

// Return full metadata so selectors can show names without additional API calls.
export async function getCurrencies(signal?: AbortSignal): Promise<Currency[]> {
    const currencies = await request("currencies", {}, signal);
    if (!Array.isArray(currencies) || !currencies.every(isCurrency)) {
        throw new Error("CurrencyBeacon returned an invalid currency list.");
    }
    return currencies;

}

// Conversion remains explicit and button-driven; the provider computes the returned amount.
export async function convertCurrency(source: string, destination: string, amount: number, signal?: AbortSignal): Promise<number> {
    if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Amount must be a finite, non-negative number.");
    }

    const conversion = await request("convert", {
        from: source,
        to: destination,
        amount: String(amount),
    }, signal);
    // A successful response with unusable data is still a service error. Zero is valid.
    if (!isRecord(conversion) || typeof conversion.value !== "number" ||
        !Number.isFinite(conversion.value) || conversion.value < 0) {
        throw new Error("CurrencyBeacon returned an invalid conversion value.");
    }
    return conversion.value;
}
