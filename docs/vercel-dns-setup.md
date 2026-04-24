# Guia de Configuração de Domínio (Vercel + Registro.br)

Este guia explica como configurar os domínios `lavly.com.br`, `www.lavly.com.br` e `teste.lavly.com.br` para apontarem corretamente para o projeto na Vercel.

## Passo 1: O que fazer na Vercel
Você precisa gerar a "credencial de apontamento" na sua conta da Vercel:

1. Abra seu projeto do `vmpay-saas` na **Vercel** (vercel.com).
2. Vá na aba **Settings** > **Domains**.
3. No campo em branco, adicione os domínios um por vez e clique em **Add**:
   - `lavly.com.br` (A Vercel vai recomendar adicionar o `www.lavly.com.br` junto com redirecionamento. É o recomendado, basta aceitar).
   - `teste.lavly.com.br`
4. Após adicionar, eles vão ficar com a situação de erro vermelho (Invalid Configuration), pois você precisa conectar o DNS. A Vercel mostrará os dados que você deve colar lá no site do seu domínio.

---

## Passo 2: O que fazer no Registro.br
Existem **duas formas** de fazer isso no Registro.br. Escolha a que se adequa melhor ao seu caso:

### Opção A: Alterar os Servidores DNS (Recomendado)
*Se você NÃO tem um serviço de e-mail profissional (ex: `contato@lavly.com.br`) configurado direto no Registro.br, essa é a melhor opção.*

1. Entre no **Registro.br**, faça login e clique no seu domínio (`lavly.com.br`).
2. Desça a página até a seção **DNS**.
3. Clique em **"Alterar Servidores DNS"**.
4. Na tela da Vercel (na aba de domínios do passo anterior), ative a opção Nameservers se estiver disponível. Ela fornecerá os servidores (geralmente `ns1.vercel-dns.com` e `ns2.vercel-dns.com`).
5. Cole o **Master** (ns1) e o **Slave 1** (ns2) no Registro.br e salve.
6. Pronto! A Vercel cuidará automaticamente de todo o roteamento e do certificado SSL/HTTPS.

### Opção B: Editar a Zona de DNS Manualmente
*Se você JÁ TEM e-mails profissionais criados para esse domínio, use esta opção para não tirá-los do ar.*

1. No **Registro.br**, clique no seu domínio e desça até a seção **DNS**.
2. Clique em **"Editar Zona"** (se o botão for "Configurar Endereçamento", clique nele primeiro e escolha o "Modo Avançado").
3. Clique em **"Nova Entrada"** e adicione os 3 apontamentos exigidos pela Vercel:
   
   **Para o domínio raiz (lavly.com.br):**
   - **Nome:** (deixe em branco)
   - **Tipo:** `A`
   - **Valor/Destino:** `76.76.21.21` (Ou o IP exato que a Vercel mostrar na tela)

   **Para o subdomínio www:**
   - **Nome:** `www`
   - **Tipo:** `CNAME`
   - **Valor/Destino:** `cname.vercel-dns.com`

   **Para o subdomínio de teste:**
   - **Nome:** `teste`
   - **Tipo:** `CNAME`
   - **Valor/Destino:** `cname.vercel-dns.com`

4. Salve as alterações.

---

**⚠️ Tempo de Propagação:** Após fazer o processo no Registro.br, pode levar de alguns minutos até algumas horas para o site "propagar" pelos servidores do mundo todo e começar a abrir. A própria Vercel vai mostrar um check verde (✅) na tela de domínios quando estiver tudo finalizado e funcionando.
