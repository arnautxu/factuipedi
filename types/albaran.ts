export type LineItem = {
  code: string;
  description: string;
  qty: string;
  price: string;
  priceText: string;
};

export function newLine(): LineItem {
  return { code: "", description: "", qty: "", price: "", priceText: "" };
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
