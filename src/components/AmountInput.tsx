// A controlled input: the converter owns the value and decides what to do after an edit.
interface AmountInputProps {
    value: string;
    onChange: (value: string) => void;
}

export function AmountInput({value, onChange}: AmountInputProps) {
    return (
        <div className="mb-3">
            <label htmlFor="amountInput" className="form-label">Amount</label>
            {/* Text avoids number-input exponent/sign syntax; inputMode requests a decimal keyboard.
                pattern validates the completed amount, while onChange permits intermediate edits. */}
            <input
                type="text"
                className="form-control"
                id="amountInput"
                inputMode="decimal"
                pattern="[0-9]+([.][0-9]*)?|[.][0-9]+"
                required
                value={value}
                onChange={(event) => {
                    const nextValue = event.target.value;
                    // Accept an empty value or a single decimal point while typing; the form checks completeness.
                    // Checking the whole value also covers pasted input.
                    if (/^[0-9]*(\.[0-9]*)?$/.test(nextValue)) {
                        onChange(nextValue);
                    }
                }}
            />
        </div>
    );
}
