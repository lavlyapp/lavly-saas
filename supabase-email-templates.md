# Configuração de E-mails - Supabase (Lavly)

Para que os e-mails do sistema não cheguem com o endereço padrão (`noreply@mail.app.supabase.io`) e com cara de fraude, siga os passos abaixo no painel do Supabase.

## Passo 1: Configurar um Remetente Próprio (SMTP)

O Supabase não permite mudar o e-mail de envio no plano gratuito usando a infra deles. Para usar algo como `acesso@lavly.com.br`, você precisa plugar um SMTP próprio.

1. No painel do seu Supabase, vá no menu lateral esquerdo em **Authentication** e depois clique em **SMTP**.
2. Ative a chave **"Enable Custom SMTP"**.
3. Preencha os dados do seu provedor de e-mail corporativo.
   - **Dica:** Se você usa o e-mail corporativo (Hostinger, Gmail Enterprise, Zoho, etc), basta colocar os dados de Host e Port deles. Uma excelente alternativa gratuita (até 3.000 emails/mês) focada em SaaS é o [Resend](https://resend.com/).

---

## Passo 2: Novos Textos para os E-mails (Design Profissional)

Vá em **Authentication > Email Templates**. Lá você encontra as abas para cada tipo de e-mail. Vamos trocar o código padrão deles pelo HTML abaixo.

### 1. Aba "Magic Link" (Acesso seguro sem senha)
**Subject:** `Seu link de acesso seguro à Lavly 🚀`

**Source code (Message):**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; background-color: #f9fafb;">
  <div style="text-align: center; margin-bottom: 30px;">
    <!-- Dica: Coloque a URL da sua logo no src abaixo se quiser a imagem da lavly -->
    <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: 800;">Lavly</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Acesso Seguro Lavly</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
      Olá! Recebemos um pedido de acesso para a sua conta na plataforma tecnológica da <strong>Lavly</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
      Para entrar no seu painel de forma segura, sem precisar de senhas, basta clicar no botão abaixo. Este link mágico expira em algumas horas e é de uso único.
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{ .ConfirmationURL }}" style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);">
        Acessar minha conta
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      Se você não solicitou este link, pode ignorar e deletar este e-mail com segurança. Ninguém acessou sua conta.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #9CA3AF;">
    <p>© 2024 Lavly - Inteligência para Lavanderias.<br>Todos os direitos reservados.</p>
  </div>
</div>
```

### 2. Aba "Invite User" (Convites do Painel Admin)
**Subject:** `Convite Lavly: Bem-vindo(a) ao seu novo painel de inteligência! 📊`

**Source code (Message):**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; background-color: #f9fafb;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin: 0; font-size: 28px; font-weight: 800;">Lavly</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 40px 30px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <h2 style="margin-top: 0; color: #111827; font-size: 20px;">Conta Criada com Sucesso!</h2>
    <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
      É um prazer tê-lo(a) conosco na <strong>Lavly</strong>. Sua conta administrativa foi preparada e suas lojas já estão sendo sincronizadas automaticamente com nossos servidores.
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4B5563;">
      A partir de agora, você tem acesso ao nosso ecossistema completo para monitorar suas máquinas, prever o comportamento de compra dos clientes e maximizar seu faturamento.
    </p>
    
    <div style="text-align: center; margin: 35px 0;">
      <a href="{{ .ConfirmationURL }}" style="background-color: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
        Ativar Conta e Acessar Painel
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6B7280; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
      Nossa missão é simplificar a gestão da sua lavanderia. Se tiver alguma dúvida nos primeiros passos, nossa equipe técnica está à sua inteira disposição.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 25px; font-size: 12px; color: #9CA3AF;">
    <p>© 2024 Lavly - Inteligência para Lavanderias.<br>Todos os direitos reservados.</p>
  </div>
</div>
```
