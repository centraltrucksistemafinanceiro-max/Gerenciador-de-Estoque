import React from 'react';
import { useCompany } from '../hooks/useCompany';
import Spinner from './Spinner';
import { PackageIcon } from './icons/Icon';
import { Tab } from '../types';
import { useAuth } from '../hooks/useAuth';

interface CompanySelectionScreenProps {
    onNavigateToTab: (tab: Tab) => void;
}

const CompanySelectionScreen: React.FC<CompanySelectionScreenProps> = ({ onNavigateToTab }) => {
    const { companies, selectCompany, isLoadingCompanies } = useCompany();
    const { currentUser } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center font-sans p-4" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="w-full max-w-2xl p-8 space-y-8 rounded-lg" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="text-center">
                    <PackageIcon className="mx-auto w-12 h-12" style={{ color: 'var(--color-primary)' }} />
                    <h1 className="mt-4 text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Bem-vindo!</h1>
                    <p className="mt-2" style={{ color: 'var(--color-text-secondary)' }}>Selecione uma empresa para começar a gerenciar o estoque.</p>
                </div>
                
                {isLoadingCompanies ? (
                    <Spinner />
                ) : (
                    <div className="space-y-4">
                        {companies.length > 0 ? (
                            companies.map(company => (
                                <button
                                    key={company.id}
                                    onClick={() => selectCompany(company)}
                                    className="w-full text-left p-4 rounded-lg transition-all"
                                    style={{
                                        backgroundColor: 'var(--color-background)',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    <h2 className="font-semibold text-lg" style={{ color: 'var(--color-text)' }}>{company.nome}</h2>
                                </button>
                            ))
                        ) : (
                            <div className="text-center p-4 rounded-md" style={{backgroundColor: 'var(--color-background)'}}>
                                <p style={{color: 'var(--color-text-secondary)'}}>Nenhuma empresa cadastrada ainda.</p>
                            </div>
                        )}
                        
                        {currentUser?.role === 'admin' && (
                             <div className="pt-4 text-center">
                                <button
                                    onClick={() => onNavigateToTab('empresas')}
                                    className="font-medium hover:opacity-80"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    + Gerenciar Empresas
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanySelectionScreen;