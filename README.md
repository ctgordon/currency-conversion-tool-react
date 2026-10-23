# Currency conversion tool

A React and TypeScript application that loads supported currencies from CurrencyBeacon and converts an amount when the user submits the form. Bootstrap supplies the interface styling, and Vite runs the local development server and builds the application.

## Layout and styling

Bootstrap is used to lay out and style the application. Its containers, cards, navigation, spacing utilities, form controls, buttons, and alerts provide a consistent interface. Bootstrap CSS and its JavaScript bundle are imported in `src/App.tsx`; the layout is composed using Bootstrap classes in the React components.

## Run locally

Prerequisites: npm, a CurrencyBeacon API key with access to the currencies and conversion endpoints, and a Node.js version supported by the installed Vite release (`^20.19.0` or `>=22.12.0`).

1. Open a terminal in the project directory and install dependencies:

   ```sh
   npm ci
   ```

2. Create your local environment file if it does not already exist:

   ```sh
   cp .env.example .env.local
   ```

3. Edit `.env.local` and replace the placeholder with your API key:

   ```dotenv
   CURRENCYBEACON_API_KEY=your_api_key_here
   ```

   `.env.local` is ignored by Git. Keep the variable server-only: do not add a `VITE_` prefix.

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Open the local URL printed by Vite, usually `http://localhost:5173`. Wait for currencies to load, choose the source and destination, enter an amount, and select **Convert**.

Restart the development server after changing `.env.local`. An internet connection and a valid API key are required to load currencies and perform conversions.

## Checks and builds

```sh
npm run lint
npm run build
node --test tests/currencyService.test.mjs
```

The build includes TypeScript checking and writes deployable frontend assets to `dist/`. Service tests mock requests and cover malformed JSON, invalid response envelopes, currency metadata validation, invalid conversion values, cancellation, HTTP/API errors, and the same-origin request URL. They do not verify live credentials, provider availability, or browser interactions.

Use `npm run preview` to inspect a built frontend locally. This is a local preview server, not a production backend.

## Application structure

- `src/main.tsx`: mounts React and enables development StrictMode checks.
- `src/App.tsx`: application layout and Bootstrap imports.
- `src/components/CurrencyConverter.tsx`: owns form state, currency loading, conversion requests, and feedback.
- `src/components/CurrencySelect.tsx`: controlled selector displaying a code and name.
- `src/components/AmountInput.tsx`: controlled decimal input that filters invalid edits.
- `src/services/currencyService.ts`: requests, cancellation, runtime validation, and endpoint-specific results.
- `src/types/currency.ts`: shared currency metadata matching the API field names.
- `vite.config.ts`: local proxy and server-side authentication.

## Decisions and assumptions

### API access and credentials

Browser requests use `/api/currency/currencies` and `/api/currency/convert`. Vite forwards these to `https://api.currencybeacon.com/v1/*` and adds the key as a Bearer authorization header. This avoids relying on the provider's CORS headers and keeps the key out of frontend bundles and browser request URLs.

A production deployment must provide an equivalent server-side route and keep credentials in the server environment. Publishing `dist/` alone does not provide this proxy. The local proxy is intended for development.

### Currency data and defaults

Currency metadata is retained as `Currency[]`, including names, symbols, precision, and separators. The selected values remain alphabetic `short_code` strings because that is what conversion requests need. Numeric ISO `code` values remain strings to preserve leading zeroes.

Source defaults to GBP and destination to EUR when supported. If either is missing, the converter chooses supported alternatives and prefers distinct currencies. With only one supported currency, both selectors use it. An empty list is shown as an error. Users may deliberately select the same currency in both selectors.

### Amounts and results

Amounts accept ASCII digits and one period as the decimal separator. Empty values and a lone decimal point are allowed while editing, but cannot be submitted. Zero and fractional amounts are valid; negative amounts, exponent notation, grouping separators, and locale-specific decimal commas are not supported.

The converter uses JavaScript numbers and displays the numeric result returned by the API. Currency metadata is retained, but precision, symbol placement, and locale-specific formatting are not yet applied. This is not an arbitrary-precision accounting implementation.

### React state and request lifecycle

`useEffect` loads currencies on mount; `useState` stores the currency list, selections, amount, result, loading states, and errors. Conversion happens on form submission rather than on every keystroke, reducing requests and keeping the interaction straightforward.

The fieldset is disabled while converting, so inputs cannot change underneath an active request. A controller ref also prevents duplicate submissions. Editing an input clears the previous result and conversion error. The button stays disabled until the form contains a valid amount and supported selections.

Requests accept optional `AbortSignal` values and are aborted on unmount. Cancellation is separate from mounting: an aborted conversion returns to idle if the component remains mounted. Cleanup also supports StrictMode's development effect replay. There is currently no user-facing Cancel button.

### Error handling and feedback

The service checks HTTP status, JSON parsing, the API envelope, all required currency fields, and conversion values. Missing, nonnumeric, negative, or non-finite conversion results are errors even when HTTP status is successful. Zero remains a valid result. Cancellation errors are preserved by the service and suppressed as user-facing errors when caused by component cleanup.

Loading and conversion errors are separate, and a conversion can be retried by submitting again. Currency loading currently has no dedicated retry control; reload the page after resolving a loading failure. Requests have no automatic retry, caching, or application-level timeout.

Labels associate inputs with their descriptions, and status/error messages use live-region semantics. The result panel is rendered only when the result is not null, so zero is displayed. Its current alert wrapper contains an `output` element, which may cause redundant announcements in some assistive technologies; screen-reader behavior has not been manually verified.
