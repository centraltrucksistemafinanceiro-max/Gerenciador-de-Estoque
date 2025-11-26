import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, Tab } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import Spinner from '../Spinner';
import { PrintIcon, ViewIcon, EditIcon, FileSpreadsheetIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useDebounce } from '../../hooks/useDebounce';

// Make TypeScript aware of the XLSX library from the CDN
declare const XLSX: any;

interface InventarioTabProps {
  empresaId: string;
  onNavigateToTab: (tab: Tab, data?: any) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const InventarioTab: React.FC<InventarioTabProps> = ({ empresaId, onNavigateToTab, showToast }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTermInput, setSearchTermInput] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  const debouncedSearchTerm = useDebounce(searchTermInput, 300);

  const fetchProdutos = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await pocketbaseService.getAllProdutos(empresaId, showInactive);
      setProdutos(data);
    } catch (error) {
      console.error("Erro ao carregar inventário:", error);
    } finally {
      setIsLoading(false);
    }
  }, [empresaId, showInactive]);

  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);
  
  const uniqueLocations = useMemo(() => {
    const locations = new Set(produtos.map(p => p.localizacao.trim()).filter(Boolean));
    return Array.from(locations).sort();
  }, [produtos]);

  const filteredProdutos = useMemo(() => {
    const term = debouncedSearchTerm.toLowerCase();
    return produtos.filter(p => {
        const matchesSearchTerm = !debouncedSearchTerm ||
            p.codigo.toLowerCase().includes(term) ||
            p.descricao.toLowerCase().includes(term) ||
            p.localizacao.toLowerCase().includes(term) ||
            p.codigos_alternativos.some(c => c.toLowerCase().includes(term));

        const matchesLocation = !selectedLocation || p.localizacao === selectedLocation;

        return matchesSearchTerm && matchesLocation;
    });
  }, [produtos, debouncedSearchTerm, selectedLocation]);

  const valorTotalInventario = useMemo(() => {
    return filteredProdutos.reduce((acc, p) => acc + p.valor * p.quantidade, 0);
  }, [filteredProdutos]);

  const handlePrint = () => {
    window.print();
  };
  
  const handleExportXLSX = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
        const dataToExport = filteredProdutos.map(p => ({
            'Código': p.codigo,
            'Descrição': p.descricao,
            'Status': p.status.toUpperCase(),
            'Quantidade': p.quantidade,
            'Localização': p.localizacao,
            'Valor Unitário': p.valor,
            'Valor Total': p.valor * p.quantidade,
            'Códigos Alternativos': p.codigos_alternativos.join(', ')
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');
        
        // Auto-size columns
        const colWidths = Object.keys(dataToExport[0] || {}).map((key, i) => {
            const maxLength = Math.max(
                key.length,
                ...dataToExport.map(row => (row as any)[key]?.toString().length || 0)
            );
            return { wch: maxLength + 2 };
        });
        worksheet['!cols'] = colWidths;
        
        const date = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(workbook, `relatorio_estoque_${date}.xlsx`);
        showToast('Exportação para XLSX concluída.', 'success');
    } catch (error) {
        showToast('Erro ao exportar para XLSX.', 'error');
        console.error("XLSX Export Error:", error);
    } finally {
        setIsExporting(false);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  return (
    <div className="animate-fade-in">
        <style>{`
            @media print {
                body * {
                    visibility: hidden;
                }
                #printable-stock-report, #printable-stock-report * {
                    visibility: visible;
                }
                #printable-stock-report {
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
                #printable-stock-report * {
                    background-color: transparent !important;
                    color: black !important;
                    border-color: #ddd !important;
                    box-shadow: none !important;
                }
                #printable-stock-report table {
                    border-collapse: collapse;
                }
                #printable-stock-report th, #printable-stock-report td {
                    border: 1px solid #999 !important;
                }
                #printable-stock-report th {
                    font-weight: bold;
                }
                #printable-stock-report tfoot td {
                    font-weight: bold;
                }
                /* Ensure status badges are readable */
                #printable-stock-report span[class*="bg-green-500"],
                #printable-stock-report span[class*="bg-red-500"] {
                    border: 1px solid black;
                    padding: 1px 3px;
                }
            }
        `}</style>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Estoque</h2>
          <HelpIcon text="Veja a lista completa de todos os produtos em estoque. Use os filtros para refinar sua busca." />
        </div>
        <div className="no-print flex items-center gap-2">
             <button
                onClick={handleExportXLSX}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm rounded-md font-semibold transition-all"
                style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)'}}
            >
                {isExporting ? <Spinner /> : <FileSpreadsheetIcon />}
                <span className="hidden sm:inline">Exportar XLSX</span>
            </button>
            <button
                onClick={handlePrint}
                className="btn-primary flex items-center justify-center gap-2"
            >
                <PrintIcon />
                <span className="hidden sm:inline">Imprimir</span>
            </button>
        </div>
      </div>
      
      <div className="no-print p-4 rounded-lg mb-6 flex flex-col sm:flex-row flex-wrap items-end gap-4 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="search-term" className="block text-sm font-medium mb-1" style={{color: 'var(--color-text-secondary)'}}>Buscar</label>
            <input
                id="search-term"
                type="text"
                placeholder="Código, descrição..."
                value={searchTermInput}
                onChange={(e) => setSearchTermInput(e.target.value.toUpperCase())}
                className="px-4 py-2 w-full"
                style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            />
        </div>
        <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="location-filter" className="block text-sm font-medium mb-1" style={{color: 'var(--color-text-secondary)'}}>Localização</label>
            <select
                id="location-filter"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="px-4 py-2 w-full"
                style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
                <option value="">Todas</option>
                {uniqueLocations.map(location => (
                    <option key={location} value={location}>{location}</option>
                ))}
            </select>
        </div>
        <div className="flex items-center">
            <input
                type="checkbox"
                id="showInactive"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded-sm"
                style={{accentColor: 'var(--color-primary)'}}
            />
            <label htmlFor="showInactive" className="ml-2 text-sm">
                Mostrar inativos
            </label>
        </div>
    </div>


      <div id="printable-stock-report">
        <h1 className="text-3xl font-bold text-center mb-4 hidden print:block" style={{color: 'black'}}>Relatório de Estoque</h1>
        <p className="text-lg text-center mb-8 hidden print:block" style={{color: 'black'}}>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="overflow-x-auto rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full min-w-[800px] text-left print:text-black">
          <thead style={{ backgroundColor: 'var(--color-background)' }}>
            <tr>
              <th className="p-4 font-semibold">Código</th>
              <th className="p-4 font-semibold">Descrição</th>
              <th className="p-4 font-semibold text-center">Status</th>
              <th className="p-4 font-semibold text-center">Qtd.</th>
              <th className="p-4 font-semibold">Localização</th>
              <th className="p-4 font-semibold text-right">Valor Unit.</th>
              <th className="p-4 font-semibold text-right">Valor Total</th>
              <th className="p-4 font-semibold text-center no-print">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProdutos.map((produto, index) => {
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${encodeURIComponent(produto.codigo)}&qzone=1&margin=0`;
              return (
              <tr key={produto.id} className="border-t hover:bg-white/5" style={{ borderColor: 'var(--color-border)', opacity: produto.status === 'inativo' ? 0.5 : 1 }}>
                <td className="p-4 font-mono align-middle">
                    <span className="print:hidden">{produto.codigo}</span>
                    <div className="hidden print:flex print:flex-col print:items-center print:justify-center">
                        <img src={qrCodeUrl} alt={`QR Code for ${produto.codigo}`} className="w-12 h-12" />
                        <span className="text-xs mt-1">{produto.codigo}</span>
                    </div>
                </td>
                <td className="p-4 align-middle">{produto.descricao}</td>
                <td className="p-4 text-center align-middle">
                   <span className={`px-2 py-1 text-xs font-semibold rounded-full ${produto.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                     {produto.status.toUpperCase()}
                   </span>
                </td>
                <td className="p-4 text-center align-middle">{produto.quantidade}</td>
                <td className="p-4 font-mono align-middle">{produto.localizacao}</td>
                <td className="p-4 text-right align-middle">{formatCurrency(produto.valor)}</td>
                <td className="p-4 text-right font-semibold align-middle">{formatCurrency(produto.valor * produto.quantidade)}</td>
                <td className="p-4 text-center no-print align-middle">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onNavigateToTab('consulta', { codigoBuscaInicial: produto.codigo })}
                        className="p-2 rounded-full transition-colors hover:bg-gray-700"
                        style={{color: 'var(--color-primary)'}}
                        title="Ver Produto"
                      >
                        <ViewIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onNavigateToTab('cadastro', { produtoParaEditar: produto })}
                        className="p-2 rounded-full transition-colors hover:bg-gray-700"
                        style={{color: 'var(--color-text-secondary)'}}
                        title="Editar Produto"
                      >
                        <EditIcon className="w-5 h-5" />
                      </button>
                    </div>
                </td>
              </tr>
            )})}
             {filteredProdutos.length === 0 && (
                <tr>
                    <td colSpan={8} className="text-center p-8" style={{color: 'var(--color-text-secondary)'}}>Nenhum produto encontrado.</td>
                </tr>
             )}
          </tbody>
          <tfoot>
            <tr className="border-t" style={{borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)'}}>
                <td colSpan={6} className="p-4 text-right font-bold text-lg">TOTAL DO ESTOQUE (filtrado)</td>
                <td className="p-4 text-right font-bold text-lg" style={{color: 'var(--color-primary)'}}>{formatCurrency(valorTotalInventario)}</td>
                <td className="no-print"></td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </div>
  );
};
