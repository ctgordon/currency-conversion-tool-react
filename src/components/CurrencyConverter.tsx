import type {Currency} from "../types/currency";
import {useEffect, useRef, useState} from "react";
import type {SubmitEvent} from "react";
import {CurrencySelect} from "./CurrencySelect";
import {AmountInput} from "./AmountInput.tsx";
import {convertCurrency, getCurrencies} from "../services/currencyService";

// Own the form and API lifecycle here; input components only display values and report changes.
export function CurrencyConverter() {
    // Store selection codes separately from metadata because the conversion endpoint needs codes only.
    const [sourceCurrency, setSourceCurrency] = useState("GBP");
    const [destinationCurrency, setDestinationCurrency] = useState("EUR");
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    // Keep the editable amount as text so clearing the field and typing a decimal remain possible.
    const [amount, setAmount] = useState("");
    // null means no result; zero is a valid conversion and must still be rendered.
    const [result, setResult] = useState<number | null>(null);
    // Loading currencies and converting are independent operations with separate feedback.
    const [loadingCurrencies, setLoadingCurrencies] = useState(true);
    const [converting, setConverting] = useState(false);
    const [currencyError, setCurrencyError] = useState("");
    const [conversionError, setConversionError] = useState("");
    // Refs persist across renders without triggering them. The controller also blocks duplicate submits.
    const conversionController = useRef<AbortController | null>(null);
    const mounted = useRef(false);

    // Fetch supported currencies on mount. Cleanup also handles React StrictMode effect replays.
    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();

        async function loadCurrencies() {
            try {
                const availableCurrencies = await getCurrencies(controller.signal);
                if (controller.signal.aborted) return;
                setCurrencies(availableCurrencies);
                if (availableCurrencies.length === 0) {
                    setCurrencyError("No currencies are currently available.");
                } else {
                    // Prefer GBP → EUR, but select distinct supported currencies when defaults are missing.
                    const codes = availableCurrencies.map((currency) => currency.short_code);
                    const source = codes.includes("GBP") ? "GBP" : codes[0];
                    const destination = codes.includes("EUR") && source !== "EUR"
                        ? "EUR"
                        : codes.find((currency) => currency !== source) ?? source;
                    setSourceCurrency(source);
                    setDestinationCurrency(destination);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setCurrencyError(error instanceof Error ? error.message : "Unable to load currencies.");
                }
            } finally {
                if (!controller.signal.aborted) setLoadingCurrencies(false);
            }
        }

        void loadCurrencies();
        // Abort pending work before leaving; cancelled responses must not update this form.
        return () => {
            mounted.current = false;
            controller.abort();
            conversionController.current?.abort();
        };
    }, []);

    async function handleConvert(event: SubmitEvent<HTMLFormElement>) {
        // Use the form submit event so both the button and Enter key follow the same path.
        event.preventDefault();
        if (loadingCurrencies || currencyError || conversionController.current) return;
        // Validate again at the request boundary, independently of the button disabled state.
        const numericAmount = Number(amount);
        if (amount.trim() === "" || !Number.isFinite(numericAmount) || numericAmount < 0) {
            setConversionError("Enter a valid, non-negative amount.");
            return;
        }

        const controller = new AbortController();
        conversionController.current = controller;
        setConverting(true);
        setConversionError("");
        // Remove the previous result before starting a new request.
        setResult(null);
        try {
            const convertedAmount = await convertCurrency(sourceCurrency, destinationCurrency, numericAmount, controller.signal);
            if (!controller.signal.aborted) setResult(convertedAmount);
        } catch (error) {
            if (!controller.signal.aborted) {
                setConversionError(error instanceof Error ? error.message : "Unable to convert currency.");
            }
        } finally {
            // Cancellation can happen while mounted; only the active request may reset the UI.
            if (conversionController.current === controller) {
                conversionController.current = null;
                if (mounted.current) setConverting(false);
            }
        }
    }

    // Results and conversion errors describe the previous inputs, so discard them after edits.
    function clearConversion() {
        setResult(null);
        setConversionError("");
    }

    // Mirror AmountInput validation and ensure selections belong to the fetched list.
    // Derive validity on each render rather than maintaining another piece of state.
    const isFormValid = /^[0-9]+(\.[0-9]*)?$|^\.[0-9]+$/.test(amount) &&
        Number.isFinite(Number(amount)) &&
        currencies.some((currency) => currency.short_code === sourceCurrency) &&
        currencies.some((currency) => currency.short_code === destinationCurrency);

    return (
        <form onSubmit={handleConvert}>
            {loadingCurrencies && <p role="status">Loading currencies…</p>}
            {currencyError && <p role="alert">{currencyError}</p>}
            {/* Lock inputs during conversion so the eventual result matches the visible values. */}
            <fieldset disabled={loadingCurrencies || !!currencyError || converting}>
                <h5 className="card-title">Conversion details</h5>
                <CurrencySelect
                    label="Source currency"
                    options={currencies}
                    value={sourceCurrency}
                    onChange={(currency) => {
                        setSourceCurrency(currency);
                        clearConversion();
                    }}
                />
                <CurrencySelect
                    label="Destination currency"
                    options={currencies}
                    value={destinationCurrency}
                    onChange={(currency) => {
                        setDestinationCurrency(currency);
                        clearConversion();
                    }}
                />
                <AmountInput
                    value={amount}
                    onChange={(value) => {
                        setAmount(value);
                        clearConversion();
                    }}
                />
                <button type="submit"
                        className="btn btn-primary"
                        disabled={!isFormValid || loadingCurrencies || !!currencyError || converting}
                >{converting ? "Converting…" : "Convert"}</button>
            </fieldset>
            {converting && <p role="status">Converting currency…</p>}
            {conversionError && <p className="alert alert-danger" role="alert">{conversionError}</p>}

            {/* Render the entire result panel only after a successful conversion, including zero. */}
            {result !== null && (
                <div className="alert alert-success text-center my-3" role="alert">
                    <output>{`Converted amount: ${result} ${destinationCurrency}`}</output>
                </div>
            )}
        </form>
    );
}
