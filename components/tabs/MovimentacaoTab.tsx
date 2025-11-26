import React, { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, MovimentacaoTipo } from '../../types';
import Spinner from '../Spinner';
import { formatCurrency } from '../../utils/formatters';
import { SearchIcon, ArrowDownIcon, ArrowUpIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useAuth } from '../../hooks/useAuth';

interface MovimentacaoTabProps {
  empresaId: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  codigoBuscaInicial?: string | null;
}

export const MovimentacaoTab: React.FC<MovimentacaoTabProps> = ({ empresaId, showToast, codigoBuscaInicial }) => {
  const { currentUser } = useAuth();
  const [codigoBusca, setCodigoBusca] = useState(codigoBuscaInicial || '');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  const [tipo, setTipo] = useState<MovimentacaoTipo>('entrada');
  const [quantidade, setQuantidade] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (quantidade <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'warning');
      return;
    }
    if (tipo === 'saida' && quantidade > produto.quantidade) {
      showToast('A quantidade de saída não pode ser maior que o estoque atual.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const novaQuantidade = tipo === 'entrada' ? produto.quantidade + quantidade : produto.quantidade - quantidade;
      
      await pocketbaseService.updateQuantidadeProduto(produto.id, novaQuantidade);
      
      await pocketbaseService.registrarMovimentacao({
        empresa: empresaId,
        produto_codigo: produto.codigo,
        produto_descricao: produto.descricao,
        tipo,
        quantidade,
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

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Movimentação de Estoque</h2>
        <HelpIcon text="Registre entradas e saídas de produtos para manter o controle do seu estoque sempre atualizado." />
      </div>
      
      {!produto ? (
        <div>
          <p className="mb-4" style={{color: 'var(--color-text-secondary)'}}>Primeiro, busque o produto pelo código para registrar uma entrada ou saída.</p>
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
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
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
