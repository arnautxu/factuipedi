export type LineItem = {
  code: string;
  description: string;
  qty: string;
  price: string;
  priceText: string;
  // Nota informativa de descompte (p. ex. "10%"): no s'inclou en el càlcul del
  // Bedrag ni es desa a la base de dades — és un recordatori perquè qui revisa
  // ajusti el preu manualment.
  discount: string;
};

export function newLine(): LineItem {
  return { code: "", description: "", qty: "", price: "", priceText: "", discount: "" };
}

export type AlbaranHeader = {
  pakbonnummer: string;
  inkomstdatum: string;
  uitgiftedatum: string;
  naam_patient: string;
  geboortedatum: string;
  behandelaar: string;
  klant_regel2: string;
  kleur: string;
  in_opdracht: string;
};

export function emptyHeader(): AlbaranHeader {
  return {
    pakbonnummer: "",
    inkomstdatum: "",
    uitgiftedatum: "",
    naam_patient: "",
    geboortedatum: "",
    behandelaar: "",
    klant_regel2: "",
    kleur: "",
    in_opdracht: "",
  };
}
