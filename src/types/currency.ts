// CurrencyBeacon currency metadata. Keep numeric ISO codes as strings to preserve leading zeroes.
// short_code is the alphabetic code used by selectors and conversion requests.
export interface Currency {
    id: number;
    name: string;
    short_code: string;
    code: string;
    precision: number;
    subunit: number;
    symbol: string;
    symbol_first: boolean;
    decimal_mark: string;
    thousands_separator: string;
}
