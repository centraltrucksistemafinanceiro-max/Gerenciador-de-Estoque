import React, { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, MovimentacaoTipo, EntradaLoteValidada } from '../../types';
import Spinner from '../Spinner';
import { formatCurrency } from '../../utils/formatters';
import { SearchIcon, ArrowDownIcon, ArrowUpIcon, ClipboardCopyIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useAuth } from '../../hooks/useAuth';

// --- Modal Component ---
const BatchEntryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    empresaId: string;
    showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}> = ({ isOpen, onClose, empresaId, showToast }) => {
    const { currentUser } = useAuth();
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [textData, setTextData] = useState('');
    const [validatedItems, setValidatedItems] = useState<EntradaLoteValidada[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // Reset state when modal is opened/closed
        if (isOpen) {
            setStep('input');
            setTextData('');
            setValidatedItems([]);
        }
    }, [isOpen]);

    const handleProcessAndValidate = async () => {
        if (!textData.trim()) {
            showToast('Cole os dados na área de texto.', 'warning');
            return;
        }
        setIsProcessing(true);
        const lines = textData.trim().split('\n');
        const itemsToValidate = lines.map(line => {
            const parts = line.split(/\s+/); // Split by tab or space
            return {
                codigo: (parts[0] || '').toUpperCase(),
                quantidade: parseInt(parts[1], 10) || 0,
            };
        }).filter(item => item.codigo && item.quantidade > 0);

        if (itemsToValidate.length === 0) {
            showToast('Nenhum item válido para processar. Verifique o formato: CÓDIGO QTD.', 'warning');
            setIsProcessing(false);
            return;
        }

        try {
            const results = await pocketbaseService.validarEntradasEmLote(empresaId, itemsToValidate);
            setValidatedItems(results);
            setStep('preview');
        } catch (error) {
            showToast('Erro ao validar os itens.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleConfirmEntries = async () => {
        if (!currentUser) {
            showToast('Sessão expirada. Faça login novamente.', 'error');
            return;
        }
        const validItems = validatedItems.filter(item => item.status === 'ok');
        if (validItems.length === 0) {
            showToast('Nenhum item válido para registrar entrada.', 'warning');
            return;
        }

        setIsProcessing(true);
        try {
            const result = await pocketbaseService.registrarEntradasEmLote(empresaId, validItems, currentUser.id);
            showToast(`${result.sucesso} entrada(s) registrada(s) com sucesso.`, 'success');
            if (result.falha > 0) {
                showToast(`${result.falha} entrada(s) falharam.`, 'error');
            }
            onClose(); // Close modal on success
        } catch (error: any) {
            showToast(error.message || 'Erro ao registrar entradas.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const itemsToImportCount = validatedItems.filter(p => p.status === 'ok').length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-3xl rounded-lg shadow-xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                {step === 'input' && (
                    <div className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold">Entrada de Produtos em Lote</h3>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                            Cole os dados da sua planilha ou nota. Formato: CÓDIGO (tab ou espaço) QUANTIDADE, um por linha.
                        </p>
                        <textarea
                            value={textData}
                            onChange={(e) => setTextData(e.target.value)}
                            rows={10}
                            placeholder={`17171	3\n1717/1	12\n2089235	3`}
                            className="w-full p-2 rounded-md font-mono text-sm"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                        />
                        <div className="flex justify-end gap-4">
                            <button onClick={onClose} className="px-6 py-2 rounded-md font-semibold" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text)'}}>Cancelar</button>
                            <button onClick={handleProcessAndValidate} disabled={isProcessing} className="btn-primary">
                                {isProcessing ? <Spinner/> : 'Processar e Validar'}
                            </button>
                        </div>
                    </div>
                )}
                {step === 'preview' && (
                    <div className="p-6 space-y-4">
                        <h3 className="text-lg font-semibold">Pré-visualização da Entrada</h3>
                        <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                            Apenas os itens com status "OK" terão a entrada registrada.
                        </p>
                        <div className="overflow-auto max-h-80 rounded-md border" style={{borderColor: 'var(--color-border)'}}>
                           <table className="w-full text-left text-sm">
                               <thead className="sticky top-0" style={{backgroundColor: 'var(--color-background)'}}>
                                   <tr>
                                       <th className="p-2">Status</th>
                                       <th className="p-2">Código</th>
                                       <th className="p-2">Descrição</th>
                                       <th className="p-2">Qtd. Entrada</th>
                                       <th className="p-2">Info</th>
                                   </tr>
                               </thead>
                               <tbody>
                                   {validatedItems.map((item, i) => (
                                       <tr key={i} className="border-t" style={{borderColor: 'var(--color-border)'}}>
                                           <td className="p-2">
                                               {item.status === 'ok' && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">OK</span>}
                                               {item.status === 'nao_encontrado' && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">NÃO ENCONTRADO</span>}
                                               {item.status === 'erro' && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400">ERRO</span>}
                                           </td>
                                           <td className="p-2 font-mono">{item.codigoInput}</td>
                                           <td className="p-2">{item.produto?.descricao || '-'}</td>
                                           <td className="p-2 font-bold text-center">{item.quantidade}</td>
                                           <td className="p-2 text-yellow-400">{item.mensagemErro}</td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <button onClick={() => setStep('input')} className="px-6 py-2 rounded-md font-semibold" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text)'}}>Voltar</button>
                            <button onClick={handleConfirmEntries} disabled={isProcessing || itemsToImportCount === 0} className="btn-primary">
                                {isProcessing ? <Spinner/> : `Confirmar ${itemsToImportCount} Entradas`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// FIX: Define missing props interface for the component.
interface MovimentacaoTabProps {
  empresaId: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  codigoBuscaInicial: string | null;
}

// --- Main Component ---
export const MovimentacaoTab: React.FC<MovimentacaoTabProps> = ({ empresaId, showToast, codigoBuscaInicial }) => {
  const { currentUser } = useAuth();
  const [codigoBusca, setCodigoBusca] = useState(codigoBuscaInicial || '');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  const [tipo, setTipo] = useState<MovimentacaoTipo>('entrada');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const resetForm = () => {
    setCodigoBusca('');
    setProduto(null);
    setNotFound(false);
    setTipo('entrada');
    setQuantidade(1);
  };

  const searchProduct = useCallback(async (codeToSearch: string) => {
    if (!codeToSearch) {
      showToast('Por favor, insira um código.', 'warning');
      return;
    }
    setIsLoading(true);
    setProduto(null);
    setNotFound(false);
    try {
      const result = await pocketbaseService.findProdutoByCodigo(empresaId, codeToSearch);
      if (result) {
        if(result.status === 'inativo') {
            showToast(`Produto '${result.descricao}' está inativo e não pode ser movimentado.`, 'warning');
            setProduto(result); // Set product to show its state, but form will be disabled
        } else {
            setProduto(result);
        }
      } else {
        setNotFound(true);
      }
    } catch (error) {
      showToast('Erro ao buscar produto.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, showToast]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchProduct(codigoBusca.trim());
  };

  useEffect(() => {
    if (codigoBuscaInicial) {
      const initialCode = codigoBuscaInicial.trim();
      if (initialCode) {
        setCodigoBusca(initialCode);
        searchProduct(initialCode);
      }
    }
  }, [codigoBuscaInicial, searchProduct]);


  const handleMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto || produto.status === 'inativo' || !currentUser) return;

    const quantNum = Number(quantidade);
    if (isNaN(quantNum) || quantNum <= 0) {
      showToast('A quantidade deve ser um número maior que zero.', 'warning');
      return;
    }

    if (tipo === 'saida' && quantNum > produto.quantidade) {
      showToast('A quantidade de saída não pode ser maior que o estoque atual.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const novaQuantidade = tipo === 'entrada' ? produto.quantidade + quantNum : produto.quantidade - quantNum;
      
      await pocketbaseService.updateQuantidadeProduto(produto.id, novaQuantidade);
      
      await pocketbaseService.registrarMovimentacao({
        empresa: empresaId,
        produto_codigo: produto.codigo,
        produto_descricao: produto.descricao,
        tipo,
        quantidade: quantNum,
        usuario: currentUser.id
      });

      showToast(`Movimentação de ${tipo} registrada com sucesso!`, 'success');
      resetForm();
    } catch (error) {
      showToast('Erro ao registrar movimentação.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleQuantidadeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
        setQuantidade('');
    } else {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 0) {
            setQuantidade(num);
        }
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <BatchEntryModal isOpen={isBatchModalOpen} onClose={() => setIsBatchModalOpen(false)} empresaId={empresaId} showToast={showToast} />
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Movimentação de Estoque</h2>
            <HelpIcon text="Registre entradas e saídas de produtos para manter o controle do seu estoque sempre atualizado." />
        </div>
        <button
            onClick={() => setIsBatchModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md font-semibold transition-all" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)'}}
        >
            <ClipboardCopyIcon/>
            Entrada em Lote
        </button>
      </div>
      
      {!produto ? (
        <div>
          <p className="mb-4" style={{color: 'var(--color-text-secondary)'}}>Busque o produto pelo código para registrar uma entrada ou saída individual.</p>
          <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={codigoBusca}
              onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())}
              placeholder="Digite o código do produto"
              className="flex-grow px-4 py-2"
              style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center justify-center gap-2">
              {isLoading ? <Spinner /> : <><SearchIcon className="w-5 h-5" /> Buscar</>}
            </button>
          </form>
          {notFound && <p className="mt-4 text-red-400">Produto não encontrado.</p>}
        </div>
      ) : (
        <div className="p-6 rounded-lg animate-fade-in shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>{produto.descricao}</h3>
              <p className="font-mono text-sm mb-2" style={{color: 'var(--color-text-secondary)'}}>{produto.codigo}</p>
              <p>Estoque Atual: <span className="font-bold">{produto.quantidade}</span></p>
              <p>Localização: <span className="font-mono">{produto.localizacao}</span></p>
            </div>
             <div className="flex flex-col items-end gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${produto.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {produto.status.toUpperCase()}
                </span>
                <button onClick={resetForm} className="text-sm hover:underline" style={{color: 'var(--color-primary)'}}>Buscar outro</button>
            </div>
          </div>
          
          <form onSubmit={handleMovimentacao} className={`mt-6 border-t pt-6 ${produto.status === 'inativo' ? 'opacity-50 pointer-events-none' : ''}`} style={{borderColor: 'var(--color-border)'}}>
             {produto.status === 'inativo' && (
                <div className="text-center p-4 mb-4 rounded-md" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)'}}>
                    <p className="font-semibold text-red-400">Este produto está inativo e não pode ser movimentado.</p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block mb-2 font-semibold">Tipo de Movimento</label>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setTipo('entrada')} className={`flex-1 py-2 rounded-lg border-2 transition-all font-semibold ${tipo === 'entrada' ? 'text-green-400 border-green-400 bg-green-500/10' : ''}`} style={{borderColor: tipo === 'entrada' ? '' : 'var(--color-border)'}}>Entrada</button>
                  <button type="button" onClick={() => setTipo('saida')} className={`flex-1 py-2 rounded-lg border-2 transition-all font-semibold ${tipo === 'saida' ? 'text-red-400 border-red-400 bg-red-500/10' : ''}`} style={{borderColor: tipo === 'saida' ? '' : 'var(--color-border)'}}>Saída</button>
                </div>
              </div>
              <div className="md:col-span-1">
                <label htmlFor="quantidade" className="block mb-2 font-semibold">Quantidade</label>
                <input
                  id="quantidade"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantidade}
                  onChange={handleQuantidadeChange}
                  className="w-full px-4 py-2"
                  style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                />
              </div>
              <div className="md:col-span-1 self-end">
                <button type="submit" disabled={isProcessing || produto.status === 'inativo'} className="w-full btn-primary flex items-center justify-center gap-2">
                  {isProcessing ? <Spinner /> : (tipo === 'entrada' ? <><ArrowUpIcon/> Registrar Entrada</> : <><ArrowDownIcon/> Registrar Saída</>)}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};