import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, Tab } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import Spinner from '../Spinner';
import { PrintIcon, ViewIcon, EditIcon, FileSpreadsheetIcon, ArrowUpIcon, ArrowDownIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useDebounce } from '../../hooks/useDebounce';
import QRCodeGenerator from '../QRCodeGenerator';

// Make TypeScript aware of the XLSX library from the CDN
declare const XLSX: any;

interface InventarioTabProps {
  empresaId: string;
  onNavigateToTab: (tab: Tab, data?: any) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

type SortKey = 'codigo' | 'descricao' | 'status' | 'quantidade' | 'localizacao' | 'valor';
type SortDirection = 'asc' | 'desc';

export const InventarioTab: React.FC<InventarioTabProps> = ({ empresaId, onNavigateToTab, showToast }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTermInput, setSearchTermInput] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>('descricao');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(300);
  
  const locationMenuRef = useRef<HTMLDivElement>(null);




  const debouncedSearchTerm = useDebounce(searchTermInput, 300);

  const [allLocations, setAllLocations] = useState<string[]>([]);

  // Fetch ALL unique locations once when company changes
  useEffect(() => {
    let isMounted = true;
    const fetchAllPossibleLocations = async () => {
      try {
        const locationsData = await pocketbaseService.getUniqueProductLocations(empresaId);
        if (isMounted) {
          setAllLocations(locationsData);
        }
      } catch (error) {
        console.error("Erro ao carregar localizações:", error);
      }
    };
    fetchAllPossibleLocations();
    return () => { isMounted = false; };
  }, [empresaId]);



  // Main effect to fetch filtered and sorted products from the server
  useEffect(() => {
    let isMounted = true;
    const fetchProdutos = async () => {
      setIsLoading(true);
      try {
        const options = {
          searchTerm: debouncedSearchTerm,
          locations: selectedLocations,
          sortKey: sortKey,
          sortDirection: sortDirection,
        };

        const data = await pocketbaseService.getAllProdutos(empresaId, showInactive, options);
        if (isMounted) {
          setProdutos(data);
        }
      } catch (error: any) {
        // Gracefully handle request cancellation
        if (!error.isAbort) {
            console.error("Erro ao carregar inventário:", error);
            showToast('Falha ao carregar lista de produtos.', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchProdutos();
    return () => { isMounted = false; };
  }, [empresaId, showInactive, debouncedSearchTerm, selectedLocations, sortKey, sortDirection, showToast]);

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) {
        setIsLocationMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const valorTotalInventario = useMemo(() => {
    return produtos.reduce((acc, p) => acc + p.valor * p.quantidade, 0);
  }, [produtos]);

  const totalPages = Math.ceil(produtos.length / itemsPerPage);
  
  const paginatedProdutos = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return produtos.slice(startIndex, startIndex + itemsPerPage);
  }, [produtos, currentPage, itemsPerPage]);


  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedLocations, showInactive, sortKey, sortDirection]);



  const handlePrint = () => {
    window.print();
  };
  
  const handleExportXLSX = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
        const dataToExport = produtos.map(p => ({
            'Código': p.codigo,
            'Descrição': p.descricao,
            'Status': p.status.toUpperCase(),
            'Qtd': p.quantidade,
            'Localização': p.localizacao,
            'Valor Unitário': p.valor,
            'Valor Total': p.valor * p.quantidade,
            'Códigos Alternativos': p.codigos_alternativos.join(', ')
        }));

