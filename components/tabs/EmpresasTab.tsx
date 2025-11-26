import React, { useState, useEffect } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import { useCompany } from '../../hooks/useCompany';
import type { Empresa, Tab } from '../../types';
import Spinner from '../Spinner';
import { PlusIcon, PackageIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

interface EmpresasTabProps {
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  onNavigateToTab: (tab: Tab) => void;
}

export const EmpresasTab: React.FC<EmpresasTabProps> = ({ showToast, onNavigateToTab }) => {
    const { companies, refreshCompanies, selectCompany, isLoadingCompanies } = useCompany();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showForm, setShowForm] = useState(false);
    const [nome, setNome] = useState('');

    const handleCreateEmpresa = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) {
            showToast('O nome da empresa é obrigatório.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            const novaEmpresa = await pocketbaseService.createEmpresa(nome);
            showToast('Empresa criada com sucesso!', 'success');
            await refreshCompanies();
            selectCompany(novaEmpresa); // Automatically select the new company
            onNavigateToTab('dashboard');
            
            setShowForm(false);
            setNome('');
        } catch (error: any) {
            showToast(error.message || 'Erro ao criar empresa.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSelectCompany = (company: Empresa) => {
        selectCompany(company);
        onNavigateToTab('dashboard');
    }

    if (isLoadingCompanies) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Gerenciar Empresas</h2>
                    <HelpIcon text="Crie as diferentes empresas ou filiais que você precisa gerenciar." />
                </div>
                <button onClick={() => setShowForm(prev => !prev)} className="btn-primary flex items-center justify-center gap-2">
                    <PlusIcon/> {showForm ? 'Cancelar' : 'Nova Empresa'}
                </button>
            </div>
            
            {showForm && (
                <form onSubmit={handleCreateEmpresa} className="p-6 rounded-lg mb-6 space-y-4 animate-fade-in shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                     <div>
                        <label htmlFor="nome">Nome da Empresa</label>
                        <input id="nome" type="text" value={nome} onChange={e => setNome(e.target.value)} required className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                     </div>
                     <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? <Spinner /> : 'Criar Empresa'}
                        </button>
                     </div>
                </form>
            )}

             <div className="space-y-3">
                  {companies.length > 0 ? companies.map(c => (
                      <div key={c.id} onClick={() => handleSelectCompany(c)} className="p-4 rounded-lg cursor-pointer transition-all hover:brightness-125 flex items-center gap-4 shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                          <PackageIcon className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
                          <p className="font-bold text-lg">{c.nome}</p>
                      </div>
                  )) : (
                       <div className="text-center p-10 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)' }}>
                           <p style={{color: 'var(--color-text-secondary)'}}>Nenhuma empresa cadastrada.</p>
                       </div>
                  )}
              </div>

        </div>
    );
};
