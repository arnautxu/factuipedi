import type { CatalogItem } from "@/types/database";

// Catàleg de 84 productes migrat de l'index.html original (EMBEDDED_CATALOG),
// usat com a fallback quan el catàleg de Supabase no està disponible.
export type EmbeddedCatalogItem = Pick<CatalogItem, "cat" | "code" | "description" | "price" | "price_text">;

export const EMBEDDED_CATALOG: EmbeddedCatalogItem[] = [
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.1",
    "description": "Volledige prothese (Acry-lux tanden) INMEDIAAT",
    "price": 375,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.2",
    "description": "Volledige prothese (Vita of Vivodent S PE tanden) Premium kwaliteit kunstanden DEFINITIVE",
    "price": 450,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.3",
    "description": "Kleine of middel prothese, 1 tot 4 elementen, inmediaat",
    "price": 165,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.4",
    "description": "Grote prothese, 5 of meer elemeten, inmediaat",
    "price": 250,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.5",
    "description": "Klein of Middel partiële prothese, 1 of 5 delen, Definitive",
    "price": 280,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.6",
    "description": "Grote partiële prothese, 5 of meer delen Definitive",
    "price": 385,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.7",
    "description": "Volledige Locators prothese (Acry-lux tanden+ metale versterking) *(prijs locator niet inbegrepen)",
    "price": 775,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Acrílica",
    "code": "1.8",
    "description": "Compleet, op Ackerman-bar (Vita of S PE tanden) (inclusief internal metale structuur en reteiners)",
    "price": 920,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Metálica",
    "code": "2.1",
    "description": "Frame skelet, 1 tot 4 elementen",
    "price": 465,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Metálica",
    "code": "2.2",
    "description": "Frame skelet, 5 of meer elementen",
    "price": 605,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Metálica",
    "code": "2.3",
    "description": "Invisible Frame – haakvrij systeem - 1 to 4 elementen",
    "price": 495,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Metálica",
    "code": "2.4",
    "description": "Invisible Frame – haakvrij systeem - 5 of meer",
    "price": 635,
    "price_text": null
  },
  {
    "cat": "Prótesis_Removible_Metálica",
    "code": "2.5",
    "description": "Skeletmetalstruktur",
    "price": 185,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.1",
    "description": "Eenvoudige breuk",
    "price": 60,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.2",
    "description": "Breuk met versterking",
    "price": 85,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.3",
    "description": "Een element toevoegen",
    "price": 75,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.4",
    "description": "Een haak toevoegen",
    "price": 75,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.5",
    "description": "Een element en een haak toevoegen",
    "price": 100,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.6",
    "description": "Twee elementen en een haak toevoegen",
    "price": 120,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.7",
    "description": "Opnieuw opvullen",
    "price": 80,
    "price_text": null
  },
  {
    "cat": "Composturas",
    "code": "3.8",
    "description": "Laserlassen voor skeletprothese",
    "price": 60,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.1",
    "description": "Zirkonium kroon, (Monolitik)",
    "price": 190,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.2",
    "description": "Gestratificeerde zirkonium kroon",
    "price": 230,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.3",
    "description": "Disilicate kroon",
    "price": 220,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.4",
    "description": "Disilicaat fineer",
    "price": 235,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.5",
    "description": "Langblijvende PMMA",
    "price": 50,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.6",
    "description": "Tijdelijk/Test CAD-CAM PMMA",
    "price": 20,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.7",
    "description": "Hoog esthetisch keramiek",
    "price": 400,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.8",
    "description": "Metaal-keramische kroon",
    "price": 205,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.9",
    "description": "Element Y. Bridge x Element",
    "price": 265,
    "price_text": null
  },
  {
    "cat": "Protesis_fija",
    "code": "4.10",
    "description": "Titanium Kroon (Monolitic)",
    "price": 170,
    "price_text": null
  },
  {
    "cat": "Implantes",
    "code": "5.1",
    "description": "Monolithisch zirkonia + Ti-base + schroefretentie, gecementeerd",
    "price": 430,
    "price_text": null
  },
  {
    "cat": "Implantes",
    "code": "5.2",
    "description": "Zirkonia met esthetische opbouw + Ti-base + schroefretentie, gecementeerd",
    "price": 465,
    "price_text": null
  },
  {
    "cat": "Implantes",
    "code": "5.3",
    "description": "Vol-anatomisch zirkonia, gecementeerd (zonder Ti-base)",
    "price": 240,
    "price_text": null
  },
  {
    "cat": "Implantes",
    "code": "5.4",
    "description": "Metaalkeramiek direct op implantaat (gesinterd/gefreesd)",
    "price": 470,
    "price_text": null
  },
  {
    "cat": "Implantes",
    "code": "5.5",
    "description": "Individuele abutment + metaalkeramische kroon (voor cementeren)",
    "price": 470,
    "price_text": null
  },
  {
    "cat": "Implantes",
    "code": "5.6",
    "description": "Interface + schroef + gecementeerd",
    "price": 200,
    "price_text": null
  },
  {
    "cat": "Cad_Cam_STL",
    "code": "6.1",
    "description": "Gefreesde titanium bar met schroefdraad voor Locator",
    "price": 1100,
    "price_text": null
  },
  {
    "cat": "Cad_Cam_STL",
    "code": "6.2",
    "description": "Akerman-bar van gefreesd titanium (2 implantaten)",
    "price": 700,
    "price_text": null
  },
  {
    "cat": "Cad_Cam_STL",
    "code": "6.3",
    "description": "6.5 Verhoging kosten voor extra implantaat op Akerman-bar",
    "price": 100,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.1",
    "description": "Y·brid PMMA full arch",
    "price": 2250,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.2",
    "description": "Y·brid 8 elementen composite",
    "price": 2350,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.3",
    "description": "Y·brid 9 elementen composite",
    "price": 2450,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.4",
    "description": "Y·brid 10 elementen composite",
    "price": 2550,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.5",
    "description": "Y·brid 11 elementen composite",
    "price": 2650,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.6",
    "description": "Y·brid 12 elementen composite",
    "price": 2750,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.7",
    "description": "Y·brid 13 elementen composite",
    "price": 2850,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.8",
    "description": "Y·brid 14 elementen composite",
    "price": 2950,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.9",
    "description": "Y·brid 8 elementen zirconio",
    "price": 2650,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.10",
    "description": "Y·brid 9 elementen zirconio",
    "price": 2850,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.11",
    "description": "Y·brid 10 elementen zirconio",
    "price": 2950,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.12",
    "description": "Y·brid 11 elementen zirconio",
    "price": 3150,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.13",
    "description": "Y·brid 12 elementen zirconio",
    "price": 3250,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.14",
    "description": "Y·brid 13 elementen zirconio",
    "price": 3350,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.15",
    "description": "Y·brid 14 elementen zirconio",
    "price": 3450,
    "price_text": null
  },
  {
    "cat": "Y·",
    "code": "7.16",
    "description": "Extra-lang Zircunium brug (5 elementen of knars patiënt)",
    "price": 265,
    "price_text": null
  },
  {
    "cat": "Ortodoncia",
    "code": "8.1",
    "description": "Gefreesde opbeetplaat (knarsplaat)",
    "price": 195,
    "price_text": null
  },
  {
    "cat": "Ortodoncia",
    "code": "8.2",
    "description": "Opbeetplaat AIVORIQ",
    "price": 165,
    "price_text": null
  },
  {
    "cat": "Ortodoncia",
    "code": "8.3",
    "description": "Semi-rigide opbeetplaat (Durasoft)",
    "price": 170,
    "price_text": null
  },
  {
    "cat": "Ortodoncia",
    "code": "8.4",
    "description": "Essix (zacht/hard) / nachtretainer",
    "price": 70,
    "price_text": null
  },
  {
    "cat": "Ortodoncia",
    "code": "8.5",
    "description": "Gesinterde retainer",
    "price": 80,
    "price_text": null
  },
  {
    "cat": "Ortodoncia",
    "code": "8.6",
    "description": "Bleeklepel",
    "price": 70,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.1",
    "description": "Analoge replica",
    "price": 22,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.2",
    "description": "Schroef",
    "price": 18,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.3",
    "description": "Cementering van titaniumstructuur",
    "price": 45,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.4",
    "description": "Verificatieproef voor implantaat",
    "price": 15,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.5",
    "description": "Gefreesd hoekgat",
    "price": 65,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.6",
    "description": "Roze tandvlees per stuk",
    "price": 23.5,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.7",
    "description": "Gegoten roze tandvlees",
    "price": 49.15,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.8",
    "description": "Basisplaat hars",
    "price": 16.33,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.9",
    "description": "Cut-back stratificatie",
    "price": 38.23,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.10",
    "description": "Titanium anodisatie",
    "price": 59.3,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.11",
    "description": "Mock-up ontwerp: 3D-print + silicone vorm",
    "price": 190.95,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.12",
    "description": "3D-model",
    "price": 20,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.13",
    "description": "Digitale replica",
    "price": 38.55,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.14",
    "description": "EXTRA Ackerman-BAAR rentenier per eenheid",
    "price": 48.55,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.15",
    "description": "Mock-up ontwerp: inyection model.",
    "price": 200,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.16",
    "description": "Metalen capsule voor attachement",
    "price": 35,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.17",
    "description": "Overhemd / Teflon",
    "price": 15,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.18",
    "description": "Harsplaat",
    "price": 35,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.19",
    "description": "Individuele harslepel",
    "price": 40,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.20",
    "description": "Trubax-plaat",
    "price": 35,
    "price_text": null
  },
  {
    "cat": "Varios",
    "code": "9.21",
    "description": "Scan body",
    "price": null,
    "price_text": "precio proveedor"
  },
  {
    "cat": "Varios",
    "code": "9.22",
    "description": "9.11 Internationaal transport DHL luchtvracht",
    "price": null,
    "price_text": "según tarifa"
  }
];
