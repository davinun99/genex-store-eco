export const STORE = {
  name: "Genex Store",
  tagline: "Tecnología y accesorios",
  whatsapp: "595984849454",
  email: "nunezbenitezpablo@gmail.com",
  address: "Sobre Dr. Sosa, casi Avenida Madame Lynch",
  mapsUrl: "https://maps.app.goo.gl/Q8PyZxvsWVJMCSgR8",
};

export interface BankAccount {
  entity: string;
  type: string;
  number: string;
  holder: string;
  document: string;
}

export const BANK_ACCOUNTS: BankAccount[] = [
  {
    entity: "Banco Continental",
    type: "Cuenta bancaria",
    number: "010047049609",
    holder: "Pablo Manuel Nuñez Benitez",
    document: "CI 5.527.537",
  },
  {
    entity: "Tu Financia",
    type: "Cuenta bancaria",
    number: "2034889201",
    holder: "Pablo Manuel Nuñez Benitez",
    document: "CI 5.527.537",
  },
];

export const QUICK_ALIAS = [
  { label: "Alias por telefono", value: "0984 849 454" },
  { label: "Alias por cedula", value: "5527537" },
];
