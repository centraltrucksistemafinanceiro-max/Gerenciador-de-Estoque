import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../services/pocketbaseService';
import { useAuth } from './useAuth';
import type { Empresa } from '../types';

interface CompanyContextType {
    companies: Empresa[];
    currentCompany: Empresa | null;
    isLoadingCompanies: boolean;
    selectCompany: (company: Empresa | null) => void;
    refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser, isLoadingAuth } = useAuth();
    const [companies, setCompanies] = useState<Empresa[]>([]);
    const [currentCompany, setCurrentCompany] = useState<Empresa | null>(null);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

    const selectCompany = useCallback((company: Empresa | null) => {
        setCurrentCompany(company);
        if (company) {
            sessionStorage.setItem('currentCompanyId', company.id);
        } else {
            sessionStorage.removeItem('currentCompanyId');
        }
    }, []);

    const loadAndRestoreCompanies = useCallback(async () => {
        if (!currentUser) {
            setCompanies([]);
            selectCompany(null);
            setIsLoadingCompanies(false);
            return;
        }

        setIsLoadingCompanies(true);
        try {
            const allCompanies = await pocketbaseService.getAllEmpresas();
            setCompanies(allCompanies);

            const storedCompanyId = sessionStorage.getItem('currentCompanyId');
            
            const companyToSelect = 
                allCompanies.find(c => c.id === storedCompanyId) ||
                allCompanies[0] || 
                null; 

            selectCompany(companyToSelect);

        } catch (error) {
            console.error("Failed to fetch companies", error);
            setCompanies([]);
            selectCompany(null);
        } finally {
            setIsLoadingCompanies(false);
        }
    }, [currentUser, selectCompany]);

    useEffect(() => {
        // Only run the company loading logic AFTER the initial authentication check is complete.
        if (!isLoadingAuth) {
            loadAndRestoreCompanies();
        }
    }, [isLoadingAuth, loadAndRestoreCompanies]);

    const refreshCompanies = useCallback(async () => {
        await loadAndRestoreCompanies();
    }, [loadAndRestoreCompanies]);

    const value = useMemo(() => ({ companies, currentCompany, isLoadingCompanies, selectCompany, refreshCompanies }), [companies, currentCompany, isLoadingCompanies, selectCompany, refreshCompanies]);

    return React.createElement(CompanyContext.Provider, { value }, children);
};

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (context === undefined) {
        throw new Error('useCompany must be used within a CompanyProvider');
    }
    return context;
};