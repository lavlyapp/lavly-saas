# Projeto: Lavly SaaS

## O que é
SaaS B2B para donos de lavanderias self-service monitorarem máquinas VMPay,
finanças, CRM de clientes, climatização e automações.

## Repositório
- **GitHub:** https://github.com/lavlyapp/lavly-saas
- **Produção:** https://www.lavly.com.br (branch `main`)
- **Staging:** https://teste.lavly.com.br (branch `staging`)

## ⛔ Regras invioláveis de timezone
> **Os dados da API VMPay já chegam com o horário correto. NUNCA aplicar conversão,
> offset ou ajuste de fuso horário nos dados de vendas sem pedido EXPLÍCITO do Eduardo.**
> Histórico: IAs anteriores "corrigiram" fuso por conta própria e quebraram os cálculos.
> Se algum horário parecer errado, REPORTAR ao Eduardo antes de alterar qualquer código.

## ⛔ Fórmulas de negócio invioláveis
> Estas fórmulas foram definidas pelo Eduardo e são VERDADE ABSOLUTA do projeto.
> IAs anteriores as alteravam "por conta própria" repetidamente. NUNCA mudá-las sem pedido explícito.

1. **Ticket Médio = Faturamento ÷ Clientes Atendidos (únicos)**
   - NUNCA dividir por número de transações. Onde está implementado:
     `app/api/metrics/financial/route.ts`, `app/api/metrics/comparative/route.ts`,
     `lib/processing/crm.ts` (globalAverageTicket), `lib/processing/crm_edge_adapter.ts`
2. **Cestos (lavagens/secagens)** — classificação canônica por `service`:
   - Lavagem: `upper(service) LIKE '%LAV%' OR '%30 MIN%'`
   - Secagem: `upper(service) LIKE '%SEC%' OR '%45 MIN%'`
   - Fonte: `mv_orders_daily` somando `qtd_ciclos`. NUNCA reescrever essa classificação.
3. **Gênero dos clientes** — valores `M`/`F`/`U` na coluna `customers.gender`.
   - O sync de clientes (`syncVMPayCustomers`) DEVE sempre preservar/gravar o gender.
   - NUNCA remover o campo gender de upserts da tabela customers.

## Regra de ouro de branches
> **Todo desenvolvimento vai para `staging` primeiro.**
> Só vai para `main` quando Eduardo aprovar explicitamente com "pode subir para produção".
> NUNCA fazer push para `main` sem essa aprovação.

## Stack
- **Frontend/Backend:** Next.js 14 (App Router) + TypeScript
- **Banco:** Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Vercel (plano Hobby — limite de 60s por função serverless)
- **CLIs:** gh, vercel, supabase (todas autenticadas)

## Integrações
| Integração | Finalidade |
|---|---|
| VMPay | Pagamentos das máquinas de lavar |
| Tuya | Automação de ar-condicionado |
| WhatsApp Cloud API | Notificações para clientes |
| Chatwoot | CRM / atendimento |
| Gemini AI | IA generativa |

## Banco de Dados
- Patches SQL nomeados `lavly_patch_vXX_*.sql` na raiz do projeto
- Versões de v5 a v41 (31 patches aplicados)
- Projeto Supabase: ref `ftbhivcltxoakwjuvqax` (West US Oregon)
- Views materializadas: `mv_orders_daily`, `mv_sales_daily`
- RPC principal: `get_financial_dashboard_metrics` (lê da tabela `sales` ao vivo)
- RPC de refresh: `refresh_lavly_materialized_views`

## CLIs instaladas
- `gh` → `C:\Users\eduar\AppData\Local\gh-cli\bin\gh.exe` (conta: lavlyapp)
- `vercel` → `C:\Users\eduar\AppData\Roaming\npm\vercel.ps1` (conta: lavlyapps-projects)
- `supabase` → `C:\Users\eduar\AppData\Roaming\npm\supabase.ps1` (linkado ao projeto)

## Usuário principal
- **Email:** eduardofbmoura@gmail.com
- **Role:** proprietario
- **Lojas atribuídas:** 7 lojas

## Arquitetura de Sync VMPay
- GitHub Actions (`.github/workflows/vmpay-sync.yml`) dispara cron a cada 30min (10h–17h BRT)
- Chama `/api/vmpay/cron/sync` em www e teste com Bearer token
- Sync paralelo por API Key (Promise.all) para caber nos 60s da Vercel
- Janela de lookback: 12h (cobre qualquer gap entre execuções)

## Arquivos críticos
| Arquivo | Função |
|---|---|
| `lib/automation/sync-manager.ts` | Lógica central de sync VMPay |
| `lib/vmpay-config.ts` | Credenciais e normalização de nomes de lojas |
| `app/api/vmpay/cron/sync/route.ts` | Endpoint do cron (maxDuration=60) |
| `app/api/vmpay/sync/route.ts` | Endpoint de sync manual |
| `app/api/metrics/financial/route.ts` | Dashboard financeiro (maxDuration=60) |
| `app/api/metrics/machines/route.ts` | Monitor de máquinas |
| `components/modules/MachineMonitor.tsx` | UI do monitor de máquinas |
| `.github/workflows/vmpay-sync.yml` | Cron de sync automático |

## Lojas ativas (Eduardo)
- Lavateria Cascavel
- Lavateria SANTOS DUMONT
- Lavateria JOSE WALTER
- Lavateria SHOPPING (Maracanau)
- Lavateria SHOPPING SOLARES
- Lavateria JOQUEI
