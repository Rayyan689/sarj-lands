// Shared by the forms and the API so both sides agree.

/** Converts Arabic-Indic and Persian digits to Latin. */
export function latinDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Returns a Saudi mobile as 05XXXXXXXX, or null if it isn't one. Accepts +966, 966, 00966, 05 and 5 prefixes. */
export function normalizeSaudiMobile(input: string): string | null {
  let d = latinDigits(String(input ?? "")).replace(/[^\d+]/g, "");
  d = d.replace(/^\+/, "").replace(/^00/, "");
  if (d.startsWith("966")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  return /^5\d{8}$/.test(d) ? `0${d}` : null;
}

export function cleanName(input: string): string | null {
  const n = String(input ?? "").replace(/\s+/g, " ").trim();
  return n.length >= 2 && n.length <= 80 ? n : null;
}

export const ERR = {
  phone: { ar: "رقم الجوال لازم يكون سعودي، يبدأ بـ 05 ويكون 10 أرقام.", en: "Please enter a Saudi mobile number, starting with 05 and 10 digits long." },
  name: { ar: "اكتب اسمك (حرفين على الأقل).", en: "Please enter your name (at least 2 letters)." },
  network: { ar: "ما ضبط الإرسال، تأكد من النت وجرّب مرة ثانية.", en: "That didn't go through. Check your connection and try again." },
};
