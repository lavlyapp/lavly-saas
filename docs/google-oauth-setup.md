# Configuração Google OAuth para Supabase

**PASSO 1: Criar o Projeto no Google Cloud**
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/) e faça login com uma conta Google.
2. No topo esquerdo (ao lado da logo do Google Cloud), clique em **"Select a Project"** (Selecionar um Projeto) e depois em **"New Project"** (Novo Projeto).
3. Dê o nome de `Lavly SaaS` e clique em **Criar**.
4. Aguarde alguns segundos até criar e certifique-se de que o projeto `Lavly SaaS` está selecionado no menu do topo.

**PASSO 2: Configurar a Tela de Consentimento (OAuth Consent Screen)**
1. No menu lateral esquerdo (hambúrguer), vá em **"APIs & Services"** (APIs e Serviços) > **"OAuth consent screen"** (Tela de consentimento OAuth).
2. Escolha **"External"** (Externo) e clique em **Create** (Criar).
3. Preencha os campos obrigatórios:
   - **App name:** `Lavly`
   - **User support email:** (Coloque o seu e-mail)
   - **Developer contact information:** (Coloque o seu e-mail de novo)
4. Role até o final e clique em **Save and Continue** (Salvar e Continuar) umas 3 vezes até terminar.
 *(Não se preocupe em preencher logomarca ou domínios agora, apenas vá em salvar e continuar)*.
5. Volte para o Painel da Tela de Consentimento (Menu Esquerdo) e clique em **"Publish App"** (Publicar Aplicativo) para que ele saia da fase de testes.

**PASSO 3: Criar as Chaves (Client ID e Secret)**
1. Ainda no menu lateral esquerdo de **APIs & Services**, agora clique em **"Credentials"** (Credenciais).
2. No topo da página, clique no botão azul **"+ CREATE CREDENTIALS"** (Criar Credenciais).
3. Escolha **"OAuth client ID"** (ID do cliente OAuth).
4. No campo "Application type" (Tipo de Aplicativo), selecione **"Web application"** (Aplicativo da Web).
5. Nome: pode deixar `Web client 1` (ou mude para Lavly Autenticação).

Agora a **parte principal**: Role a página até encontrar o campo **"Authorized redirect URIs"** (URIs de redirecionamento autorizados).
1. Clique em **+ ADD URI**.
2. Vá até a sua tela do Supabase e copie o "Callback URL (for OAuth)". Exemplo: `https://[ID_DO_SEU_PROJETO].supabase.co/auth/v1/callback`
3. Cole exatamente essa URL no campo lá no Google Cloud.
4. Clique em **Create** (Criar).

**PASSO FINAL: Colar no Supabase**
Uma janelinha vai abrir no Google dizendo "OAuth client created" com duas chaves.
1. Copie o **Client ID** e cole no 1º campo da sua tela do Supabase do provedor do Google.
2. Copie o **Client Secret** e cole no 2º campo do Supabase.
3. Ligue o botão de "Enable Sign In with Google".
4. Clique no botão Verde **Save** do Supabase!
