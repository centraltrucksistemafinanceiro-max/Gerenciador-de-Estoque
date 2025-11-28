import React, { useState, useEffect, useMemo } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, Movimentacao, Tab } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Spinner from '../Spinner';
import { 
    DollarSignIcon, 
    PackageIcon, 
    AlertTriangleIcon, 
    TrendingUpIcon, 
    ClockIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '../icons/Icon';
import HelpIcon from '../HelpIcon';

interface DashboardTabProps {
  empresaId: string;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  onNavigateToTab: (tab: Tab, data?: any) => void;
}

const ESTOQUE_BAIXO_THRESHOLD = 5;

const DashboardCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  colorClass: string;
}> = ({ icon, title, value, colorClass }) => (
  <div className="p-4 rounded-xl flex items-center gap-4 shadow-md transition-all hover:shadow-lg hover:-translate-y-1" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <div className={`p-3 rounded-full ${colorClass}`}>
        {icon}
    </div>
    <div>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

export const DashboardTab: React.FC<DashboardTabProps> = ({ empresaId, showToast, onNavigateToTab }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [produtosData, movimentacoesData] = await Promise.all([
          pocketbaseService.getAllProdutos(empresaId, true), // Inclui inativos para análise completa
          pocketbaseService.getMovimentacoes(empresaId, {}),
        ]);
        setProdutos(produtosData);
        setMovimentacoes(movimentacoesData);
      } catch (error) {
        showToast('Erro ao carregar dados do dashboard.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [empresaId, showToast]);

  const activeProdutos = useMemo(() => produtos.filter(p => p.status === 'ativo'), [produtos]);

  const kpis = useMemo(() => {
    const valorTotal = activeProdutos.reduce((acc, p) => acc + (p.valor * p.quantidade), 0);
    const totalItens = activeProdutos.length;
    const totalPecas = activeProdutos.reduce((acc, p) => acc + (p.quantidade * (p.pecasPorPacote || 1)), 0);
    const estoqueBaixo = activeProdutos.filter(p => p.quantidade <= ESTOQUE_BAIXO_THRESHOLD).length;
    return { valorTotal, totalItens, totalPecas, estoqueBaixo };
  }, [activeProdutos]);
  
  const maisVendidos = useMemo(() => {
    const vendas = movimentacoes
      .filter(m => m.tipo === 'saida')
      .reduce((acc, m) => {
        acc[m.produto_codigo] = (acc[m.produto_codigo] || 0) + m.quantidade;
        return acc;
      }, {} as { [key: string]: number });

    return Object.entries(vendas)
      .sort((entryA, entryB) => Number(entryB[1]) - Number(entryA[1]))
      .slice(0, 5)
      .map(([codigo, quantidade]) => ({
        codigo,
        produto: produtos.find(p => p.codigo === codigo),
        quantidade
      }));
  }, [movimentacoes, produtos]);

  const estoqueParado = useMemo(() => {
    const ultimaSaida: { [key: string]: string } = {};
    movimentacoes
        .filter(m => m.tipo === 'saida')
        .forEach(m => {
            if (!ultimaSaida[m.produto_codigo] || new Date(m.created).getTime() > new Date(ultimaSaida[m.produto_codigo]).getTime()) {
                ultimaSaida[m.produto_codigo] = m.created;
            }
        });

    return activeProdutos
        .filter(p => p.quantidade > 0)
        .sort((a, b) => {
            const dateA = ultimaSaida[a.codigo] ? new Date(ultimaSaida[a.codigo]).getTime() : 0;
            const dateB = ultimaSaida[b.codigo] ? new Date(ultimaSaida[b.codigo]).getTime() : 0;
            return dateA - dateB;
        })
        .slice(0, 5)
        .map(p => ({
            produto: p,
            ultimaVenda: ultimaSaida[p.codigo]
        }));
  }, [activeProdutos, movimentacoes]);

  const curvaABC = useMemo(() => {
    if (activeProdutos.length === 0) {
        return { a: 0, b: 0, c: 0, valorA: 0, valorB: 0, valorC: 0 };
    }

    const produtosComValor = activeProdutos.map(p => ({ ...p, valorTotal: p.valor * p.quantidade }))
        .sort((a, b) => b.valorTotal - a.valorTotal);

    const valorTotalEstoque = produtosComValor.reduce((acc, p) => acc + p.valorTotal, 0);
    if (valorTotalEstoque === 0) {
        return { a: activeProdutos.length, b: 0, c: 0, valorA: 0, valorB: 0, valorC: 0 };
    }

    let acumulado = 0;
    const classes = { a: 0, b: 0, c: 0, valorA: 0, valorB: 0, valorC: 0 };

    produtosComValor.forEach(p => {
        acumulado += p.valorTotal;
        const percentualAcumulado = (acumulado / valorTotalEstoque) * 100;
        if (percentualAcumulado <= 80) {
            classes.a++;
            classes.valorA += p.valorTotal;
        } else if (percentualAcumulado <= 95) {
            classes.b++;
            classes.valorB += p.valorTotal;
        } else {
            classes.c++;
            classes.valorC += p.valorTotal;
        }
    });
    return classes;

  }, [activeProdutos]);
  
  const ultimasMovimentacoes = useMemo(() => movimentacoes.slice(0, 5), [movimentacoes]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard Analítico</h2>
        <HelpIcon text="Visualize os principais indicadores e análises do seu estoque em tempo real." />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={<DollarSignIcon />} title="Valor Total do Estoque" value={formatCurrency(kpis.valorTotal)} colorClass="bg-green-500/20 text-green-400" />
        <DashboardCard icon={<PackageIcon />} title="Itens Únicos (SKUs)" value={kpis.totalItens} colorClass="bg-blue-500/20 text-blue-400" />
        <DashboardCard icon={<PackageIcon />} title="Quantidade Total de Peças" value={kpis.totalPecas.toLocaleString('pt-BR')} colorClass="bg-sky-500/20 text-sky-400" />
        <DashboardCard icon={<AlertTriangleIcon />} title="Alertas de Estoque Baixo" value={kpis.estoqueBaixo} colorClass="bg-yellow-500/20 text-yellow-400" />
      </div>

      {/* Analysis Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* Mais Vendidos */}
        <div className="p-4 rounded-lg space-y-2 lg:col-span-1 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-lg flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-green-400" /> Produtos Mais Vendidos</h3>
          {maisVendidos.length > 0 ? maisVendidos.map(({ codigo, produto, quantidade }) => (
            <div key={codigo} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-white/5 cursor-pointer" onClick={() => produto && onNavigateToTab('consulta', { codigoBuscaInicial: produto.codigo })}>
              <div>
                <p className="font-semibold truncate max-w-[200px]">{produto?.descricao || 'Produto não encontrado'}</p>
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{produto?.codigo}</p>
              </div>
              <p className="font-bold">{quantidade} <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>unid.</span></p>
            </div>
          )) : <p className="text-sm text-center p-4" style={{ color: 'var(--color-text-secondary)' }}>Nenhuma saída registrada.</p>}
        </div>
        
        {/* Estoque Parado */}
         <div className="p-4 rounded-lg space-y-2 lg:col-span-1 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <h3 className="font-bold text-lg flex items-center gap-2"><ClockIcon className="w-5 h-5 text-yellow-400"/> Estoque Parado</h3>
          {estoqueParado.length > 0 ? estoqueParado.map(({ produto, ultimaVenda }) => (
            <div key={produto.id} className="flex justify-between items-center text-sm p-2 rounded-md hover:bg-white/5 cursor-pointer" onClick={() => onNavigateToTab('consulta', { codigoBuscaInicial: produto.codigo })}>
              <div>
                <p className="font-semibold truncate max-w-[200px]">{produto.descricao}</p>
                <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{produto.codigo}</p>
              </div>
              <p className="text-xs text-right" style={{ color: 'var(--color-text-secondary)' }}>
                {ultimaVenda ? `Últ. Venda: ${formatDate(ultimaVenda).split(' ')[0]}` : 'Nunca vendido'}
              </p>
            </div>
          )) : <p className="text-sm text-center p-4" style={{ color: 'var(--color-text-secondary)' }}>Nenhum produto em estoque.</p>}
        </div>

        {/* Curva ABC */}
        <div className="p-4 rounded-lg lg:col-span-1 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold text-lg mb-3">Análise de Curva ABC</h3>
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <p><span className="font-bold text-lg" style={{color: 'var(--color-primary)'}}>A</span> ({curvaABC.a} itens)</p>
                    <div className="text-right">
                        <p className="font-bold">{formatCurrency(curvaABC.valorA)}</p>
                        <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>{kpis.valorTotal > 0 ? ((curvaABC.valorA/kpis.valorTotal)*100).toFixed(1) : 0}% do valor</p>
                    </div>
                </div>
                 <div className="flex justify-between items-center">
                    <p><span className="font-bold text-lg" style={{color: 'var(--color-text-secondary)'}}>B</span> ({curvaABC.b} itens)</p>
                    <div className="text-right">
                        <p className="font-bold">{formatCurrency(curvaABC.valorB)}</p>
                        <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>{kpis.valorTotal > 0 ? ((curvaABC.valorB/kpis.valorTotal)*100).toFixed(1) : 0}% do valor</p>
                    </div>
                </div>
                 <div className="flex justify-between items-center">
                    <p><span className="font-bold text-lg" style={{color: 'var(--color-text-secondary)'}}>C</span> ({curvaABC.c} itens)</p>
                     <div className="text-right">
                        <p className="font-bold">{formatCurrency(curvaABC.valorC)}</p>
                        <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>{kpis.valorTotal > 0 ? ((curvaABC.valorC/kpis.valorTotal)*100).toFixed(1) : 0}% do valor</p>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Ultimas Movimentacoes */}
        <div className="p-4 rounded-lg space-y-2 lg:col-span-2 xl:col-span-3 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="font-bold text-lg">Últimas Movimentações</h3>
            {ultimasMovimentacoes.length > 0 ? ultimasMovimentacoes.map(m => (
                 <div key={m.id} className="grid grid-cols-2 sm:grid-cols-4 items-center text-sm p-2 rounded-md hover:bg-white/5 gap-2">
                    <div className="col-span-2 sm:col-span-2">
                        <p className="font-semibold truncate">{m.produto_descricao}</p>
                        <p className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{m.produto_codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {m.tipo === 'entrada' ? <ArrowUpIcon className="w-4 h-4 text-green-400"/> : <ArrowDownIcon className="w-4 h-4 text-red-400"/>}
                        <p><span className="font-bold">{m.quantidade}</span> unid.</p>
                    </div>
                     <div className="text-right">
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(m.created)}</p>
                        <p className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>por {m.expand?.usuario?.username || 'N/A'}</p>
                     </div>
                 </div>
            )) : <p className="text-sm text-center p-4" style={{ color: 'var(--color-text-secondary)' }}>Nenhuma movimentação registrada.</p>}
        </div>

      </div>
    </div>
  );
};