
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, ProdutoParaImpressao } from '../../types';
import Spinner from '../Spinner';
import { SearchIcon, PrintIcon, QrCodeIcon, PlusIcon } from '../icons/Icon';
import { useLabelConfig } from '../../hooks/useLabelConfig';
import HelpIcon from '../HelpIcon';

interface EtiquetasTabProps {
    empresaId: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
    onScanOpen: () => void;
    codigoBuscaInicial: string | null;
}

export const EtiquetasTab: React.FC<EtiquetasTabProps> = ({ empresaId, showToast, onScanOpen, codigoBuscaInicial }) => {
  // Search state
  const [codigo, setCodigo] = useState('');
  const [produtoEncontrado, setProdutoEncontrado] = useState<Produto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Queue and generation state
  const [quantidadeParaAdicionar, setQuantidadeParaAdicionar] = useState<number | ''>(1);
  const [filaImpressao, setFilaImpressao] = useState<ProdutoParaImpressao[]>([]);
  const [etiquetasGeradas, setEtiquetasGeradas] = useState<(Produto & { quantidadeImpressa: number })[]>([]);
  
  // Label config
  const { presets, activePresetId } = useLabelConfig();
  const [selectedPresetId, setSelectedPresetId] = useState(activePresetId);
  const selectedPreset = useMemo(() => presets.find(p => p.id === selectedPresetId) || presets[0], [presets, selectedPresetId]);

  const resetSearch = () => {
    setCodigo('');
    setProdutoEncontrado(null);
    setNotFound(false);
    setQuantidadeParaAdicionar(1);
  };

  const handleSearch = useCallback(async (searchCodigo: string) => {
    if (!searchCodigo) {
      showToast('Por favor, insira um código para buscar.', 'warning');
      return;
    }
    setIsLoading(true);
    setProdutoEncontrado(null);
    setNotFound(false);
    try {
      const result = await pocketbaseService.findProdutoByCodigo(empresaId, searchCodigo);
      if (result) {
        setProdutoEncontrado(result);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      showToast('Erro ao buscar produto.', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, showToast]);

  useEffect(() => {
    if (codigoBuscaInicial) {
      setCodigo(codigoBuscaInicial);
      handleSearch(codigoBuscaInicial);
    }
  }, [codigoBuscaInicial, handleSearch]);

  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(codigo);
  };
  
  const handleAdicionarAFila = () => {
    if (!produtoEncontrado) return;

    const quantNum = Number(quantidadeParaAdicionar);
    if (isNaN(quantNum) || quantNum <= 0) {
        showToast('A quantidade de etiquetas deve ser um número maior que zero.', 'warning');
        return;
    }

    setFilaImpressao(prevFila => {
      const itemExistenteIndex = prevFila.findIndex(item => item.produto.id === produtoEncontrado.id);
      
      if (itemExistenteIndex > -1) {
        const novaFila = [...prevFila];
        novaFila[itemExistenteIndex].quantidade += quantNum;
        return novaFila;
      } else {
        // Add to queue with printable quantity pre-filled with stock quantity
        return [...prevFila, { 
            produto: produtoEncontrado, 
            quantidade: quantNum, 
            quantidadeImpressa: produtoEncontrado.quantidade 
        }];
      }
    });

    showToast(`${quantNum} etiqueta(s) para "${produtoEncontrado.descricao}" adicionada(s) à fila.`, 'success');
    resetSearch();
  };

  const handleUpdateFila = (produtoId: string, field: 'quantidade' | 'quantidadeImpressa', novaQuantidade: number) => {
    setFilaImpressao(prevFila => prevFila.map(item => 
      item.produto.id === produtoId ? { ...item, [field]: Math.max(field === 'quantidade' ? 1 : 0, novaQuantidade) } : item
    ));
  };
  
  const handleRemoverDaFila = (produtoId: string) => {
    setFilaImpressao(prevFila => prevFila.filter(item => item.produto.id !== produtoId));
  };
  
  const handleGenerate = () => {
    if (filaImpressao.length === 0) {
      showToast('A fila de impressão está vazia.', 'warning');
      return;
    }

    const novasEtiquetas: (Produto & { quantidadeImpressa: number })[] = [];
    filaImpressao.forEach(item => {
      for (let i = 0; i < item.quantidade; i++) {
        novasEtiquetas.push({ ...item.produto, quantidadeImpressa: item.quantidadeImpressa });
      }
    });
    setEtiquetasGeradas(novasEtiquetas);
  };
  
  const handlePrint = () => { window.print(); };
  
  const handleClearAll = () => {
    setEtiquetasGeradas([]);
    setFilaImpressao([]);
    resetSearch();
  };
  
  const handleQuantidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setQuantidadeParaAdicionar('');
    } else {
        const num = parseInt(value.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) {
            setQuantidadeParaAdicionar(num);
        }
    }
  };

  const totalEtiquetasNaFila = useMemo(() => filaImpressao.reduce((sum, item) => sum + item.quantidade, 0), [filaImpressao]);

  const containerWidth = selectedPreset ? (selectedPreset.width * selectedPreset.labelsPerRow) + (5 * (selectedPreset.labelsPerRow - 1)) : 0;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #printable-labels, #printable-labels * { visibility: visible; }
          #printable-labels { 
            position: absolute; 
            left: 3mm; 
            top: 0;
            transform: scale(1.1);
            transform-origin: top left;
          }
          .no-print { display: none !important; }
          @page { size: auto; margin: 1mm; }
        }
      `}</style>

      <div className="no-print">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold">Gerar Etiquetas de Produto</h2>
          <HelpIcon text="Busque produtos, adicione-os a uma fila e imprima várias etiquetas diferentes de uma só vez." />
        </div>
        
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <form onSubmit={handleSubmitSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Digite o código do produto"
              className="flex-grow px-4 py-2"
              style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <button type="button" onClick={onScanOpen} className="p-2" style={{ backgroundColor: 'var(--color-border)' }} title="Escanear Código"><QrCodeIcon className="w-5 h-5" /></button>
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center justify-center gap-2">
              {isLoading ? <Spinner /> : <><SearchIcon className="w-5 h-5" /> Buscar</>}
            </button>
          </form>

          {notFound && <p className="mt-4 text-red-400">Produto não encontrado para o código: {codigo}</p>}

          {produtoEncontrado && (
            <div className="mt-6 border-t pt-6" style={{borderColor: 'var(--color-border)'}}>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{produtoEncontrado.descricao}</h3>
                <p className="font-mono text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>Código: {produtoEncontrado.codigo} | Estoque: {produtoEncontrado.quantidade}</p>
              
              <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-grow">
                      <label htmlFor="quantidadeParaAdicionar" className="block mb-1 font-semibold">Qtd. de Etiquetas</label>
                      <input
                        id="quantidadeParaAdicionar"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={quantidadeParaAdicionar}
                        onChange={handleQuantidadeChange}
                        className="w-full px-4 py-2"
                        style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                      />
                  </div>
                  <button onClick={handleAdicionarAFila} className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2"><PlusIcon/> Adicionar à Fila</button>
              </div>
            </div>
          )}
        </div>
        
        {filaImpressao.length > 0 && (
          <div className="mt-8 p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-bold mb-4">Fila de Impressão</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {filaImpressao.map(item => (
                <div key={item.produto.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded" style={{backgroundColor: 'var(--color-background)'}}>
                  <div className="col-span-6">
                    <p className="font-semibold truncate">{item.produto.descricao}</p>
                    <p className="text-xs font-mono" style={{color: 'var(--color-text-secondary)'}}>{item.produto.codigo}</p>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Nº Etiquetas</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => handleUpdateFila(item.produto.id, 'quantidade', parseInt(e.target.value) || 1)}
                      className="w-full p-1 text-center"
                      style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                   <div className="col-span-2">
                    <label className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Qtd. Etiqueta</label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantidadeImpressa}
                      onChange={(e) => handleUpdateFila(item.produto.id, 'quantidadeImpressa', parseInt(e.target.value) || 0)}
                      className="w-full p-1 text-center"
                      style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
                    />
                  </div>
                  <div className="col-span-1 text-right self-end">
                    <button onClick={() => handleRemoverDaFila(item.produto.id)} className="p-1 text-red-400 hover:text-red-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t pt-4 flex flex-col sm:flex-row items-center justify-between gap-4" style={{borderColor: 'var(--color-border)'}}>
                <div>
                  <label className="block mb-1 font-semibold">Padrão da Etiqueta</label>
                  <select value={selectedPresetId} onChange={(e) => setSelectedPresetId(e.target.value)} className="w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.width}x{p.height}mm)</option>)}
                  </select>
                </div>
                <button onClick={handleGenerate} className="w-full sm:w-auto btn-primary">{`Gerar Pré-visualização (${totalEtiquetasNaFila} Etiquetas)`}</button>
            </div>
          </div>
        )}
      </div>
      
      {etiquetasGeradas.length > 0 && selectedPreset && (
          <div className="mt-8 print:mt-0">
            <div className="no-print flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 p-4 rounded-lg shadow-md" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)'}}>
                 <h3 className="text-lg font-bold text-center sm:text-left">Pré-visualização pronta para impressão</h3>
                 <div className="flex items-center gap-4">
                    <button onClick={handleClearAll} className="px-4 py-2 rounded-lg font-semibold transition-all" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)'}}>Limpar Tudo</button>
                    <button onClick={handlePrint} className="btn-primary flex items-center justify-center gap-2"><PrintIcon/> Imprimir</button>
                 </div>
            </div>
            <div id="printable-labels" className="flex flex-col">
              {Array.from({ length: Math.ceil(etiquetasGeradas.length / selectedPreset.labelsPerRow) }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex flex-row" style={{ gap: '5mm', marginBottom: '1mm', width: `${containerWidth}mm` }}>
                  {etiquetasGeradas.slice(rowIndex * selectedPreset.labelsPerRow, (rowIndex + 1) * selectedPreset.labelsPerRow).map((produto, labelIndex) => {
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(produto.codigo)}&qzone=1&margin=0`;
                    return (
                        <div key={`${produto.id}-${rowIndex}-${labelIndex}`} className="text-black bg-white flex flex-col text-center font-mono box-border justify-between"
                            style={{
                                width: `${selectedPreset.width}mm`,
                                height: `${selectedPreset.height}mm`,
                                fontFamily: "'Courier New', Courier, monospace",
                                fontWeight: 'bold',
                                padding: '1.5mm',
                                overflow: 'hidden'
                            }}>
                            
                            <div className="flex flex-col items-center">
                                <img src={qrCodeUrl} alt={`QR Code for ${produto.codigo}`} style={{ width: `${selectedPreset.qrCodeSize}mm`, height: `${selectedPreset.qrCodeSize}mm` }}/>
                                <p className="leading-tight mt-1" style={{ fontSize: `${selectedPreset.codeFontSize}pt`, margin: 0 }}>{produto.codigo}</p>
                            </div>

                            <p className="leading-tight" style={{ 
                                fontSize: `${selectedPreset.descriptionFontSize}pt`,
                                overflow: 'hidden', 
                                display: '-webkit-box', 
                                WebkitBoxOrient: 'vertical', 
                                WebkitLineClamp: 2, 
                                wordBreak: 'break-word',
                                margin: 'auto 0'
                            }}>
                                {produto.descricao}
                            </p>

                            <div className="flex justify-between w-full" style={{ fontSize: `${selectedPreset.footerFontSize}pt` }}>
                                <span>loc: {produto.localizacao}</span>
                                <span>Qtd: {produto.quantidadeImpressa}</span>
                            </div>
                        </div>
                    )
                  })}
                </div>
              ))}
            </div>
        </div>
      )}
    </div>
  );
};