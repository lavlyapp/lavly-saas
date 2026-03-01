'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("FATAL NEXTJS ERROR BOUNDARY CAUGHT:");
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-screen bg-black text-white p-8 flex flex-col items-start justify-center font-mono">
            <h2 className="text-red-500 font-bold text-2xl mb-4">O Sistema Lavly Encontrou um Erro Crítico.</h2>
            <p className="mb-4">Tire um print (screenshot) desta tela e envie para o suporte técnico:</p>

            <div className="bg-neutral-900 border border-red-500 p-6 rounded-lg overflow-x-auto w-full max-w-4xl text-sm">
                <p className="font-bold text-red-400 mb-2">Mensagem do Erro:</p>
                <p className="mb-4">{error.message}</p>

                <p className="font-bold text-red-400 mb-2">Pilha de Execução (Stack Trace):</p>
                <pre className="text-neutral-300 relative whitespace-pre-wrap">{error.stack}</pre>

                {error.digest && (
                    <p className="mt-4 text-neutral-500">Digest ID: {error.digest}</p>
                )}
            </div>

            <button
                className="mt-8 bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-neutral-300"
                onClick={() => reset()}
            >
                Tentar recarregar a página
            </button>
        </div>
    );
}
