const A = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
const B = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
const two = (n) => (n < 20 ? A[n] : B[Math.floor(n / 10)] + (n % 10 ? " " + A[n % 10] : ""));
const three = (n) => { const h = Math.floor(n / 100), r = n % 100; return [h ? A[h] + " Hundred" : "", r ? two(r) : ""].filter(Boolean).join(" "); };

// Indian numbering (lakh / crore)
export function rupeesInWords(amount) {
  const total = Math.round((+amount || 0) * 100), r = Math.floor(total / 100), p = total % 100;
  if (!total) return "Zero";
  const parts = [[Math.floor(r / 1e7), "Crore"], [Math.floor((r % 1e7) / 1e5), "Lakh"], [Math.floor((r % 1e5) / 1e3), "Thousand"], [r % 1e3, ""]]
    .filter(([n]) => n).map(([n, u]) => (n < 100 && u ? two(n) : three(n)) + (u ? " " + u : ""));
  return `Rupees ${parts.join(" ") || "Zero"}${p ? ` and ${two(p)} Paise` : ""} Only`;
}
