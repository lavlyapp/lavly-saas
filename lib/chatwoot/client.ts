export class ChatwootClient {
  private baseUrl: string;
  private apiToken: string; // The Agent Bot Token or Account Access Token
  private accountId: string;

  constructor() {
    this.baseUrl = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";
    this.apiToken = process.env.CHATWOOT_API_TOKEN || "";
    this.accountId = process.env.CHATWOOT_ACCOUNT_ID || "";
  }

  /**
   * Envia uma mensagem para o cliente através do Chatwoot
   */
  async sendMessage(conversationId: number, content: string) {
    if (!this.apiToken || !this.accountId) return;

    const response = await fetch(
      `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": this.apiToken
        },
        body: JSON.stringify({
          content,
          message_type: "outgoing",
          private: false
        })
      }
    );

    if (!response.ok) {
      console.error("[Chatwoot] Erro ao enviar mensagem:", await response.text());
    }
  }

  /**
   * Transfere a conversa da IA para um humano (muda status para open e atribui a equipe se necessário)
   */
  async handoffToHuman(conversationId: number, messageToInternal: string = "⚠️ Handoff solicitado pelo Bot.") {
    if (!this.apiToken || !this.accountId) return;

    // 1. Enviar uma nota interna para o atendente humano saber o contexto
    await fetch(
      `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations/${conversationId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": this.apiToken
        },
        body: JSON.stringify({
          content: messageToInternal,
          message_type: "outgoing",
          private: true // Mensagem amarela, só os atendentes vêem
        })
      }
    );

    // 2. Mudar o status da conversa de 'bot' para 'open' (caixa de entrada humana)
    await fetch(
      `${this.baseUrl}/api/v1/accounts/${this.accountId}/conversations/${conversationId}/toggle_status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api_access_token": this.apiToken
        },
        body: JSON.stringify({
          status: "open"
        })
      }
    );
  }
}
