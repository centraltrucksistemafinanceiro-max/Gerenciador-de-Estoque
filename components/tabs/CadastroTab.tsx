import React, { useState, useEffect } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { Produto, Tab } from '../../types';
import Spinner from '../Spinner';
import { ClipboardCopyIcon, InfoIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';
import { useAuth } from '../../hooks/useAuth';

interface CadastroTabProps {
  empresaId: string;
  produtoParaEditar: Produto | null;
  codigoNovoProduto: string | null;
  onNavigateToTab: (tab: Tab, data?: any) => void;
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const initialFormData = {
  codigo: '',
  descricao: '',
  valor: 0,
  localizacao: '',
  quantidade: 0,
  codigos_alternativos: [''],
};

// --- Componente para Cadastro Individual ---
const FormularioCadastro: React.FC<CadastroTabProps> = ({ empresaId, produtoParaEditar, codigoNovoProduto, onNavigateToTab, showToast }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalCodigo, setOriginalCodigo] = useState<string | null>(null);
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});


  useEffect(() => {
    if (produtoParaEditar) {
      setFormData({
        codigo: produtoParaEditar.codigo,
        descricao: produtoParaEditar.descricao,
        valor: produtoParaEditar.valor,
        localizacao: produtoParaEditar.localizacao,
        quantidade: produtoParaEditar.quantidade,
        codigos_alternativos: [...produtoParaEditar.codigos_alternativos, ''],
      });
      setIsEditing(true);
      setOriginalCodigo(produtoParaEditar.codigo);
      setStatus(produtoParaEditar.status);
    } else if (codigoNovoProduto) {
      setFormData({ ...initialFormData, codigo: codigoNovoProduto });
      setIsEditing(false);
      setOriginalCodigo(null);
      setStatus('ativo');
    } else {
      setFormData(initialFormData);
      setIsEditing(false);
      setOriginalCodigo(null);
      setStatus('ativo');
    }
    setErrors({}); // Reset errors on navigation
  }, [produtoParaEditar, codigoNovoProduto]);

  const handleCodeValidation = async (code: string, fieldName: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
        setErrors(prev => ({...prev, [fieldName]: undefined }));
        return;
    }

    const isUnique = await pocketbaseService.checkCodeUniqueness(empresaId, trimmedCode, isEditing ? produtoParaEditar!.id : null);
    if (!isUnique) {
        setErrors(prev => ({...prev, [fieldName]: 'Este código já está em uso.'}));
    } else {
        setErrors(prev => ({...prev, [fieldName]: undefined }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleCodeValidation(e.target.value, e.target.name);
  };
  
  const handleAltCodeBlur = (index: number, value: string) => {
    handleCodeValidation(value, `alt_code_${index}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    let finalValue: string | number;
    if (type === 'number') {
        finalValue = value === '' ? '' : parseFloat(value);
        if (isNaN(finalValue as number)) finalValue = 0;
    } else {
        finalValue = value.toUpperCase();
    }

    if (name === 'codigo') {
        if(errors.codigo) setErrors(prev => ({ ...prev, codigo: undefined }));
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleAltCodeChange = (index: number, value: string) => {
    const fieldName = `alt_code_${index}`;
    if (errors[fieldName]) setErrors(prev => ({...prev, [fieldName]: undefined}));

    const newAltCodes = [...formData.codigos_alternativos];
    newAltCodes[index] = value.toUpperCase();
    
    // Add a new empty input if the last one is being filled
    if (index === newAltCodes.length - 1 && value !== '') {
        newAltCodes.push('');
    }

    setFormData(prev => ({ ...prev, codigos_alternativos: newAltCodes }));
  };

  const handleRemoveAltCode = (index: number) => {
    const newAltCodes = formData.codigos_alternativos.filter((_, i) => i !== index);
    setFormData(prev => ({...prev, codigos_alternativos: newAltCodes}));
    // Also remove any errors associated with the removed field
    setErrors(prev => {
        const nextErrors = {...prev};
        delete nextErrors[`alt_code_${index}`];
        return nextErrors;
    })
  };
  
  const getCleanedAltCodes = () => formData.codigos_alternativos.map(c => c.trim()).filter(c => c !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
        showToast('Erro: Usuário não identificado.', 'error');
        return;
    }

    const hasActiveErrors = Object.values(errors).some(Boolean);
    if (hasActiveErrors) {
        showToast('Existem códigos em uso. Por favor, corrija-os.', 'error');
        return;
    }

    if (!formData.codigo || !formData.descricao || formData.valor <= 0 || !formData.localizacao) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'warning');
      return;
    }

    setIsLoading(true);
    const cleanedAltCodes = getCleanedAltCodes();
    const productData = {
      codigo: formData.codigo,
      descricao: formData.descricao,
      valor: Number(formData.valor),
      localizacao: formData.localizacao,
      codigos_alternativos: cleanedAltCodes,
      status: status,
    };

    try {
      if (isEditing && produtoParaEditar) {
        await pocketbaseService.editarProduto(produtoParaEditar.id, productData);
        showToast('Produto atualizado com sucesso!', 'success');
        onNavigateToTab('consulta', { codigoBuscaInicial: formData.codigo });
      } else {
        const newProductPayload = {
          ...productData,
          empresa: empresaId,
          quantidade: Number(formData.quantidade),
          status: 'ativo' as 'ativo',
        };
        const novoProduto = await pocketbaseService.cadastrarProduto(newProductPayload, currentUser.id);
        showToast('Produto cadastrado com sucesso!', 'success');
        onNavigateToTab('consulta', { codigoBuscaInicial: novoProduto.codigo });
      }
      clearForm();
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar produto.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleStatus = async () => {
      if (!isEditing || !produtoParaEditar) return;
      const newStatus = status === 'ativo' ? 'inativo' : 'ativo';
      const actionText = newStatus === 'inativo' ? 'inativar' : 'ativar';
      
      if(window.confirm(`Tem certeza que deseja ${actionText} este produto?`)){
          setIsLoading(true);
          try {
              await pocketbaseService.editarProduto(produtoParaEditar.id, { status: newStatus });
              setStatus(newStatus);
              showToast(`Produto ${actionText} com sucesso!`, 'success');
          } catch (error: any) {
              showToast(error.message || `Erro ao ${actionText} o produto.`, 'error');
          } finally {
              setIsLoading(false);
          }
      }
  };

  const clearForm = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setOriginalCodigo(null);
    onNavigateToTab('cadastro', { produtoParaEditar: null, codigoNovoProduto: null });
  };

  const hasActiveErrors = Object.values(errors).some(Boolean);

  return (
    <form onSubmit={handleSubmit} className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
      <div>
        <label htmlFor="codigo" className="block mb-1 font-semibold">Código Principal (Obrigatório)</label>
        <input id="codigo" name="codigo" type="text" value={formData.codigo} onChange={handleChange} onBlur={handleBlur} className="w-full px-4 py-2 rounded-md" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
        {errors.codigo && <p className="text-red-400 text-sm mt-1">{errors.codigo}</p>}
      </div>
      <div>
        <label htmlFor="descricao" className="block mb-1 font-semibold">Descrição</label>
        <input id="descricao" name="descricao" type="text" value={formData.descricao} onChange={handleChange} className="w-full px-4 py-2 rounded-md" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="valor" className="block mb-1 font-semibold">Valor Unitário (R$)</label>
            <input id="valor" name="valor" type="number" step="0.01" min="0" value={formData.valor} onChange={handleChange} className="w-full px-4 py-2 rounded-md" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
          </div>
           <div>
            <label htmlFor="quantidade" className="block mb-1 font-semibold">Quantidade Inicial</label>
            <input 
                id="quantidade" 
                name="quantidade" 
                type="number" 
                min="0" 
                value={formData.quantidade} 
                onChange={handleChange} 
                disabled={isEditing}
                className="w-full px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed" 
                style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} 
            />
            {isEditing && (
                <div className="flex items-center gap-1 text-xs mt-1" style={{color: 'var(--color-text-secondary)'}}>
                    <InfoIcon className="w-4 h-4"/>
                    <span>Para alterar o estoque, use a aba "Movimentação".</span>
                </div>
            )}
          </div>
      </div>
       <div>
        <label htmlFor="localizacao" className="block mb-1 font-semibold">Localização</label>
        <input id="localizacao" name="localizacao" type="text" placeholder="Ex: 01.05 A" value={formData.localizacao} onChange={handleChange} className="w-full px-4 py-2 rounded-md" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
      </div>
      
      <div className="border-t pt-4" style={{borderColor: 'var(--color-border)'}}>
          <label className="block mb-2 font-semibold">Códigos Alternativos (Opcional)</label>
          <div className="space-y-2">
              {formData.codigos_alternativos.map((code, index) => (
                  <div key={index} className="flex items-start gap-2">
                      <div className="flex-grow">
                          <input 
                              type="text" 
                              placeholder="Código do fornecedor"
                              value={code}
                              onChange={(e) => handleAltCodeChange(index, e.target.value)}
                              onBlur={(e) => handleAltCodeBlur(index, e.target.value)}
                              className="w-full px-4 py-2 rounded-md" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                          />
                           {errors[`alt_code_${index}`] && <p className="text-red-400 text-sm mt-1">{errors[`alt_code_${index}`]}</p>}
                      </div>
                      { index < formData.codigos_alternativos.length - 1 && (
                          <button type="button" onClick={() => handleRemoveAltCode(index)} className="p-2 text-red-400 hover:text-red-300 mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                              </svg>
                          </button>
                      )}
                  </div>
              ))}
          </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
          <div>
               {isEditing && (
                  <button 
                      type="button" 
                      onClick={handleToggleStatus} 
                      disabled={isLoading}
                      className={`px-4 py-2 rounded-md font-semibold transition-all text-white disabled:opacity-50 ${status === 'ativo' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isLoading ? <Spinner/> : (status === 'ativo' ? 'Inativar Produto' : 'Ativar Produto')}
                  </button>
               )}
          </div>
          <div className="flex gap-4">
              <button type="button" onClick={clearForm} className="px-6 py-2 rounded-md font-semibold transition-all" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text)'}}>Cancelar</button>
              <button type="submit" disabled={isLoading || hasActiveErrors} className="px-6 py-2 rounded-md font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)'}}>
                  {isLoading ? <Spinner/> : (isEditing ? 'Salvar Alterações' : 'Cadastrar Produto')}
              </button>
          </div>
      </div>
    </form>
  )
}

