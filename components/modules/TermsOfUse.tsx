"use client";

import { X, FileText, CheckCircle2 } from "lucide-react";

interface TermsOfUseProps {
    isOpen: boolean;
    onClose: () => void;
    onAccept?: () => void;
}

export function TermsOfUse({ isOpen, onClose, onAccept }: TermsOfUseProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-neutral-900 border border-neutral-800 w-full max-w-2xl max-h-[85vh] rounded-3xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600/20 rounded-lg">
                            <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Termos de Uso e Privacidade</h3>
                            <p className="text-xs text-neutral-500">Última atualização: Fevereiro de 2026</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 text-neutral-300 space-y-6 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800">
                    <section>
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                            1. Aceite dos Termos
                        </h4>
                        <p>
                            Ao acessar a plataforma Lavly, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis.
                        </p>
                    </section>

                    <section>
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                            2. Uso de Dados (VMPay)
                        </h4>
                        <p>
                            A Lavly atua como uma camada de inteligência sobre os dados fornecidos pela API da VMPay. Não armazenamos senhas de acesso direto a sistemas bancários. Os dados processados referem-se estritamente ao histórico de vendas, transações e CRM da sua unidade de lavanderia.
                        </p>
                    </section>

                    <section>
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                            3. Confidencialidade
                        </h4>
                        <p>
                            Comprometemo-nos a manter o sigilo absoluto dos seus dados financeiros e de clientes. As informações exibidas no dashboard são de propriedade exclusiva da sua empresa e não serão compartilhadas com terceiros.
                        </p>
                    </section>

                    <section>
                        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                            4. Responsabilidade
                        </h4>
                        <p>
                            A Lavly fornece ferramentas de análise baseadas em dados históricos. Decisões de negócio tomadas com base nestas análises são de inteira responsabilidade do gestor da unidade.
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 rounded-b-3xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={() => {
                            if (onAccept) onAccept();
                            onClose();
                        }}
                        className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-900/20"
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Concordo e Aceito
                    </button>
                </div>
            </div>
        </div>
    );
}
