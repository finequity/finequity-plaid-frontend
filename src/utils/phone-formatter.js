/**
 * Normalize a US phone number pulled from a URL query param into E.164 form.
 *
 * Phone numbers arrive in inconsistent shapes, e.g.:
 *   "415-555-1234"      (dashes)
 *   "4155551234"        (bare 10 digits, no country code)
 *   "+14155551234"      (already E.164)
 *   "14155551234"       (11 digits with a leading 1)
 *   "(415) 555-1234"    (punctuation / spaces)
 *
 * Note: URLSearchParams decodes "+" as a space, so a "+1..." prefix in the URL
 * arrives here as " 1...". Stripping all non-digits handles that too.
 *
 * @param {string|null|undefined} raw - the raw phone_number query value
 * @returns {string|null} the number as "+1XXXXXXXXXX", or null if it isn't a
 *   valid 10-digit US number.
 */
export function formatUsPhoneNumber(raw) {
    if (raw == null) return null;

    // Keep digits only — drops dashes, spaces, parentheses, "+", etc.
    let digits = String(raw).replace(/\D/g, "");

    // If the number already carries the US country code, peel it off here so we
    // don't double it below. The "+1" is always added back on return, so the
    // country code ends up present either way.
    if (digits.length === 11 && digits.startsWith("1")) {
        digits = digits.slice(1);
    }

    // A valid US number is exactly 10 digits (national number, no country code).
    if (digits.length !== 10) return null;

    // Always return with the "+1" country code prefix included.
    return `+1${digits}`;
}
