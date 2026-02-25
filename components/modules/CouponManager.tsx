import { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, Tag, Clock, CheckCircle, AlertCircle, Percent, Calendar, Sun } from 'lucide-react';
import { Coupon } from '@/lib/processing/coupons';

export function CouponManager() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        try {
            const res = await fetch('/api/coupons/upload');
            const data = await res.json();
            if (Array.isArray(data)) {
                setCoupons(data);
            }
        } catch (e) {
            console.error("Failed to fetch coupons", e);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        setUploading(true);
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/coupons/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                setCoupons(data.coupons);
                alert(`Sucesso! ${data.count} cupons importados.`);
            } else {
                alert(`Erro: ${data.error}`);
            }
        } catch (err) {
            alert('Falha no upload.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tag className="w-6 h-6 text-pink-500" />
                        Banco de Cupons
                    </h2>
                    <p className="text-neutral-400 text-sm">Gerencie os cupons importados da planilha (VMPay).</p>
                </div>

                <label className={`cursor-pointer px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload className="w-4 h-4" />
                    {uploading ? 'Importando...' : 'Importar Excel'}
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploading}
                    />
                </label>
            </div>

            {loading ? (
                <div className="p-12 text-center text-neutral-500">Carregando carteira de cupons...</div>
            ) : coupons.length === 0 ? (
                <div className="border border-dashed border-neutral-800 rounded-xl p-12 flex flex-col items-center justify-center text-neutral-500 gap-4">
                    <FileSpreadsheet className="w-12 h-12 text-neutral-700" />
                    <div>
                        <p className="font-medium">Nenhum cupom cadastrado.</p>
                        <p className="text-xs">Importe a planilha atualizada do VMPay.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {coupons.map((coupon, idx) => (
                        <div key={idx} className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl flex flex-col justify-between group hover:border-pink-500/30 transition-colors relative overflow-hidden">
                            {/* Header: Code & Type */}
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-1 bg-pink-500/10 text-pink-400 text-[10px] font-bold uppercase rounded tracking-wider border border-pink-500/20">
                                    {coupon.type}
                                </span>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800/50 rounded text-emerald-400 text-xs font-bold font-mono">
                                    <Percent className="w-3 h-3" />
                                    {coupon.discount}% OFF
                                </div>
                            </div>

                            {/* Main Info */}
                            <div>
                                <h3 className="text-xl font-bold text-white font-mono tracking-wide flex items-center gap-2">
                                    {coupon.code}
                                </h3>
                                <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                                    {coupon.description}
                                </p>
                            </div>

                            {/* Rules Footer */}
                            <div className="mt-5 pt-4 border-t border-neutral-800/50 grid grid-cols-2 gap-2 text-[10px] text-neutral-500">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-neutral-600" />
                                    <span>{coupon.expiry ? `Até ${coupon.expiry}` : 'Indeterminado'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Sun className="w-3 h-3 text-neutral-600" />
                                    <span className="truncate">{coupon.days}</span>
                                </div>
                                <div className="flex items-center gap-1.5 col-span-2">
                                    <Clock className="w-3 h-3 text-neutral-600" />
                                    <span>{coupon.hours}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 text-sm text-blue-200">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                    <h4 className="font-bold text-blue-400 mb-1">Como funciona?</h4>
                    <p className="text-blue-200/70 leading-relaxed">
                        O sistema usa a coluna <strong>FINALIDADE</strong> para escolher o cupom certo.
                        Por exemplo, no envio de Aniversário, ele buscará um cupom onde Finalidade é <code>ANIVERSARIO</code>.
                    </p>
                </div>
            </div>
        </div>
    );
}