type ParsedProduct = {codigo: string; descricao: string; valor: number; quantidade: number; localizacao: string;};
type ValidationStatus = 'novo' | 'ignorado' | 'erro';
interface ValidatedProduct {
    data: ParsedProduct;
    status: ValidationStatus;
    errorMessage?: string;
}

const CadastroEmLote: React.FC<{ empresaId: string, showToast: (message: string, type: 'success' | 'error' | 'warning') => void; onComplete: () => void; }> = ({ empresaId, showToast, onComplete }) => {
    const { currentUser } = useAuth();
    const [textData, setTextData] = useState('');
    const [validatedProducts, setValidatedProducts] = useState<ValidatedProduct[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [step, setStep] = useState<'input' | 'preview'>('input');

    const handleProcess = async () => {
        if (!textData.trim()) {
            showToast('Cole os dados dos produtos na área de texto.', 'warning');
            return;
        }
        setIsProcessing(true);
        const lines = textData.trim().split('\n');
        const productsToValidate: ParsedProduct[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;
            const parts = line.split('\t');
            const [codigo = '', descricao = '', quantidadeStr = '0', valorStr = '0', localizacao = ''] = parts;

            const parsedQuantidade = parseInt(quantidadeStr.trim(), 10) || 0;
            const parsedValor = parseFloat(valorStr.replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;

            productsToValidate.push({
                codigo: codigo.trim().toUpperCase(),
                descricao: descricao.trim(),
                quantidade: Math.max(0, parsedQuantidade),
                valor: Math.max(0, parsedValor),
                localizacao: localizacao.trim().toUpperCase(),
            });
        }
        
        try {
            const validationResults = await pocketbaseService.validarProdutosEmLote(empresaId, productsToValidate);
            setValidatedProducts(validationResults);
            setStep('preview');
        } catch (error) {
            showToast('Erro ao validar produtos.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleImport = async () => {
        if (!currentUser) {
            showToast('Erro: Usuário não identificado.', 'error');
            return;
        }
        const productsToCreate = validatedProducts.filter(p => p.status === 'novo').map(p => p.data);
        if (productsToCreate.length === 0) {
            showToast('Nenhum produto novo para importar.', 'warning');
            return;
        }

        setIsImporting(true);
        try {
            const result = await pocketbaseService.cadastrarProdutosEmLote(empresaId, productsToCreate, currentUser.id);
            showToast(`Importação concluída! ${result.criados} produtos cadastrados. ${result.ignorados} ignorados.`, 'success');
            onComplete();
        } catch (error: any) {
            showToast(error.message || 'Erro ao importar produtos.', 'error');
        } finally {
            setIsImporting(false);
        }
    }

    const getStatusChip = (status: ValidationStatus) => {
        switch (status) {
            case 'novo': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">NOVO</span>;
            case 'ignorado': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-400">IGNORADO</span>;
            case 'erro': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">ERRO</span>;
        }
    };
    
    const productsToImportCount = validatedProducts.filter(p => p.status === 'novo').length;

    if (step === 'input') {
        return (
            <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <h3 className="text-lg font-semibold">Importar Produtos em Lote</h3>
                <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                    Cole os dados da sua planilha aqui. Use o formato: CÓDIGO (tab) DESCRIÇÃO (tab) QUANTIDADE (tab) VALOR (tab) LOCALIZAÇÃO.
                    Cada produto deve estar em uma nova linha. Produtos novos serão cadastrados como 'ativos' por padrão.
                </p>
                 <textarea
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    rows={10}
                    placeholder={`NTB001	NOTEBOOK GAMER	10	7500,50	A1
MON002	MONITOR 34	25	2800,00	B2`}
                    className="w-full p-2 rounded-md font-mono text-sm"
                    style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                 />
                 <div className="flex justify-end">
                    <button onClick={handleProcess} disabled={isProcessing} className="px-6 py-2 rounded-md font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)'}}>
                        {isProcessing ? <Spinner/> : 'Processar e Validar'}
                    </button>
                 </div>
            </div>
        );
    }
    
    if (step === 'preview') {
         return (
            <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                 <h3 className="text-lg font-semibold">Pré-visualização da Importação</h3>
                 <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                    Revisão dos dados processados. Apenas os produtos com status "NOVO" serão importados.
                 </p>
                 <div className="overflow-auto max-h-96 rounded-md border" style={{borderColor: 'var(--color-border)'}}>
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0" style={{ backgroundColor: 'var(--color-background)' }}>
                            <tr>
                                <th className="p-2">Validação</th>
                                <th className="p-2">Código</th>
                                <th className="p-2">Descrição</th>
                                <th className="p-2">Qtd</th>
                                <th className="p-2">Valor</th>
                                <th className="p-2">Local</th>
                                <th className="p-2">Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            {validatedProducts.map((p, i) => (
                                <tr key={i} className="border-t" style={{ borderColor: 'var(--color-border)', opacity: p.status === 'ignorado' ? 0.5 : 1 }}>
                                    <td className="p-2">{getStatusChip(p.status)}</td>
                                    <td className="p-2 font-mono">{p.data.codigo}</td>
                                    <td className="p-2">{p.data.descricao}</td>
                                    <td className="p-2">{p.data.quantidade}</td>
                                    <td className="p-2">{p.data.valor.toFixed(2)}</td>
                                    <td className="p-2 font-mono">{p.data.localizacao}</td>
                                    <td className="p-2 text-red-400">{p.errorMessage}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                 <div className="flex justify-between items-center pt-4">
                     <button onClick={() => setStep('input')} className="px-6 py-2 rounded-md font-semibold transition-all" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text)'}}>Voltar</button>
                     <button onClick={handleImport} disabled={isImporting || productsToImportCount === 0} className="px-6 py-2 rounded-md font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: 'var(--color-primary)'}}>
                        {isImporting ? <Spinner/> : `Importar ${productsToImportCount} Novos Produtos`}
                     </button>
                 </div>
            </div>
        );
    }
    
    return null;
}

export const CadastroTab: React.FC<CadastroTabProps> = (props) => {
    const [view, setView] = useState<'form' | 'batch'>('form');

    const handleBatchComplete = () => {
        setView('form');
    }

    const isEditingOrPreFilled = !!props.produtoParaEditar || !!props.codigoNovoProduto;

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                        {view === 'form' ? (isEditingOrPreFilled ? 'Editar Produto' : 'Cadastro de Produto') : 'Cadastro de Produtos em Lote'}
                    </h2>
                    <HelpIcon text="Cadastre novos produtos individualmente ou importe vários de uma vez colando dados de uma planilha." />
                </div>
                {view === 'form' && !isEditingOrPreFilled && (
                     <button onClick={() => setView('batch')} className="flex items-center gap-2 px-4 py-2 text-sm rounded-md font-semibold transition-all" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)'}}>
                        <ClipboardCopyIcon/>
                        Cadastro em Lote
                    </button>
                )}
                 {view === 'batch' && (
                     <button onClick={() => setView('form')} className="flex items-center gap-2 px-4 py-2 text-sm rounded-md font-semibold transition-all" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)'}}>
                        Cadastro Individual
                    </button>
                )}
            </div>
            
            {view === 'form' ? (
                <FormularioCadastro {...props} />
            ) : (
                <CadastroEmLote empresaId={props.empresaId} showToast={props.showToast} onComplete={handleBatchComplete} />
            )}
        </div>
    );
};
