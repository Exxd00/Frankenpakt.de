// Approved gross references for the described scope in Nürnberg, in cents.
// Edit the references here, then run node web/make-pages.mjs.
const referenceCents = {
  sofa: 8000,       // LV Transporte, ein übliches Einzelmöbel (Sofa, Schrank)
  keller: 15000,    // LV Transporte, Kellerabteil bis 6 m²
  kellerMittel: 35000, // ein Kellerabteil über 6 bis 12 m²
  kellerGross: 65000,  // ein Kellerabteil über 12 bis 25 m²
  kleinumzug: 30000 // Umzüge Selisch, 1–2 Zimmer, bis 50 km
};

const differenceCents = 200;
export const scenarioPrices = Object.fromEntries(Object.entries(referenceCents).map(([key, cents]) => {
  if (!Number.isSafeInteger(cents) || cents <= differenceCents) throw new Error('Invalid reference price for '+key);
  return [key, (cents - differenceCents) / 100];
}));
