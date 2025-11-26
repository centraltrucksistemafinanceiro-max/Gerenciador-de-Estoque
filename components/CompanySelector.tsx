import React, { useState, useRef, useEffect } from 'react';
import { useCompany } from '../hooks/useCompany';
import { Tab } from '../types';
import { useAuth } from '../hooks/useAuth';

interface CompanySelectorProps {
    onNavigateToTab: (tab: Tab) => void;
}

const CompanySelector: React.FC<CompanySelectorProps> = ({ onNavigateToTab }) => {
    const { companies, currentCompany, selectCompany } = useCompany();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);
    
    const handleSelect = (company: typeof companies[0]) => {
        selectCompany(company);
        setIsOpen(false);
        // Navigate to dashboard after switching company
        onNavigateToTab('dashboard');
    }

    return (
        <div ref={wrapperRef} className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-md px-2 py-1 text-sm font-medium hover:opacity-80"
                    style={{ color: 'var(--color-primary)' }}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {currentCompany?.nome || "Nenhuma Empresa"}
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-30" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {companies.map((company) => (
                            <a
                                key={company.id}
                                href="#"
                                onClick={(e) => { e.preventDefault(); handleSelect(company); }}
                                className={`block px-4 py-2 text-sm ${currentCompany?.id === company.id ? '' : ''}`}
                                style={{
                                    color: currentCompany?.id === company.id ? 'var(--color-primary)' : 'var(--color-text)',
                                    backgroundColor: currentCompany?.id === company.id ? 'rgba(var(--color-primary-rgb), 0.1)' : 'transparent',
                                }}
                                role="menuitem"
                            >
                                {company.nome}
                            </a>
                        ))}
                         {currentUser?.role === 'admin' && (
                            <>
                            <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }}></div>
                             <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onNavigateToTab('empresas');
                                    setIsOpen(false);
                                }}
                                className="block px-4 py-2 text-sm"
                                style={{color: 'var(--color-text-secondary)'}}
                                role="menuitem"
                            >
                                Gerenciar Empresas...
                            </a>
                            </>
                         )}

                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanySelector;