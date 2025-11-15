/**
 * Normalizes the phone number and returns the SMS target payload.
 */
export function buildSmsPayload(
  dialCode: string | undefined,
  phoneNumber: string
): {
  target: string;
  normalizedNumber: string;
} {
  const normalizedNumber = phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber;
  return {
    normalizedNumber,
    target: `${dialCode ?? ''}${normalizedNumber}`,
  };
}
