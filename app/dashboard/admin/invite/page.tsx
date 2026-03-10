"use client";

import React, { useState } from 'react';
import { UserPlus, Key, Mail, Store, CheckCircle2, AlertCircle } from 'lucide-react';
// Assuming you have some basic UI components, if not we will use raw HTML/Tailwind
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"

export default function AdminInvitePage() {
    const [email, setEmail] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [discoveredStores, setDiscoveredStores] = useState<string[]>([]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !apiKey) {
            setStatus('error');
            setMessage('Por favor, preencha o E-mail e a Chave de API.');
            return;
        }

        setIsLoading(true);
        setStatus('idle');
        setDiscoveredStores([]);
        setMessage('');

        try {
            const response = await fetch('/api/admin/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, apiKey }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ocorreu um erro ao convidar o usuário.');
            }

            setStatus('success');
            setMessage('Usuário convidado com sucesso! E e-mail de ativação enviado.');
            setDiscoveredStores(data.stores || []);

            // Clear form
            setEmail('');
            setApiKey('');

        } catch (error: any) {
            setStatus('error');
            setMessage(error.message || 'Erro de conexão com o servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-indigo-600" />
                    Convidar Novo Dono de Lavanderia
                </h1>
                <p className="text-gray-500 mt-2">
                    Insira o e-mail do cliente e a Chave de API da VMPay. O sistema irá consultar a VMPay automaticamente para descobrir e vincular as lojas a este usuário.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
                <form onSubmit={handleInvite} className="space-y-6">

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                E-mail do Cliente
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="cliente@lavanderia.com.br"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chave de API (VMPay)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="ex: e8689749-..."
                                    disabled={isLoading}
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Esta chave será validada em tempo real na API da VMPay.
                            </p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Consultando VMPay e Criando Conta...
                                </span>
                            ) : (
                                "Verificar API e Convidar Usuário"
                            )}
                        </button>
                    </div>
                </form>

                {/* Status Messages */}
                {status === 'error' && (
                    <div className="mt-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-700">{message}</p>
                            </div>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="mt-6 space-y-4">
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 mt-0.5">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-800">
                                        {message}
                                    </h3>
                                    <div className="mt-2 text-sm text-green-700">
                                        <p>As seguintes lojas foram encontradas na VMPay e vinculadas à conta do cliente:</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* List of Discovered Stores */}
                        {discoveredStores.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Lojas Vinculadas Automagicamente
                                </h4>
                                <ul className="space-y-2">
                                    {discoveredStores.map((store, index) => (
                                        <li key={index} className="flex items-center gap-3 text-sm text-gray-700 bg-white p-2 rounded shadow-sm border border-gray-100">
                                            {/* We don't have BuildingStorefront in standard lucide-react, using Building or Store */}
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {index + 1}
                                            </div>
                                            {store}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
