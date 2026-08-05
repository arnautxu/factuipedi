export type CatalogItem = {
  id: string;
  cat: string;
  code: string;
  description: string;
  price: number | null;
  price_text: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  naam_patient: string | null;
  geboortedatum: string | null;
  behandelaar: string | null;
  klant_regel2: string | null;
  in_opdracht: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryNoteSource = "created" | "uploaded" | "combined";

export type DeliveryNote = {
  id: string;
  client_id: string | null;
  pakbonnummer: string | null;
  inkomstdatum: string | null;
  uitgiftedatum: string | null;
  naam_patient: string | null;
  geboortedatum: string | null;
  behandelaar: string | null;
  klant_regel2: string | null;
  kleur: string | null;
  in_opdracht: string | null;
  source: DeliveryNoteSource;
  total: number | null;
  pdf_storage_path: string | null;
  created_at: string;
};

export type DeliveryNoteLine = {
  id: string;
  delivery_note_id: string;
  position: number;
  code: string | null;
  description: string | null;
  qty: number | null;
  price: number | null;
  price_text: string | null;
};

export type UploadedDocumentStatus = "pending" | "extracted" | "reviewed" | "failed";

export type UploadedDocument = {
  id: string;
  client_id: string;
  storage_path: string;
  original_filename: string | null;
  status: UploadedDocumentStatus;
  extraction_raw: unknown;
  delivery_note_id: string | null;
  uploaded_at: string;
};

export type Database = {
  public: {
    Tables: {
      catalog_items: { Row: CatalogItem; Insert: Partial<CatalogItem>; Update: Partial<CatalogItem> };
      clients: { Row: Client; Insert: Partial<Client>; Update: Partial<Client> };
      delivery_notes: { Row: DeliveryNote; Insert: Partial<DeliveryNote>; Update: Partial<DeliveryNote> };
      delivery_note_lines: { Row: DeliveryNoteLine; Insert: Partial<DeliveryNoteLine>; Update: Partial<DeliveryNoteLine> };
      uploaded_documents: { Row: UploadedDocument; Insert: Partial<UploadedDocument>; Update: Partial<UploadedDocument> };
    };
  };
};
