import React, { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, ContagemEstoque, ContagemEstoqueItem } from '../../types';
import { formatDate } from '../../utils/formatters';
import Spinner from '../Spinner';
import { PlusIcon, PrintIcon, ClipboardCheckIcon, QrCodeIcon, ChevronLeftIcon, AlertTriangleIcon, SearchIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useAuth } from '../../hooks/useAuth';

interface ContagemTabProps {
  empresaId: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  scannedCode: string | null;
  scanTimestamp: number | null;
  onScanOpen: () => void;
}

type ViewState = 'loading' | 'list' | 'create' | 'counting' | 'review';

export const ContagemTab: React.FC<ContagemTabProps> = ({ empresaId, showToast, scannedCode, scanTimestamp, onScanOpen }) => {
  const { currentUser } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [contagens, setContagens] = useState<ContagemEstoque[]>([]);
  const [activeContagem, setActiveContagem] = useState<{ contagem: ContagemEstoque, items: ContagemEstoqueItem[] } | null>(null);
  
  const [nomeContagem, setNomeContagem] = useState('');
  const [produtoBusca, setProdutoBusca] = useState<Produto | null>(null);
  const [codigoBusca, setCodigoBusca] = useState('');
  const [quantidadeContada, setQuantidadeContada] = useState<number | ''>('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);


  const loadContagens = useCallback(async () => {
    setViewState('loading');
    try {
      const data = await pocketbaseService.getContagens(empresaId);
      setContagens(data);
    } catch (error) {
      showToast('Erro ao carregar contagens.', 'error');
    } finally {
        setViewState('list');
    }
  }, [empresaId, showToast]);
  
  const handleSelectContagem = async (id: string) => {
    setViewState('loading');
    try {
        const data = await pocketbaseService.getContagemComItens(id);
        if (data) {
            setActiveContagem(data);
            if (data.contagem.status === 'finalizada') {
                setViewState('review');
            } else {
                setViewState('counting');
            }
        } else {
            showToast('Contagem não encontrada.', 'error');
            loadContagens();
        }
    } catch (error) {
        showToast('Erro ao carregar contagem.', 'error');
        loadContagens();
    }
  };

  const resetCountingForm = () => {
    setCodigoBusca('');
    setProdutoBusca(null);
    setQuantidadeContada('');
  };

  const handleSearchProduto = useCallback(async (codigo: string) => {
      if (!codigo) return;
      setIsProcessing(true);
      try {
          const produto = await pocketbaseService.findProdutoByCodigo(empresaId, codigo);
          if (produto) {
              if (produto.status === 'inativo') {
                  showToast(`Produto '${produto.descricao}' está inativo.`, 'warning');
                  resetCountingForm();
                  return;
              }
              setProdutoBusca(produto);
              setQuantidadeContada(produto.quantidade); // Pre-fill with system quantity
          } else {
              showToast('Produto não encontrado.', 'warning');
              resetCountingForm();
          }
      } catch (error) {
          showToast('Erro ao buscar produto.', 'error');
      } finally {
          setIsProcessing(false);
      }
  }, [empresaId, showToast]);
  
  const handleAddItem = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!activeContagem || !produtoBusca || quantidadeContada === '') return;
      setIsProcessing(true);
      try {
        const updatedItems = await pocketbaseService.addItemToContagem(activeContagem.contagem.id, {
            produto_codigo: produtoBusca.codigo,
            produto_descricao: produtoBusca.descricao,
            quantidade_sistema: produtoBusca.quantidade,
            quantidade_contada: Number(quantidadeContada)
        });
        setActiveContagem(prev => prev ? { ...prev, items: updatedItems } : null);
        showToast(`Item ${produtoBusca.codigo} atualizado para ${quantidadeContada} un.`, 'success');
        resetCountingForm();
      } catch (error: any) {
        showToast(error.message || 'Erro ao adicionar item.', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  useEffect(() => {
    loadContagens();
  }, [loadContagens]);
  
  useEffect(() => {
    if (scannedCode && scanTimestamp && scanTimestamp !== lastScanTimestamp && viewState === 'counting') {
      setLastScanTimestamp(scanTimestamp);
      setCodigoBusca(scannedCode);
      handleSearchProduto(scannedCode);
    }
  }, [scannedCode, scanTimestamp, lastScanTimestamp, viewState, handleSearchProduto]);

  const handleCreateContagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeContagem.trim()) {
      showToast('Dê um nome para a contagem.', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      const novaContagem = await pocketbaseService.createContagem({ empresa: empresaId, nome: nomeContagem, status: 'em andamento'});
      setActiveContagem({ contagem: novaContagem, items: [] });
      setViewState('counting');
      setNomeContagem('');
    } catch (error) {
      showToast('Erro ao criar contagem.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleAjustarEstoque = async () => {
      if (!activeContagem || !currentUser) return;
      const hasDiscrepancy = activeContagem.items.some(i => i.quantidade_contada !== i.quantidade_sistema);
      if (!hasDiscrepancy) {
          showToast('Nenhuma divergência encontrada. O estoque já está correto!', 'success');
          await pocketbaseService.finalizarContagem(activeContagem.contagem.id);
          loadContagens();
          return;
      }
      
      if (!window.confirm("ATENÇÃO: Isso irá ajustar o estoque para as quantidades contadas e registrar as movimentações. Esta ação não pode ser desfeita. Continuar?")) return;

      setIsProcessing(true);
      try {
        const { ajustados } = await pocketbaseService.ajustarEstoque(activeContagem.contagem.id, currentUser.id);
        showToast(`Estoque ajustado com sucesso! ${ajustados} produtos foram atualizados.`, 'success');
        loadContagens();
      } catch (error: any) {
          showToast(error.message || "Erro ao ajustar estoque.", "error");
      } finally {
          setIsProcessing(false);
      }
  }
  
  const handlePrint = () => window.print();

  // --- RENDER FUNCTIONS ---
  
  if (viewState === 'loading') {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  if (viewState === 'list') {
      return (
          <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Sessões de Contagem</h2>
                    <HelpIcon text="Realize a contagem física do seu estoque para identificar e corrigir divergências." />
                  </div>
                  <button onClick={() => setViewState('create')} className="btn-primary flex items-center justify-center gap-2">
                      <PlusIcon/> Nova Contagem
                  </button>
              </div>
              <div className="space-y-3">
                  {contagens.length > 0 ? contagens.map(c => (
                      <div key={c.id} onClick={() => handleSelectContagem(c.id)} className="p-4 rounded-lg cursor-pointer transition-all hover:brightness-125 flex justify-between items-center shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                          <div>
                            <p className="font-bold text-lg" style={{color: 'var(--color-primary)'}}>{c.nome}</p>
                            <p className="text-sm mt-1" style={{color: 'var(--color-text-secondary)'}}>Criada em: {formatDate(c.created)}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.status === 'em andamento' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                            {c.status.toUpperCase()}
                          </span>
                      </div>
                  )) : (
                       <div className="text-center p-10 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
                           <ClipboardCheckIcon className="mx-auto w-12 h-12 mb-4" style={{color: 'var(--color-text-secondary)'}} />
                           <p style={{color: 'var(--color-text-secondary)'}}>Nenhuma contagem de estoque iniciada.</p>
                       </div>
                  )}
              </div>
          </div>
      );
  }

  if (viewState === 'create') {
    return (
        <div className="animate-fade-in max-w-lg mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={loadContagens} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon/></button>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Iniciar Nova Contagem</h2>
                  <HelpIcon text="Dê um nome ou descrição para a sua sessão de contagem (ex: Inventário Anual)." />
                </div>
            </div>
             <form onSubmit={handleCreateContagem} className="p-6 rounded-lg space-y-4 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div>
                    <label htmlFor="nomeContagem" className="block mb-1 font-semibold">Nome/Descrição da Contagem</label>
                    <input id="nomeContagem" type="text" value={nomeContagem} onChange={e => setNomeContagem(e.target.value)} placeholder="Ex: Balanço Semanal - Corredor A" className="w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                </div>
                 <div className="pt-2">
                     <button type="submit" disabled={isProcessing} className="w-full btn-primary flex items-center justify-center gap-2">
                         {isProcessing ? <Spinner/> : 'Iniciar Contagem'}
                     </button>
                 </div>
             </form>
        </div>
    );
  }

  if (viewState === 'counting' && activeContagem) {
    const { contagem, items } = activeContagem;
    return (
      <div className="animate-fade-in">
          {/* Header */}
          <div className="p-4 rounded-lg mb-6 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
             <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                <div className="flex items-center gap-2 -ml-2">
                    <button onClick={loadContagens} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon/></button>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{contagem.nome}</h2>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Iniciada em: {formatDate(contagem.created)}</p>
                    </div>
                </div>
                <button onClick={() => setViewState('review')} disabled={items.length === 0} className="w-full sm:w-auto mt-2 sm:mt-0 btn-primary">
                    Revisar e Finalizar
                </button>
             </div>
          </div>
          
          {/* Add Item Form */}
          <div className="p-4 rounded-lg mb-6 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
             <form onSubmit={(e) => { e.preventDefault(); handleSearchProduto(codigoBusca); }} className="flex flex-col sm:flex-row gap-2 mb-4">
                 <input
                    type="text"
                    value={codigoBusca}
                    onChange={e => setCodigoBusca(e.target.value.toUpperCase())}
                    placeholder="Digite o código do produto"
                    className="flex-grow px-4 py-2"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                 />
                 <button type="submit" disabled={isProcessing} className="btn-primary flex items-center justify-center gap-2">
                    <SearchIcon className="w-5 h-5"/> Buscar
                 </button>
                 <button
                    type="button"
                    onClick={onScanOpen}
                    className="p-2 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-border)' }}
                    title="Escanear Código"
                 >
                    <QrCodeIcon className="w-5 h-5" />
                 </button>
             </form>
             {isProcessing && !produtoBusca && <Spinner />}
             {produtoBusca && (
                <form onSubmit={handleAddItem} className="mt-4 pt-4 border-t space-y-4" style={{borderColor: 'var(--color-border)'}}>
                    <div>
                        <p className="font-bold">{produtoBusca.descricao}</p>
                        <p className="text-sm font-mono" style={{color: 'var(--color-text-secondary)'}}>{produtoBusca.codigo} | Local: {produtoBusca.localizacao}</p>
                    </div>
                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm">Qtd. Sistema</label>
                            <p className="font-bold text-lg">{produtoBusca.quantidade}</p>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="qtd-contada" className="block text-sm font-semibold">Qtd. Contada</label>
                            <input id="qtd-contada" type="number" min="0" value={quantidadeContada} onChange={e => setQuantidadeContada(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))} required className="w-full p-2 text-lg" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                        </div>
                        <button type="submit" disabled={isProcessing} className="btn-primary">+</button>
                    </div>
                </form>
             )}
          </div>
          
          {/* Items List */}
          <div>
            <h3 className="font-bold text-lg mb-2">Itens Contados ({items.length})</h3>
            <div className="space-y-2">
                {items.sort((a,b) => a.produto_descricao.localeCompare(b.produto_descricao)).map(item => {
                    const divergencia = item.quantidade_contada - item.quantidade_sistema;
                    let divergenciaStyle = 'text-green-400';
                    if (divergencia < 0) divergenciaStyle = 'text-red-400';
                    else if (divergencia === 0) divergenciaStyle = 'text-gray-500';

                    return (
                        <div key={item.id} className="p-3 rounded-md grid grid-cols-3 gap-2 items-center shadow" style={{ backgroundColor: 'var(--color-card)' }}>
                            <div className="col-span-2 sm:col-span-1">
                                <p className="font-semibold truncate">{item.produto_descricao}</p>
                                <p className="text-sm font-mono" style={{color: 'var(--color-text-secondary)'}}>{item.produto_codigo}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Sistema</p>
                                <p className="font-bold">{item.quantidade_sistema}</p>
                            </div>
                             <div className="text-center">
                                <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Contado</p>
                                <p className="font-bold">{item.quantidade_contada}</p>
                            </div>
                            <p className={`col-span-3 sm:col-span-1 text-center sm:text-right font-bold ${divergenciaStyle}`}>
                                Divergência: {divergencia > 0 ? `+${divergencia}` : divergencia}
                            </p>
                        </div>
                    );
                })}
            </div>
          </div>
      </div>
    );
  }

  if (viewState === 'review' && activeContagem) {
      const { contagem, items } = activeContagem;
      const itemsComDivergencia = items.filter(i => i.quantidade_contada !== i.quantidade_sistema);
      const isFinalizada = contagem.status === 'finalizada';
      
      return (
         <div className="animate-fade-in max-w-4xl mx-auto">
             <style>{`@media print { body * { visibility: hidden; } #printable-report, #printable-report * { visibility: visible; } #printable-report { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } @page { size: auto; margin: 10mm; } }`}</style>
             <div className="flex items-center gap-2 mb-6">
                <button onClick={() => isFinalizada ? loadContagens() : setViewState('counting')} className="no-print p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon/></button>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Revisão da Contagem</h2>
             </div>
             <div id="printable-report">
                <div className="p-4 rounded-lg mb-6 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                     <h1 className="text-xl font-bold mb-2 hidden print:block" style={{color: 'black'}}>Relatório de Divergência - {contagem.nome}</h1>
                     <p className="font-bold" style={{color: 'var(--color-primary)'}}>{contagem.nome}</p>
                     <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                        {isFinalizada ? `Finalizada em: ${formatDate(contagem.dataFinalizacao!)}` : `Relatório de Divergências`}
                     </p>
                </div>
                
                {itemsComDivergencia.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <table className="w-full text-left">
                            <thead style={{ backgroundColor: 'var(--color-background)' }}>
                                <tr>
                                    <th className="p-4 font-semibold">Produto</th>
                                    <th className="p-4 font-semibold text-center">Qtd. Sistema</th>
                                    <th className="p-4 font-semibold text-center">Qtd. Contada</th>
                                    <th className="p-4 font-semibold text-center">Divergência</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsComDivergencia.map(item => {
                                    const divergencia = item.quantidade_contada - item.quantidade_sistema;
                                    return (
                                        <tr key={item.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                            <td className="p-4">
                                                <p className="font-semibold">{item.produto_descricao}</p>
                                                <p className="text-sm font-mono" style={{color: 'var(--color-text-secondary)'}}>{item.produto_codigo}</p>
                                            </td>
                                            <td className="p-4 text-center">{item.quantidade_sistema}</td>
                                            <td className="p-4 text-center font-bold">{item.quantidade_contada}</td>
                                            <td className={`p-4 text-center font-bold ${divergencia > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {divergencia > 0 ? `+${divergencia}` : divergencia}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center p-8">Nenhuma divergência encontrada. O estoque está consistente!</p>
                )}
             </div>
             
             <div className="no-print mt-8 flex flex-col sm:flex-row justify-between gap-4">
                 <button onClick={handlePrint} className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-semibold" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text)'}}><PrintIcon/> Imprimir Relatório</button>
                 {!isFinalizada && (
                    <button onClick={handleAjustarEstoque} disabled={isProcessing} className="btn-primary flex items-center justify-center gap-2">
                         {isProcessing ? <Spinner/> : <><AlertTriangleIcon className="w-5 h-5"/> Confirmar e Ajustar Estoque</>}
                     </button>
                 )}
             </div>

         </div>
      );
  }

  return null;
};