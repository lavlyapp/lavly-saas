import Link from 'next/link';
import { ArrowRight, Activity, BarChart3, Users, Smartphone, ShieldCheck, Zap, MessageCircle } from 'lucide-react';

export const metadata = {
  title: 'Lavly | A inteligência que a sua lavanderia precisa',
  description: 'Monitore máquinas, faturamento e clientes em tempo real.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">

      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[50%] bg-emerald-600/20 blur-[100px] rounded-full animate-pulse opacity-50 animation-delay-2000"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-xl tracking-tighter">L</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Lavly</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">Recursos</a>
            <a href="#testimonials" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors hidden md:block">Depoimentos</a>
            <Link
              href="/dashboard"
              className="group relative px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="text-sm font-medium text-white relative z-10">Acesso Restrito</span>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-white group-hover:translate-x-1 transition-all relative z-10" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mt-12 md:mt-24 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Sincronização em Tempo Real VMPay
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 max-w-4xl leading-tight">
            A inteligência que a sua <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">lavanderia precisa.</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 leading-relaxed">
            Substitua planilhas por um painel de controle operante. Monitore o ciclo de vida de cada máquina, descubra métricas avançadas de clientes e preveja seu faturamento instantaneamente.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/dashboard"
              className="px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-3 hover:-translate-y-1"
            >
              Acessar meu Painel
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#whatsapp"
              className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all flex items-center justify-center gap-3 backdrop-blur-sm hover:-translate-y-1"
            >
              Falar com Vendas
            </a>
          </div>
        </div>

        {/* Mocked Analytics Dashboard Preview */}
        <div className="relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-neutral-900/50 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 p-2">
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 to-transparent pointer-events-none z-10"></div>
          <div className="border border-white/5 rounded-xl bg-neutral-950/50 p-6 opacity-80 pointer-events-none">
            {/* Fake Header */}
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
              <div className="flex gap-4 items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
                <div>
                  <div className="h-4 w-32 bg-white/10 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-white/5 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-white/5 rounded-lg"></div>
                <div className="h-8 w-24 bg-white/5 rounded-lg"></div>
              </div>
            </div>
            {/* Fake Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="h-32 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-end">
                <div className="h-8 w-2/3 bg-white/10 rounded mb-2"></div>
                <div className="h-4 w-1/3 bg-emerald-500/20 rounded"></div>
              </div>
              <div className="h-32 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-end">
                <div className="h-8 w-1/2 bg-white/10 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-white/5 rounded"></div>
              </div>
              <div className="h-32 rounded-xl bg-white/5 border border-white/5 p-4 flex flex-col justify-end">
                <div className="h-8 w-2/3 bg-white/10 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-white/5 rounded"></div>
              </div>
            </div>
            {/* Fake Chart */}
            <div className="h-48 rounded-xl bg-white/5 border border-white/5 flex items-end p-4 gap-2">
              {[40, 70, 45, 90, 60, 100, 80].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-indigo-500/50 to-emerald-500/50" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 border-t border-white/5 bg-neutral-900/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Tudo que você precisa em uma única tela</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Nossa arquitetura combina dados VMPay com análises complexas para gerar métricas de retenção e ocupação que você nunca viu antes.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Activity className="w-6 h-6 text-emerald-400" />}
              title="Monitoramento de Máquinas"
              description="Identifique ciclos em tempo real. Saiba exatamente quais lavadoras e secadoras estão livres, ocupadas ou inativas."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-indigo-400" />}
              title="CRM e Dados Demográficos"
              description="Acompanhe o gênero dos clientes, ticket médio e taxa de recorrência para fidelizar seu público-alvo com precisão."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6 text-amber-400" />}
              title="Projeção de Faturamento"
              description="Use a média dos últimos 30 dias para prever com clareza o fechamento financeiro do mês atual."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-6 h-6 text-blue-400" />}
              title="Fallback Seguro"
              description="Proteção contra quedas da API. Seus dados ficam salvos em cache no dispositivo local para consultas off-line ultrarrápidas."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-yellow-400" />}
              title="Análise de Filas (Gantt)"
              description="Visualize diagramas de ocupação para entender horários de pico e evitar gargalos físicos na lavanderia."
            />
            <FeatureCard
              icon={<Smartphone className="w-6 h-6 text-pink-400" />}
              title="100% Responsivo"
              description="Controle a operação na palma da mão. O design se adapta perfeitamente ao seu tablet ou smartphone."
            />
          </div>
        </div>
      </section>

      {/* Testimonials (Fictional Social Proof) */}
      <section id="testimonials" className="py-24 border-t border-white/5 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Aprovado por quem inova</h2>
            <p className="text-neutral-400">Lavanderias de todo o país já utilizam a inteligência do Lavly.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="Antes do Lavly eu controlava o faturamento vendo os e-mails do PIX. Hoje eu sei até que o público feminino gasta 30% mais em secadoras do que o masculino. Surreal."
              name="Carlos Moraes"
              store="Lavanderia Express Downtown (Loja Fictícia)"
              initial="C"
            />
            <TestimonialCard
              quote="O gráfico do monitor de máquinas mudou nosso atendimento. Quando vejo que todas as máquinas estão lotadas pelo painel de casa, já mando um WhatsApp pra loja pedindo organização."
              name="Letícia S."
              store="EcoWash Premium (Loja Fictícia)"
              initial="L"
            />
            <TestimonialCard
              quote="Eu perdia dias cruzando Excel pra fechar o mês. Aquele filtro do calendário e os resumos de PIX x Crédito entregam isso mastigado."
              name="Roberto Almeida"
              store="Auto Lavagem Rápida (Loja Fictícia)"
              initial="R"
            />
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <footer id="whatsapp" className="border-t border-white/10 bg-neutral-950 pt-20 pb-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-500/10 mb-6">
            <MessageCircle className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-6">Pronto para digitalizar sua operação?</h2>
          <p className="text-neutral-400 mb-10 max-w-xl mx-auto">
            Entre em contato no WhatsApp comercial. Agendamos uma demonstração gratuita usando os dados da sua operação atual para você testar sem compromisso.
          </p>

          <a
            href="https://wa.me/5511900000000"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold transition-all hover:scale-105 shadow-xl shadow-[#25D366]/20"
          >
            Falar pelo WhatsApp (11) 90000-0000
          </a>

          <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-neutral-600">
            <p>© 2026 Lavly SaaS. Todos os direitos reservados.</p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a href="#" className="hover:text-neutral-300 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-neutral-300 transition-colors">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-neutral-900/40 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all hover:bg-neutral-900/60 group">
      <div className="w-12 h-12 rounded-xl bg-neutral-800/80 border border-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-3">{title}</h3>
      <p className="text-sm text-neutral-400 leading-relaxed">{description}</p>
    </div>
  );
}

function TestimonialCard({ quote, name, store, initial }: { quote: string, name: string, store: string, initial: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 relative">
      <div className="text-4xl text-neutral-800 absolute top-4 right-6 font-serif">"</div>
      <p className="text-neutral-300 text-sm leading-relaxed mb-8 relative z-10 italic">"{quote}"</p>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center font-bold text-white">
          {initial}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">{name}</h4>
          <p className="text-xs text-neutral-500">{store}</p>
        </div>
      </div>
    </div>
  );
}
