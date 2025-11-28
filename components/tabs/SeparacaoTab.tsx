import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Tab, Separacao, SeparacaoItem, Produto, SeparacaoStatus } from '../../types';
import { formatDate } from '../../utils/formatters';
import Spinner from '../Spinner';
import { PlusIcon, PrintIcon, ClipboardListIcon, QrCodeIcon, ChevronLeftIcon, CheckCircleIcon, AlertTriangleIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useAuth } from '../../hooks/useAuth';

interface SeparacaoTabProps {
  empresaId: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  onNavigateToTab: (tab: Tab, data?: any) => void;
  scannedCode: string | null;
  scanTimestamp: number | null;
}

type ViewState = 'loading' | 'list' | 'create' | 'defineItems' | 'picking' | 'delivery';

type ParsedItem = { codigo: string; quantidade: number };
type ValidatedItem = {
    status: 'found' | 'not_found' | 'insufficient_stock';
    produto?: Produto;
    quantidadeRequerida: number;
    codigoInput: string;
};

export const SeparacaoTab: React.FC<SeparacaoTabProps> = ({ empresaId, showToast, onNavigateToTab, scannedCode, scanTimestamp }) => {
  const { currentUser } = useAuth();
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [separacoes, setSeparacoes] = useState<Separacao[]>([]);
  const [activeSeparacao, setActiveSeparacao] = useState<{ separacao: Separacao, items: SeparacaoItem[] } | null>(null);
  
  // Create state
  const [osNumero, setOsNumero] = useState('');
  const [cliente, setCliente] = useState('');
  const [placa, setPlaca] = useState('');

  // Define Items state
  const [pastedData, setPastedData] = useState('');
  const [validatedItems, setValidatedItems] = useState<ValidatedItem[]>([]);
  
  // Picking state
  const [manualItemCode, setManualItemCode] = useState('');

  // Delivery State
  const [nomeRecebedor, setNomeRecebedor] = useState('');

  // General state
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanTimestamp, setLastScanTimestamp] = useState<number | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);

  const loadSeparacoes = useCallback(async () => {
    setViewState('loading');
    try {
      const data = await pocketbaseService.getSeparacoes(empresaId);
      setSeparacoes(data);
    } catch (error: any) {
      if (error && error.isAbort) {
        console.log("Fetch separações aborted");
        return;
      }
      showToast('Erro ao carregar separações.', 'error');
    } finally {
        setViewState('list');
    }
  }, [empresaId, showToast]);

  useEffect(() => {
    loadSeparacoes();
  }, [loadSeparacoes]);

  // --- WORKFLOW HANDLERS ---
  const handleCreateSeparacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!osNumero.trim() || !cliente.trim()) {
      showToast('Preencha o Número da O.S. e o Cliente.', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      const novaSeparacao = await pocketbaseService.createSeparacao({
        empresa: empresaId, 
        osNumero, 
        cliente, 
        placaVeiculo: placa,
        status: 'em andamento'
      });
      setActiveSeparacao({ separacao: novaSeparacao, items: [] });
      setViewState('defineItems');
      showToast('Separação criada. Agora, defina os itens.', 'success');
      setOsNumero(''); setCliente(''); setPlaca('');
    } catch (error: any) {
      showToast(error.message || 'Erro ao iniciar separação.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const processAndValidateItems = useCallback(async (itemsToProcess: ParsedItem[]) => {
    setIsProcessing(true);
    try {
        const validationPromises = itemsToProcess.map(async (item): Promise<ValidatedItem> => {
        const produto = await pocketbaseService.findProdutoByCodigo(empresaId, item.codigo);
        let status: ValidatedItem['status'] = 'not_found';
        if (produto) {
            if (produto.status === 'inativo') {
            status = 'not_found';
            } else if (produto.quantidade < item.quantidade) {
            status = 'insufficient_stock';
            } else {
            status = 'found';
            }
        }
        return {
            status,
            produto: produto || undefined,
            quantidadeRequerida: item.quantidade,
            codigoInput: item.codigo,
        };
        });
        const results = await Promise.all(validationPromises);
        setValidatedItems(prev => {
            const newItemsMap = new Map<string, ValidatedItem>();
            // Add previous items
            prev.forEach(item => newItemsMap.set(item.codigoInput.toUpperCase(), item));
            // Add new/updated items
            results.forEach(item => newItemsMap.set(item.codigoInput.toUpperCase(), item));
            return Array.from(newItemsMap.values());
        });
    } catch (error: any) {
        if (error && error.isAbort) {
            console.log("Validation fetch aborted");
            return;
        }
        showToast("Erro ao validar itens.", "error");
    } finally {
        setIsProcessing(false);
    }
  }, [empresaId, showToast]);

  const handleProcessPastedData = async () => {
    if (!pastedData.trim()) {
      showToast('Cole os dados dos produtos.', 'warning');
      return;
    }
    const lines = pastedData.trim().split('\n');
    const parsedItems: ParsedItem[] = lines.map(line => {
        const parts = line.split(/\s+/);
        const codigo = parts[0]?.trim().toUpperCase() || '';
        const quantidade = parseInt(parts[1]?.trim()) || 1;
        return { codigo, quantidade };
    }).filter(item => item.codigo && item.quantidade > 0);
    
    try {
        await processAndValidateItems(parsedItems);
    } catch (error: any) {
        if (error.isAbort) return; // Fail silently
        showToast('Erro ao processar dados.', 'error');
    }
    setPastedData(''); // Clear textarea
  };

  const handleProcessSingleItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement; // Store form reference
    const codigo = (form.elements.namedItem('codigo') as HTMLInputElement).value;
    const quantidade = parseInt((form.elements.namedItem('quantidade') as HTMLInputElement).value);
    
    if (!codigo || isNaN(quantidade) || quantidade <= 0) {
        showToast('Preencha o código e a quantidade.', 'warning');
        return;
    }
    try {
        await processAndValidateItems([{ codigo, quantidade }]);
    } catch(error: any) {
        if (error.isAbort) return; // Fail silently
        showToast('Erro ao processar item.', 'error');
    }
    form.reset();
  };

  
  const handleConfirmItems = async () => {
      if (!activeSeparacao) return;
      
      const itemsToSet = validatedItems
        .filter(item => item.status !== 'not_found' && item.produto)
        .map(item => ({
            produto_codigo: item.produto!.codigo,
            produto_descricao: item.produto!.descricao,
            localizacao: item.produto!.localizacao,
            quantidade_requerida: item.quantidadeRequerida,
            quantidade_estoque_inicial: item.produto!.quantidade,
            quantidade_separada: 0,
            separacao: activeSeparacao.separacao.id
        }));
        
      if (itemsToSet.length === 0) {
          showToast('Nenhum produto válido encontrado para iniciar a separação.', 'warning');
          return;
      }

      setIsProcessing(true);
      try {
          await pocketbaseService.setSeparacaoItems(activeSeparacao.separacao.id, itemsToSet);
          await handleSelectSeparacao(activeSeparacao.separacao.id); 
      } catch (error: any) {
          showToast(error.message || 'Erro ao salvar lista de itens.', 'error');
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSelectSeparacao = async (id: string) => {
    setViewState('loading');
    try {
        const data = await pocketbaseService.getSeparacaoComItens(id);
        if (data) {
            setActiveSeparacao(data);
            if (data.separacao.status === 'em andamento') {
                if (data.items.length === 0) {
                    setValidatedItems([]); // Clear previous validation
                    setViewState('defineItems');
                } else {
                    setViewState('picking');
                }
            } else if (data.separacao.status === 'aguardando entrega') {
                setNomeRecebedor('');
                setViewState('delivery');
            } else { // Delivered
                setNomeRecebedor(data.separacao.nome_recebedor || '');
                setViewState('delivery');
            }
        } else {
            showToast('Separação não encontrada.', 'error');
            loadSeparacoes();
        }
    } catch (error: any) {
        if (error && error.isAbort) {
            console.log("Select separação fetch aborted");
            loadSeparacoes(); // Go back to list if aborted
            return;
        }
        showToast('Erro ao carregar separação.', 'error');
        loadSeparacoes();
    }
  };

  // --- PICKING HANDLERS ---
  const handleAddItemByScan = useCallback(async (codigo: string) => {
    if (!activeSeparacao) return;
    setIsProcessing(true);
    try {
        // This service function now handles both updating and creating items
        const {item: updatedItem, isNew } = await pocketbaseService.addItemToSeparacao(activeSeparacao.separacao.id, codigo);
        
        if (updatedItem) {
            setActiveSeparacao(prev => {
                if (!prev) return null;
                let newItems;
                if (isNew) {
                    newItems = [...prev.items, updatedItem];
                } else {
                    newItems = prev.items.map(i => i.id === updatedItem.id ? updatedItem : i);
                }
                return { ...prev, items: newItems };
            });
            setHighlightedItemId(updatedItem.id);
            setTimeout(() => setHighlightedItemId(null), 700);
            showToast(`${isNew ? 'Novo item adicionado:' : '+1 para'} '${updatedItem.produto_descricao}'.`, 'success');
        }
    } catch (error: any) {
        showToast(error.message || 'Erro ao adicionar item.', 'error');
    } finally {
        setIsProcessing(false);
    }
  }, [activeSeparacao, showToast]);

    const handleManualAddItemSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualItemCode.trim()) {
            handleAddItemByScan(manualItemCode.trim());
            setManualItemCode(''); // Clear input after adding
        } else {
            showToast('Por favor, digite um código.', 'warning');
        }
    };
  
  const handleUpdateItemQuantidade = async (itemId: string, newQuantity: number) => {
    if (!activeSeparacao) return;
    const item = activeSeparacao.items.find(i => i.id === itemId);
    if (!item || newQuantity < 0 ) return; // Allow exceeding required quantity for ad-hoc additions

    try {
        const updatedItem = await pocketbaseService.updateSeparacaoItemQuantidade(itemId, newQuantity);
        setActiveSeparacao(prev => {
            if (!prev) return null;
            const newItems = prev.items.map(i => i.id === updatedItem.id ? updatedItem : i);
            return { ...prev, items: newItems };
        });
    } catch (error: any) {
        showToast(error.message || 'Erro ao atualizar quantidade.', 'error');
    }
  };
  
  useEffect(() => {
    if (scannedCode && scanTimestamp && scanTimestamp !== lastScanTimestamp && viewState === 'picking' && activeSeparacao) {
      setLastScanTimestamp(scanTimestamp);
      handleAddItemByScan(scannedCode);
    }
  }, [scannedCode, scanTimestamp, lastScanTimestamp, viewState, activeSeparacao, handleAddItemByScan]);

  const handleFinalizar = async () => {
    if (!activeSeparacao || !currentUser) return;
    if (!window.confirm("Finalizar esta separação? Esta ação movimentará o estoque e colocará a O.S. como 'Aguardando Entrega'.")) return;
    
    setIsProcessing(true);
    try {
        const aguardandoEntrega = await pocketbaseService.finalizarSeparacao(activeSeparacao.separacao.id, currentUser.id);
        setActiveSeparacao(prev => prev ? { ...prev, separacao: aguardandoEntrega } : null);
        setViewState('delivery');
        showToast('Separação concluída, aguardando entrega.', 'success');
    } catch (error: any) {
        showToast(error.message || 'Erro ao finalizar separação.', 'error');
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleConfirmarEntrega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeparacao) return;
    if (!nomeRecebedor.trim()) {
        showToast('Por favor, informe o nome de quem recebeu os itens.', 'warning');
        return;
    }
    setIsProcessing(true);
    try {
        await pocketbaseService.confirmarEntrega(activeSeparacao.separacao.id, nomeRecebedor);
        showToast('Entrega confirmada com sucesso!', 'success');
        loadSeparacoes(); // Go back to the list
    } catch (error: any) {
        showToast(error.message || 'Erro ao confirmar entrega.', 'error');
    } finally {
        setIsProcessing(false);
    }
};


  const handlePrint = () => window.print();

  const sortedPickingItems = useMemo(() => {
    if (activeSeparacao) {
        return [...activeSeparacao.items].sort((a, b) => a.localizacao.localeCompare(b.localizacao));
    }
    return [];
  }, [activeSeparacao]);

  // --- RENDER LOGIC ---
  if (viewState === 'loading') return <div className="flex justify-center items-center h-64"><Spinner /></div>;

  if (viewState === 'list') {
      const getStatusBadge = (status: SeparacaoStatus) => {
        switch (status) {
            case 'em andamento': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400">EM ANDAMENTO</span>;
            case 'aguardando entrega': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-sky-500/20 text-sky-400">AGUARDANDO ENTREGA</span>;
            case 'entregue': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">ENTREGUE</span>;
            default: return null;
        }
      }
      return (
          <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">Separações</h2>
                    <HelpIcon text="Inicie uma separação ou continue uma que já está em progresso." />
                  </div>
                  <button onClick={() => setViewState('create')} className="btn-primary flex items-center gap-2"><PlusIcon/> Nova Separação</button>
              </div>
              {separacoes.length > 0 ? separacoes.map(s => (
                  <div key={s.id} onClick={() => handleSelectSeparacao(s.id)} className={`p-4 rounded-lg cursor-pointer transition-all hover:brightness-125 shadow-md mb-3 flex justify-between items-center ${s.status === 'entregue' ? 'opacity-60' : ''}`} style={{ backgroundColor: 'var(--color-card)'}}>
                      <div>
                        <p className="font-bold text-lg" style={{color: 'var(--color-primary)'}}>O.S.: {s.osNumero}</p>
                        <p>Cliente: {s.cliente}</p>
                        <p className="text-sm mt-1" style={{color: 'var(--color-text-secondary)'}}>Iniciada em: {formatDate(s.created)}</p>
                      </div>
                      {getStatusBadge(s.status)}
                  </div>
              )) : (
                  <div className="text-center p-10 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
                      <p>Nenhuma separação em andamento.</p>
                  </div>
              )}
          </div>
      );
  }

  if (viewState === 'create') {
    return (
        <div className="animate-fade-in max-w-lg mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={loadSeparacoes} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon/></button>
                <h2 className="text-2xl font-bold">Iniciar Nova Separação</h2>
            </div>
             <form onSubmit={handleCreateSeparacao} className="p-6 rounded-lg space-y-4 shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
                <div><label htmlFor="osNumero">Número da O.S.</label><input id="osNumero" type="text" value={osNumero} onChange={e => setOsNumero(e.target.value.toUpperCase())} className="w-full mt-1 p-2" style={{ backgroundColor: 'var(--color-background)' }}/></div>
                <div><label htmlFor="cliente">Nome do Cliente</label><input id="cliente" type="text" value={cliente} onChange={e => setCliente(e.target.value.toUpperCase())} className="w-full mt-1 p-2" style={{ backgroundColor: 'var(--color-background)' }}/></div>
                <div><label htmlFor="placa">Placa do Veículo (Opcional)</label><input id="placa" type="text" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} className="w-full mt-1 p-2" style={{ backgroundColor: 'var(--color-background)' }}/></div>
                <div className="pt-2"><button type="submit" disabled={isProcessing} className="w-full btn-primary">{isProcessing ? <Spinner/> : 'Próximo'}</button></div>
             </form>
        </div>
    );
  }
  
  if ((viewState === 'defineItems' || viewState === 'reviewItems') && activeSeparacao) {
      const itemsToAddCount = validatedItems.filter(i => i.status !== 'not_found').length;

      return (
          <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                 <button onClick={loadSeparacoes} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon/></button>
                 <h2 className="text-2xl font-bold">Definir Itens para Separação</h2>
              </div>
              <div className="p-6 rounded-lg space-y-4 shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
                  
                  {/* Individual Item Form */}
                  <form onSubmit={handleProcessSingleItem} className="flex flex-col sm:flex-row gap-2 items-end">
                      <div className="flex-grow"><label className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Código do Produto</label><input name="codigo" type="text" className="w-full p-2 mt-1" style={{ backgroundColor: 'var(--color-background)' }}/></div>
                      <div className="w-24"><label className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Quantidade</label><input name="quantidade" type="number" min="1" defaultValue="1" className="w-full p-2 mt-1" style={{ backgroundColor: 'var(--color-background)' }}/></div>
                      <button type="submit" disabled={isProcessing} className="btn-primary h-10">Adicionar Item</button>
                  </form>
                  
                  {/* Batch Paste Area */}
                  <div className="border-t pt-4" style={{borderColor: 'var(--color-border)'}}>
                    <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Ou cole os dados da sua planilha. Formato: CÓDIGO (tab/espaço) QUANTIDADE por linha.</p>
                    <textarea value={pastedData} onChange={e => setPastedData(e.target.value)} rows={5} placeholder="CÓDIGO1 10&#10;CÓDIGO2 5" className="w-full p-2 font-mono text-sm mt-2" style={{ backgroundColor: 'var(--color-background)' }} />
                    <div className="flex justify-end mt-2">
                        <button onClick={handleProcessPastedData} disabled={isProcessing} className="px-4 py-2 rounded-md font-semibold text-white transition-all text-sm" style={{ backgroundColor: 'var(--color-primary)'}}>
                            {isProcessing && validatedItems.length === 0 ? <Spinner/> : 'Processar Lista Colada'}
                        </button>
                    </div>
                  </div>

                  {/* Validated Items List */}
                  {validatedItems.length > 0 && (
                      <div className="border-t pt-4" style={{borderColor: 'var(--color-border)'}}>
                        <h3 className="font-semibold mb-2">Lista de Coleta ({itemsToAddCount} válidos)</h3>
                        <div className="max-h-60 overflow-y-auto border rounded-md" style={{borderColor: 'var(--color-border)'}}>
                          <table className="w-full text-left text-sm">
                            <thead className="sticky top-0" style={{backgroundColor: 'var(--color-background)'}}><tr><th className="p-2">Status</th><th className="p-2">Código</th><th className="p-2">Descrição</th><th className="p-2 text-center">Pedido</th><th className="p-2 text-center">Estoque</th></tr></thead>
                            <tbody>
                                {validatedItems.map((item, idx) => {
                                    let statusNode;
                                    switch(item.status) {
                                        case 'found': statusNode = <span className="text-green-400 font-semibold">OK</span>; break;
                                        case 'not_found': statusNode = <span className="text-red-400 font-semibold">NÃO ENCONTRADO</span>; break;
                                        case 'insufficient_stock': statusNode = <span className="text-yellow-400 font-semibold">ESTOQUE BAIXO</span>; break;
                                    }
                                    return (
                                    <tr key={idx} className={`border-t ${item.status === 'not_found' ? 'opacity-60' : ''}`} style={{borderColor: 'var(--color-border)'}}>
                                        <td className="p-2">{statusNode}</td>
                                        <td className="p-2 font-mono">{item.codigoInput}</td>
                                        <td className="p-2">{item.produto?.descricao || '-'}</td>
                                        <td className="p-2 text-center font-bold">{item.quantidadeRequerida}</td>
                                        <td className="p-2 text-center">{item.produto?.quantidade ?? '-'}</td>
                                    </tr>
                                )})}
                            </tbody>
                          </table>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button onClick={handleConfirmItems} disabled={isProcessing || itemsToAddCount === 0} className="btn-primary !text-base !font-bold !py-2">
                                {isProcessing ? <Spinner/> : `Confirmar e Iniciar Separação`}
                            </button>
                        </div>
                      </div>
                  )}

              </div>
          </div>
      )
  }

  if (viewState === 'picking' && activeSeparacao) {
    const { separacao } = activeSeparacao;
    return (
      <div className="animate-fade-in">
          <div className="p-4 rounded-lg mb-6 shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
             <div className="flex items-center gap-2 -ml-2">
                <button onClick={loadSeparacoes} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeftIcon/></button>
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>Separando O.S.: {separacao.osNumero}</h2>
                    <p>Cliente: {separacao.cliente}</p>
                </div>
             </div>
          </div>

          <div className="p-4 rounded-lg mb-6 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <form onSubmit={handleManualAddItemSubmit} className="flex flex-col sm:flex-row gap-2">
                <input 
                    type="text" 
                    value={manualItemCode} 
                    onChange={(e) => setManualItemCode(e.target.value.toUpperCase())}
                    placeholder="Digite ou leia o código do item"
                    className="flex-grow px-4 py-2"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                />
                <button type="submit" className="btn-primary flex items-center justify-center gap-2" disabled={isProcessing}>
                    <PlusIcon/> Adicionar
                </button>
                <button 
                    type="button" 
                    onClick={() => document.querySelector<HTMLButtonElement>('button[title="Ler QR Code"]')?.click()}
                    className="p-2 flex items-center justify-center" 
                    style={{ backgroundColor: 'var(--color-border)' }}
                    title="Escanear Código"
                >
                    <QrCodeIcon className="w-5 h-5" />
                </button>
            </form>
          </div>

          <div className="space-y-2">
            {sortedPickingItems.length > 0 ? sortedPickingItems.map(item => {
                const isComplete = item.quantidade_separada >= item.quantidade_requerida;
                const hasStockIssue = item.quantidade_requerida > item.quantidade_estoque_inicial;
                const isStockDepleted = item.quantidade_separada >= item.quantidade_estoque_inicial;
                
                let bgColor = 'bg-[var(--color-card)]';
                if (highlightedItemId === item.id) bgColor = 'bg-[var(--color-primary)]/20';
                else if (isComplete) bgColor = 'bg-green-500/10';
                else if (hasStockIssue) bgColor = 'bg-yellow-500/10';

                return (
                <div key={item.id} className={`p-3 rounded-md flex flex-col sm:flex-row items-start justify-between shadow transition-all duration-500 ${bgColor}`}>
                    <div className="flex-1 mb-2 sm:mb-0">
                        <p className={`font-semibold ${isComplete ? 'line-through text-gray-500' : ''}`}>{item.produto_descricao}</p>
                        <div className="flex gap-4 text-sm font-mono" style={{color: 'var(--color-text-secondary)'}}><span>{item.produto_codigo}</span><span>Loc: {item.localizacao}</span></div>
                        {hasStockIssue && !isComplete && (
                            <div className="text-xs font-semibold text-yellow-400 mt-1 flex items-center gap-1">
                                <AlertTriangleIcon className="w-4 h-4" />
                                Estoque inicial: {item.quantidade_estoque_inicial}. Faltarão {item.quantidade_requerida - item.quantidade_estoque_inicial} item(s).
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                       {isComplete ? <CheckCircleIcon className="w-8 h-8 text-green-400"/> : (
                         <div className="flex items-center gap-2 rounded-md p-1" style={{backgroundColor: 'var(--color-background)'}}>
                            <button onClick={() => handleUpdateItemQuantidade(item.id, item.quantidade_separada - 1)} className="px-2 font-bold text-lg hover:bg-white/10 rounded-md" disabled={item.quantidade_separada <= 0}>-</button>
                            <span className="font-bold text-lg w-8 text-center">{item.quantidade_separada}</span>
                            <button onClick={() => handleUpdateItemQuantidade(item.id, item.quantidade_separada + 1)} className="px-2 font-bold text-lg hover:bg-white/10 rounded-md" disabled={isStockDepleted}>+</button>
                        </div>
                       )}
                        <span className="text-lg" style={{color: 'var(--color-text-secondary)'}}>/</span>
                        <span className="font-bold text-xl w-8 text-center">{item.quantidade_requerida}</span>
                    </div>
                </div>
            )}) : <p className="text-center p-8">Nenhum item nesta separação.</p>}
          </div>
           <div className="mt-8">
               <button onClick={handleFinalizar} disabled={isProcessing} className="w-full btn-primary !py-3 !text-lg !font-bold">
                   {isProcessing ? <Spinner/> : 'Finalizar Separação'}
               </button>
           </div>
      </div>
    );
  }
  
  if (viewState === 'delivery' && activeSeparacao) {
      const { separacao, items } = activeSeparacao;
      const isDelivered = separacao.status === 'entregue';
      return (
          <div className="animate-fade-in max-w-2xl mx-auto">
              <style>{`
                  @media print {
                      body * { visibility: hidden; }
                      #printable-separation, #printable-separation * { visibility: visible; }
                      #printable-separation { position: absolute; left: 0; top: 0; width: 100%; }
                      .no-print { display: none !important; }
                      @page { size: auto; margin: 10mm; }
                  }
              `}</style>
              <div id="printable-separation">
                  <div className="p-6 rounded-lg shadow-lg bg-[var(--color-card)] print:bg-white print:text-black">
                      <div className="text-center">
                          <h2 className="text-2xl font-bold mb-2">Comprovante de Separação</h2>
                          <p className="mb-4">O.S. {separacao.osNumero}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 border-t border-b py-4 my-4" style={{borderColor: 'var(--color-border)'}}>
                          <p><strong>Cliente:</strong><br/> {separacao.cliente}</p>
                          <p><strong>Placa:</strong><br/> {separacao.placaVeiculo || 'N/A'}</p>
                          <p><strong>Separado por:</strong><br/> {separacao.expand?.usuario?.username || 'N/A'}</p>
                           {isDelivered ? (
                            <>
                                <p><strong>Recebido por:</strong><br/> {separacao.nome_recebedor}</p>
                                <p><strong>Data da Entrega:</strong><br/> {separacao.dataFinalizacao ? formatDate(separacao.dataFinalizacao) : 'N/A'}</p>
                            </>
                            ) : (
                                <p><strong>Data da Separação:</strong><br/> {separacao.dataFinalizacao ? formatDate(separacao.dataFinalizacao) : formatDate(new Date().toISOString())}</p>
                            )}
                      </div>
                      
                        <h3 className="font-bold text-lg mb-2 text-left">Itens Separados</h3>
                        <div className="space-y-2 text-left border-t pt-2" style={{borderColor: 'var(--color-border)'}}>
                             {items.sort((a,b) => a.produto_descricao.localeCompare(b.produto_descricao)).map(item => {
                                const hasDiscrepancy = item.quantidade_separada < item.quantidade_requerida;
                                const wasStockIssue = item.quantidade_requerida > item.quantidade_estoque_inicial;

                                return (
                                    <div key={item.id} className={`border-t pt-2 pb-2 ${hasDiscrepancy ? 'text-red-400' : ''}`} style={{borderColor: 'var(--color-border)'}}>
                                        <div className="grid grid-cols-12 gap-2 text-sm">
                                            <div className="col-span-8">
                                                <p className="font-semibold truncate">{item.produto_descricao}</p>
                                                <p className="font-mono text-xs">{item.produto_codigo}</p>
                                                {hasDiscrepancy && wasStockIssue && <p className="text-xs italic text-yellow-500">Falta por estoque insuficiente</p>}
                                            </div>
                                            <div className="col-span-4 flex items-center justify-around">
                                                 <div className="text-center">
                                                    <p className="text-xs no-print" style={{color: 'var(--color-text-secondary)'}}>Req.</p>
                                                    <p className="font-bold">{item.quantidade_requerida}</p>
                                                 </div>
                                                 <div className="text-center">
                                                    <p className="text-xs no-print" style={{color: 'var(--color-text-secondary)'}}>Sep.</p>
                                                    <p className="font-bold">{item.quantidade_separada}</p>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                )})}
                        </div>
                  </div>
              </div>
              {isDelivered ? (
                 <div className="no-print mt-6 p-4 rounded-lg text-center" style={{backgroundColor: 'var(--color-background)', border: `1px solid var(--color-border)`}}>
                    <div className="flex items-center justify-center gap-2 text-green-400">
                        <CheckCircleIcon className="w-6 h-6" />
                        <h3 className="text-lg font-semibold">Entrega Confirmada</h3>
                    </div>
                    <p className="mt-2">Recebido por <span className="font-bold">{separacao.nome_recebedor}</span> em {separacao.dataFinalizacao ? formatDate(separacao.dataFinalizacao) : 'data indisponível'}.</p>
                </div>
              ) : (
                <form onSubmit={handleConfirmarEntrega} className="no-print mt-6 p-4 rounded-lg" style={{backgroundColor: 'var(--color-background)', border: `1px solid var(--color-border)`}}>
                    <h3 className="text-lg font-semibold mb-2">Confirmar Entrega</h3>
                    <div>
                        <label htmlFor="nomeRecebedor" className="block mb-1 font-medium text-sm" style={{color: 'var(--color-text-secondary)'}}>Entregue para:</label>
                        <input 
                            id="nomeRecebedor" 
                            type="text" 
                            value={nomeRecebedor} 
                            onChange={e => setNomeRecebedor(e.target.value.toUpperCase())}
                            placeholder="Digite o nome de quem recebeu"
                            className="w-full p-2"
                            style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                            required
                        />
                    </div>
                    <button type="submit" disabled={isProcessing} className="w-full btn-primary mt-4 flex items-center justify-center gap-2">
                        {isProcessing ? <Spinner /> : <><CheckCircleIcon /> Confirmar Entrega</>}
                    </button>
                </form>
              )}

              <div className="no-print mt-6 flex flex-col sm:flex-row justify-between gap-4">
                  <button onClick={loadSeparacoes} className="px-6 py-2 rounded-lg font-semibold" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)'}}>Voltar para a Lista</button>
                  <button onClick={handlePrint} className="btn-primary flex items-center justify-center gap-2"><PrintIcon/> Imprimir</button>
              </div>
          </div>
      )
  }

  return null;
};
