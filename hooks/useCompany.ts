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
    const { currentUser, updateUserInSession } = useAuth();
    const [allCompanies, setAllCompanies] = useState<Empresa[]>([]);
    const [companies, setCompanies] = useState<Empresa[]>([]);
    const [currentCompany, setCurrentCompany] = useState<Empresa | null>(null);
    const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);

    const refreshCompanies = useCallback(async () => {
        setIsLoadingCompanies(true);
        try {
            const data = await pocketbaseService.getAllEmpresas();
            setAllCompanies(data);
        } catch (error) {
            console.error("Failed to fetch companies", error);
        } finally {
            setIsLoadingCompanies(false);
        }
    }, []);
    
    useEffect(() => {
        if (currentUser) {
            refreshCompanies();
        } else {
            setAllCompanies([]);
            setCompanies([]);
            setCurrentCompany(null);
            setIsLoadingCompanies(false);
        }
    }, [currentUser, refreshCompanies]);
    
    useEffect(() => {
        if (!currentUser || isLoadingCompanies) return;

        // New Rule: All users can access all companies.
        const accessibleCompanies = allCompanies;
        setCompanies(accessibleCompanies);

        try {
            const storedCompanyId = sessionStorage.getItem('currentCompanyId');
            if (storedCompanyId) {
                const company = accessibleCompanies.find(c => c.id === storedCompanyId);
                
                if (company) {
                    setCurrentCompany(company);
                } else if (accessibleCompanies.length > 0) {
                    setCurrentCompany(accessibleCompanies[0]);
                    sessionStorage.setItem('currentCompanyId', accessibleCompanies[0].id);
                } else {
                    setCurrentCompany(null);
                    sessionStorage.removeItem('currentCompanyId');
                }
            } else if (accessibleCompanies.length > 0) {
                setCurrentCompany(accessibleCompanies[0]);
                sessionStorage.setItem('currentCompanyId', accessibleCompanies[0].id);
            } else {
                setCurrentCompany(null);
            }
        } catch {
            setCurrentCompany(accessibleCompanies.length > 0 ? accessibleCompanies[0] : null);
        }
    }, [allCompanies, isLoadingCompanies, currentUser, updateUserInSession]);


    const selectCompany = useCallback((company: Empresa | null) => {
        setCurrentCompany(company);
        if (company) {
            sessionStorage.setItem('currentCompanyId', company.id);
        } else {
            sessionStorage.removeItem('currentCompanyId');
        }
    }, []);

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