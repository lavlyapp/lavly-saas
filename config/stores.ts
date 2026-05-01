export interface StoreConfig {
  id: string;
  name: string;
  address: string;
  pricing: {
    wash_price: number;
    dry_price: number;
    wash_duration_minutes: number;
    dry_duration_minutes: number;
  };
  promotions: string[];
  rules: string[];
  business_hours: string;
}

// Arquivo de configuração claro e fácil de editar para cada lavanderia.
// Isso será lido pelo agente de IA para formular as respostas corretamente.
export const storesConfig: Record<string, StoreConfig> = {
  "default": {
    id: "default",
    name: "Lavly Premium",
    address: "Endereço principal",
    pricing: {
      wash_price: 18.00,
      dry_price: 18.00,
      wash_duration_minutes: 40,
      dry_duration_minutes: 45
    },
    promotions: [
      "Na compra de uma assinatura Comfort, ganhe um Aromatizador de brinde no primeiro mês."
    ],
    rules: [
      "As máquinas suportam até 10kg de roupas ou 1 edredom de casal padrão.",
      "O pagamento deve ser feito exclusivamente pelo aplicativo VMPay ou no totem da loja.",
      "Não é permitido lavar tapetes pesados ou calçados sujos de barro."
    ],
    business_hours: "Todos os dias, das 06:00 às 23:00."
  },
  "loja_centro": {
    id: "loja_centro",
    name: "Lavly Centro",
    address: "Rua das Flores, 123 - Centro",
    pricing: {
      wash_price: 17.00, // Preço promocional nesta loja
      dry_price: 17.00,
      wash_duration_minutes: 40,
      dry_duration_minutes: 45
    },
    promotions: [
      "Terça-feira promocional: Lavagem por R$15,00."
    ],
    rules: [
      "As máquinas suportam até 10kg de roupas ou 1 edredom de casal padrão.",
      "O pagamento deve ser feito exclusivamente pelo aplicativo VMPay ou no totem da loja."
    ],
    business_hours: "24 horas por dia."
  }
};
