import type {Currency} from "../types/currency";
import {useId} from "react";

interface CurrencySelectProps {
    label: string;
    options: readonly Currency[];
    value: string;
    onChange: (currency: string) => void;
}

export function CurrencySelect({label, options, value, onChange}: CurrencySelectProps) {
    // Each selector needs a unique label association, even when several appear on the same page.
    const id = useId();

    return (
        <div className="mb-3">
            <label htmlFor={id}>{label}</label>
            <select className="form-select"
                    aria-label={label}
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}>
                {/* Show human-readable names while keeping API currency codes as option values. */}
                {options.map((currency) => (
                    <option key={currency.short_code} value={currency.short_code}>
                        {currency.short_code} — {currency.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