        if (dataToExport.length === 0) {
            showToast('Nenhum dado para exportar.', 'warning');
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');
        
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
  
  const SortableHeader: React.FC<{ sortableKey: SortKey; label: string; className?: string }> = ({ sortableKey, label, className }) => (
    <th className={`p-4 font-semibold cursor-pointer hover:bg-white/5 ${className}`} onClick={() => handleSort(sortableKey)}>
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {sortKey === sortableKey && (sortDirection === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />)}
      </div>
    </th>
  );


  if (isLoading && produtos.length === 0) {
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
        <div className="flex-grow w-full sm:w-auto relative" ref={locationMenuRef}>

            <label className="block text-sm font-medium mb-1" style={{color: 'var(--color-text-secondary)'}}>Localizações ({selectedLocations.length})</label>
            <button
                type="button"
                onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
                className="px-4 py-2 w-full text-left flex justify-between items-center rounded-md"
                style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
                <span className="truncate">
                    {selectedLocations.length === 0 ? 'Todas' : 
                     selectedLocations.length === 1 ? selectedLocations[0] : 
                     `${selectedLocations.length} selecionadas`}
                </span>
                <ArrowDownIcon className={`w-4 h-4 transition-transform ${isLocationMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isLocationMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-md shadow-xl max-h-60 overflow-y-auto" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <div className="p-2 border-b sticky top-0 z-10 flex justify-between items-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                         <button 
                            onClick={() => setSelectedLocations(allLocations)}
                            className="text-xs font-semibold hover:opacity-80"
                            style={{color: 'var(--color-primary)'}}
                        >
                            Selecionar Todas
                        </button>
                         <button 
                            onClick={() => setSelectedLocations([])}
                            className="text-xs font-semibold hover:opacity-80"
                            style={{color: 'var(--color-text-secondary)'}}
                        >
                            Limpar
                        </button>
                    </div>
                    {allLocations.map(location => (
                        <label key={location} className="flex items-center px-4 py-2 hover:bg-white/5 cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                checked={selectedLocations.includes(location)}
                                onChange={() => toggleLocation(location)}
                                className="mr-3 h-4 w-4 rounded-sm"
                                style={{accentColor: 'var(--color-primary)'}}
                            />
                            <span className="truncate">{location}</span>
                        </label>
                    ))}
                    {allLocations.length === 0 && (
                        <div className="p-4 text-center text-xs text-[var(--color-text-secondary)]">Nenhuma localização encontrada.</div>
                    )}
                </div>
            )}
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
        <div className="flex-grow w-full sm:w-auto">
            <label htmlFor="items-per-page" className="block text-sm font-medium mb-1" style={{color: 'var(--color-text-secondary)'}}>Itens por página</label>
            <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                }}
                className="px-4 py-2 w-full"
                style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            >
                {[50, 100, 150, 200, 250, 300].map(val => (
                    <option key={val} value={val}>{val}</option>
                ))}
            </select>
        </div>
    </div>



      <div id="printable-stock-report">
        <h1 className="text-3xl font-bold text-center mb-4 hidden print:block" style={{color: 'black'}}>Relatório de Estoque</h1>
        <p className="text-lg text-center mb-8 hidden print:block" style={{color: 'black'}}>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
        <div className="overflow-x-auto rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
        <table className="w-full min-w-[900px] text-left print:text-black">
          <thead style={{ backgroundColor: 'var(--color-background)' }}>
            <tr>
              <SortableHeader sortableKey="codigo" label="Código" />
              <SortableHeader sortableKey="descricao" label="Descrição" />
              <SortableHeader sortableKey="status" label="Status" className="text-center" />
              <SortableHeader sortableKey="quantidade" label="Qtd." className="text-center" />
              <SortableHeader sortableKey="localizacao" label="Localização" />
              <SortableHeader sortableKey="valor" label="Valor Unit." className="text-right" />
              <th className="p-4 font-semibold text-right">Valor Total</th>
              <th className="p-4 font-semibold text-center no-print">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="text-center p-8"><Spinner/></td>
              </tr>
            )}
            {!isLoading && paginatedProdutos.map((produto) => {

              return (
              <tr key={produto.id} className="border-t hover:bg-white/5" style={{ borderColor: 'var(--color-border)', opacity: produto.status === 'inativo' ? 0.5 : 1 }}>
                <td className="p-4 font-mono align-middle">
                    <span className="print:hidden">{produto.codigo}</span>
                    <div className="hidden print:flex print:flex-col print:items-center print:justify-center">
                        <QRCodeGenerator value={produto.codigo} className="w-12 h-12" />
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
             {!isLoading && produtos.length === 0 && (
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

        {!isLoading && totalPages > 1 && (
            <div className="no-print flex justify-center items-center gap-4 mt-6">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-md border flex items-center gap-2 disabled:opacity-50 transition-colors"
                    style={{backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)'}}
                >
                    Anterior
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Página</span>
                    <span className="font-bold">{currentPage}</span>
                    <span className="text-sm" style={{color: 'var(--color-text-secondary)'}}>de {totalPages}</span>
                </div>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-md border flex items-center gap-2 disabled:opacity-50 transition-colors"
                    style={{backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text)'}}
                >
                    Próxima
                </button>
            </div>
        )}
      </div>
    </div>

  );
};