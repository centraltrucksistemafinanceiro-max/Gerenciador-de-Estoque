import React, { useState, useMemo } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto } from '../../types';
import Spinner from '../Spinner';
import { SearchIcon, PrintIcon } from '../icons/Icon';
import { useLabelConfig } from '../../hooks/useLabelConfig';
import HelpIcon from '../HelpIcon';

interface Etiqueta {
  produto: Produto;
  id: number;
}

interface EtiquetasTabProps {
    empresaId: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const EtiquetasTab: React.FC<EtiquetasTabProps> = ({ empresaId, showToast }) => {
  const [codigo, setCodigo] = useState('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [numeroDeFileiras, setNumeroDeFileiras] = useState<number>(1);
  const [quantidadePorEtiqueta, setQuantidadePorEtiqueta] = useState<number>(1);
  const [etiquetasGeradas, setEtiquetasGeradas] = useState<Etiqueta[]>([]);
  
  const { presets, activePresetId } = useLabelConfig();
  const [selectedPresetId, setSelectedPresetId] = useState(activePresetId);

  const selectedPreset = useMemo(() => {
    return presets.find(p => p.id === selectedPresetId) || presets[0];
  }, [presets, selectedPresetId]);


  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!codigo) {
      showToast('Por favor, insira um código para buscar.', 'warning');
      return;
    }
    setIsLoading(true);
    setProduto(null);
    setNotFound(false);
    setEtiquetasGeradas([]);
    try {
      const result = await pocketbaseService.findProdutoByCodigo(empresaId, codigo);
      if (result) {
        setProduto(result);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      showToast('Erro ao buscar produto.', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerate = () => {
    if (!produto || !selectedPreset) return;
    if (numeroDeFileiras <= 0) {
      showToast('O número de fileiras deve ser maior que zero.', 'warning');
      return;
    }
     if (quantidadePorEtiqueta <= 0) {
      showToast('A quantidade por etiqueta deve ser maior que zero.', 'warning');
      return;
    }

    const totalEtiquetas = numeroDeFileiras * selectedPreset.labelsPerRow;

    const novasEtiquetas = Array.from({ length: totalEtiquetas }, (_, i) => ({
      produto: produto,
      id: Date.now() + i
    }));
    setEtiquetasGeradas(novasEtiquetas);
  };
  
  const handlePrint = () => {
      window.print();
  };
  
  const handleClear = () => {
    setEtiquetasGeradas([]);
    setProduto(null);
    setCodigo('');
    setNotFound(false);
    setNumeroDeFileiras(1);
    setQuantidadePorEtiqueta(1);
  };

  // Calcula a largura do container considerando etiquetas e o espaçamento (gap) de 5mm
  const containerWidth = selectedPreset ? (selectedPreset.width * selectedPreset.labelsPerRow) + (5 * (selectedPreset.labelsPerRow - 1)) : 0;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printable-labels, #printable-labels * {
            visibility: visible;
          }
          #printable-labels {
            position: absolute; /* Changed from fixed to allow multi-page printing */
            left: 3mm;
            top: 0;
            width: auto;
            height: auto;
            transform: scale(1.4);
            transform-origin: top left;
          }
          .no-print {
            display: none !important;
          }
           @page {
            size: auto;
            margin: 1mm;
          }
        }
      `}</style>

      <div className="no-print">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Gerar Etiquetas de Produto</h2>
          <HelpIcon text="Gere e imprima etiquetas com QR Code para seus produtos de forma rápida e personalizada." />
        </div>
        
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Digite o código do produto"
              className="flex-grow px-4 py-2 transition-all"
              style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {isLoading ? <Spinner /> : <><SearchIcon className="w-5 h-5" /> Buscar</>}
            </button>
          </form>

          {notFound && <p className="mt-4 text-red-400">Produto não encontrado para o código: {codigo}</p>}

          {produto && (
            <div className="mt-6 border-t pt-6" style={{borderColor: 'var(--color-border)'}}>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{produto.descricao}</h3>
                <p className="font-mono text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>Código: {produto.codigo} | Estoque: {produto.quantidade}</p>
              
              <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-grow w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div>
                        <label htmlFor="preset" className="block mb-1 font-semibold">Padrão da Etiqueta</label>
                        <select
                            id="preset"
                            value={selectedPresetId}
                            onChange={(e) => setSelectedPresetId(e.target.value)}
                            className="w-full px-4 py-2"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                        >
                            {presets.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height}mm)</option>
                            ))}
                        </select>
                     </div>
                    <div>
                      <label htmlFor="quantidadePorEtiqueta" className="block mb-1 font-semibold">Qtd. por Etiqueta</label>
                      <input
                        id="quantidadePorEtiqueta"
                        type="number"
                        min="1"
                        value={quantidadePorEtiqueta}
                        onChange={(e) => setQuantidadePorEtiqueta(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-2"
                        style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                      />
                    </div>
                    <div>
                      <label htmlFor="numeroDeFileiras" className="block mb-1 font-semibold">Nº de Fileiras (Linhas)</label>
                      <input
                        id="numeroDeFileiras"
                        type="number"
                        min="1"
                        value={numeroDeFileiras}
                        onChange={(e) => setNumeroDeFileiras(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-2"
                        style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-auto">
                    <button 
                        onClick={handleGenerate}
                        className="w-full btn-primary" 
                        >
                        Gerar Pré-visualização
                    </button>
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {etiquetasGeradas.length > 0 && selectedPreset && (
          <div className="mt-8 print:mt-0">
            <div className="no-print flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 p-4 rounded-lg shadow-md" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)'}}>
                 <h3 className="text-lg font-bold text-center sm:text-left">Pré-visualização pronta para impressão</h3>
                 <div className="flex items-center gap-4">
                    <button onClick={handleClear} className="px-4 py-2 rounded-lg font-semibold transition-all" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)'}}>Limpar</button>
                    <button 
                        onClick={handlePrint}
                        className="btn-primary flex items-center justify-center gap-2"
                        >
                        <PrintIcon/> Imprimir
                    </button>
                 </div>
            </div>
            {/* Gap set to 5mm */}
            <div id="printable-labels" className="flex flex-wrap" style={{ gap: '5mm', width: `${containerWidth}mm` }}>
                {etiquetasGeradas.map(etiqueta => {
                    const p = etiqueta.produto;
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(p.codigo)}&qzone=1&margin=0`;
                    return (
                        <div key={etiqueta.id} className="text-black bg-white flex flex-col text-center font-mono p-1 box-border overflow-hidden"
                            style={{
                                width: `${selectedPreset.width}mm`,
                                height: `${selectedPreset.height}mm`,
                                fontFamily: "'Courier New', Courier, monospace",
                                fontWeight: 'bold',
                            }}>
                            
                            <div className="flex flex-col items-center">
                                <img src={qrCodeUrl} alt={`QR Code for ${p.codigo}`} style={{ width: `${selectedPreset.qrCodeSize}mm`, height: `${selectedPreset.qrCodeSize}mm` }}/>
                                <p className="leading-tight mt-1" style={{ fontSize: `${selectedPreset.codeFontSize}pt` }}>{p.codigo}</p>
                            </div>

                            <div className="flex-grow w-full flex items-center justify-center">
                                <p className="leading-tight" style={{ 
                                    fontSize: `${selectedPreset.descriptionFontSize}pt`,
                                    overflow: 'hidden', 
                                    display: '-webkit-box', 
                                    WebkitBoxOrient: 'vertical', 
                                    WebkitLineClamp: 2, 
                                    wordBreak: 'break-word' 
                                }}>
                                    {p.descricao}
                                </p>
                            </div>

                            <div className="flex justify-between w-full" style={{ fontSize: `${selectedPreset.footerFontSize}pt` }}>
                                <span>loc: {p.localizacao}</span>
                                <span>Qtd: {quantidadePorEtiqueta}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      )}
    </div>
  );
};
