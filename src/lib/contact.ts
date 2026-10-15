export const WHATSAPP = "966535662255";
export function waLink(text: string) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}
