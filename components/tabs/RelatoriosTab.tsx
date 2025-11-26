import React, { useState } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Movimentacao, MovimentacaoTipo } from '../../types';
import { formatDate } from '../../utils/formatters';
import Spinner from '../Spinner';
import { PrintIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

interface RelatoriosTabProps {
    empresaId: string;
}

export const RelatoriosTab: React.FC<RelatoriosTabProps> = ({ empresaId }) => {
  const [filters, setFilters] = useState({
    produtoCodigo: '',
    dataInicio: '',
    dataFim: '',
    tipo: 'todos' as MovimentacaoTipo | 'todos',
  });
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ 
        ...prev, 
        [name]: name === 'produtoCodigo' ? value.toUpperCase() : value 
    }));
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);
    try {
      const data = await pocketbaseService.getMovimentacoes(empresaId, filters);
      setMovimentacoes(data);
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="animate-fade-in">
       <style>{`
            @media print {
                body * {
                    visibility: hidden;
                }
                #printable-report, #printable-report * {
                    visibility: visible;
                }
                #printable-report {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white;
                    color: black;
                }
                .no-print {
                    display: none !important;
                }
                /* Force black/white on elements with theme colors */
                #printable-report * {
                    background-color: transparent !important;
                    color: black !important;
                    border-color: #ddd !important;
                    box-shadow: none !important;
                }
                #printable-report table {
                    border-collapse: collapse;
                }
                #printable-report th, #printable-report td {
                    border: 1px solid #999 !important;
                }
                #printable-report th {
                    font-weight: bold;
                }
                /* Ensure status badges are readable */
                #printable-report span[class*="bg-green-500"],
                #printable-report span[class*="bg-red-500"] {
                    border: 1px solid black;
                    padding: 1px 3px;
                }
            }
        `}</style>

      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Relatório de Movimentações</h2>
        <HelpIcon text="Gere relatórios detalhados de todas as entradas e saídas de produtos com base em filtros de período, tipo e código." />
      </div>

      <form onSubmit={handleGenerateReport} className="no-print p-6 rounded-lg mb-8 space-y-4 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="produtoCodigo" className="block mb-1 font-medium text-sm" style={{color: 'var(--color-text-secondary)'}}>Código do Produto</label>
            <input type="text" name="produtoCodigo" id="produtoCodigo" value={filters.produtoCodigo} onChange={handleFilterChange} className="w-full p-2" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}/>
          </div>
          <div>
            <label htmlFor="dataInicio" className="block mb-1 font-medium text-sm" style={{color: 'var(--color-text-secondary)'}}>Data Início</label>
            <input type="date" name="dataInicio" id="dataInicio" value={filters.dataInicio} onChange={handleFilterChange} className="w-full p-2" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}/>
          </div>
          <div>
            <label htmlFor="dataFim" className="block mb-1 font-medium text-sm" style={{color: 'var(--color-text-secondary)'}}>Data Fim</label>
            <input type="date" name="dataFim" id="dataFim" value={filters.dataFim} onChange={handleFilterChange} className="w-full p-2" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}/>
          </div>
          <div>
            <label htmlFor="tipo" className="block mb-1 font-medium text-sm" style={{color: 'var(--color-text-secondary)'}}>Tipo</label>
            <select name="tipo" id="tipo" value={filters.tipo} onChange={handleFilterChange} className="w-full p-2" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}>
              <option value="todos">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
            <button type="submit" disabled={isLoading} className="btn-primary">
                {isLoading ? <Spinner/> : 'Gerar Relatório'}
            </button>
        </div>
      </form>

      {isLoading && <div className="flex justify-center p-8"><Spinner /></div>}
      
      {!isLoading && hasSearched && (
        <div id="printable-report">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Resultados</h3>
                <button
                    onClick={handlePrint}
                    className="no-print btn-primary flex items-center justify-center gap-2"
                >
                    <PrintIcon />
                    <span className="hidden sm:inline">Imprimir</span>
                </button>
            </div>
             <h1 className="text-3xl font-bold text-center mb-4 hidden print:block" style={{color: 'black'}}>Relatório de Movimentações</h1>
             <p className="text-lg text-center mb-8 hidden print:block" style={{color: 'black'}}>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
            <div className="overflow-x-auto rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left">
                    <thead style={{ backgroundColor: 'var(--color-background)' }}>
                        <tr>
                        <th className="p-4 font-semibold">Data</th>
                        <th className="p-4 font-semibold">Código</th>
                        <th className="p-4 font-semibold">Descrição</th>
                        <th className="p-4 font-semibold text-center">Tipo</th>
                        <th className="p-4 font-semibold text-center">Quantidade</th>
                        <th className="p-4 font-semibold">Usuário</th>
                        </tr>
                    </thead>
                    <tbody>
                        {movimentacoes.length > 0 ? (
                            movimentacoes.map((m, index) => (
                            <tr key={m.id} className="border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)' }}>
                                <td className="p-4 whitespace-nowrap">{formatDate(m.created)}</td>
                                <td className="p-4 font-mono">{m.produto_codigo}</td>
                                <td className="p-4">{m.produto_descricao}</td>
                                <td className="p-4 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.tipo === 'entrada' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {m.tipo.toUpperCase()}
                                </span>
                                </td>
                                <td className="p-4 text-center">{m.quantidade}</td>
                                <td className="p-4">{m.expand?.usuario?.username || 'N/A'}</td>
                            </tr>
                            ))
                        ) : (
                            <tr>
                            <td colSpan={6} className="text-center p-8" style={{color: 'var(--color-text-secondary)'}}>Nenhuma movimentação encontrada para os filtros selecionados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};
