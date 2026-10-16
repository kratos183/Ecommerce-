/**
 * Shared client-supplied input validation.
 *
 * Lives here rather than in a `route.ts` file because Next.js route modules may only export
 * HTTP methods and route config — exporting a helper from one fails route type generation.
 */

export type AddressInput = {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
};

/** Validates an address payload, returning field-keyed messages for the form to render. */
export function validateAddress(input: Partial<AddressInput>) {
  const errors: Record<string, string> = {};
  const value = (key: keyof AddressInput) => String(input[key] ?? "").trim();

  if (!value("fullName")) errors.fullName = "Full name is required";
  if (!value("phone")) {
    errors.phone = "Phone number is required";
  } else if (!/^[0-9+\-\s()]{7,20}$/.test(value("phone"))) {
    errors.phone = "Enter a valid phone number";
  }
  if (!value("line1")) errors.line1 = "Address line 1 is required";
  if (!value("city")) errors.city = "City is required";
  if (!value("state")) errors.state = "State is required";
  if (!value("pincode")) {
    errors.pincode = "PIN code is required";
  } else if (!/^[0-9]{4,10}$/.test(value("pincode"))) {
    errors.pincode = "Enter a valid PIN code";
  }

  return errors;
}

/** Formats a number as Indian Rupees, matching the rest of the storefront. */
export function formatINR(value: number | string): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
