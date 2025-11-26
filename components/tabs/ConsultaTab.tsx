import React, { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, Tab } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import Spinner from '../Spinner';
import { SearchIcon, EditIcon, PlusIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

interface ConsultaTabProps {
  empresaId: string;
  codigoBuscaInicial: string | null;
  onNavigateToTab: (tab: Tab, data?: any) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const ConsultaTab: React.FC<ConsultaTabProps> = ({ empresaId, codigoBuscaInicial, onNavigateToTab, showToast }) => {
  const [codigo, setCodigo] = useState('');
  const [produto, setProduto] = useState<Produto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = useCallback(async (searchCodigo: string) => {
    if (!searchCodigo) {
      showToast('Por favor, insira um código para buscar.', 'warning');
      return;
    }
    setIsLoading(true);
    setProduto(null);
    setNotFound(false);
    try {
      const result = await pocketbaseService.findProdutoByCodigo(empresaId, searchCodigo);
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
  }, [empresaId, showToast]);

  useEffect(() => {
    if (codigoBuscaInicial) {
      setCodigo(codigoBuscaInicial);
      handleSearch(codigoBuscaInicial);
    }
  }, [codigoBuscaInicial, handleSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(codigo);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Consultar Produto</h2>
        <HelpIcon text="Busque por um produto específico usando o código principal ou alternativo para ver detalhes e editar." />
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="Digite o código principal ou alternativo"
          className="flex-grow px-4 py-2 transition-all"
          style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isLoading ? <Spinner /> : <><SearchIcon className="w-5 h-5" /> Buscar</>}
        </button>
      </form>

      {produto && (
        <div className={`p-6 rounded-lg animate-fade-in shadow-md ${produto.status === 'inativo' ? 'opacity-70' : ''}`} style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>{produto.descricao}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${produto.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {produto.status.toUpperCase()}
              </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div><strong style={{color: 'var(--color-text-secondary)'}}>Código Principal:</strong> <span className="font-mono">{produto.codigo}</span></div>
            <div><strong style={{color: 'var(--color-text-secondary)'}}>Localização:</strong> <span className="font-mono">{produto.localizacao}</span></div>
            <div><strong style={{color: 'var(--color-text-secondary)'}}>Quantidade em Estoque:</strong> {produto.quantidade}</div>
            <div><strong style={{color: 'var(--color-text-secondary)'}}>Valor Unitário:</strong> {formatCurrency(produto.valor)}</div>
          </div>
          
           {produto.codigos_alternativos && produto.codigos_alternativos.length > 0 && (
            <div className="mt-4">
              <strong style={{color: 'var(--color-text-secondary)'}}>Códigos Alternativos:</strong>
              <div className="flex flex-wrap gap-2 mt-2">
                {produto.codigos_alternativos.map((altCodigo, index) => (
                  <span key={index} className="px-2 py-1 text-sm font-mono rounded-md" style={{backgroundColor: 'var(--color-background)'}}>{altCodigo}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onNavigateToTab('cadastro', { produtoParaEditar: produto })}
            className="mt-6 btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <EditIcon /> Editar Produto
          </button>
        </div>
      )}

      {notFound && (
        <div className="p-6 rounded-lg text-center animate-fade-in shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="text-lg font-semibold mb-4">Produto não encontrado.</h3>
          <p className="mb-6" style={{color: 'var(--color-text-secondary)'}}>O código <span className="font-mono font-bold">{codigo}</span> não corresponde a nenhum produto cadastrado nesta empresa.</p>
          <button
            onClick={() => onNavigateToTab('cadastro', { codigoNovoProduto: codigo })}
            className="btn-primary flex items-center justify-center gap-2 mx-auto"
          >
            <PlusIcon /> Cadastrar Novo Produto
          </button>
        </div>
      )}
    </div>
  );
};
