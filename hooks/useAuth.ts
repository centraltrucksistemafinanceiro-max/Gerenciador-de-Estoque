import React, { createContext, useState, useContext, ReactNode, useMemo, useCallback, useEffect } from 'react';
import { pocketbaseService } from '../services/pocketbaseService';
import type { User } from '../types';

interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    isLoadingAuth: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    adminResetPassword: (targetUserId: string, newPassword: string) => Promise<void>;
    updateUserInSession: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    useEffect(() => {
        const checkInitialState = async () => {
            setIsLoadingAuth(true);
            try {
                const user = pocketbaseService.getCurrentUser();
                setCurrentUser(user);
            } catch (error) {
                console.error("Failed to check initial state:", error);
            } finally {
                setIsLoadingAuth(false);
            }
        };
        checkInitialState();
    }, []);

    const isAuthenticated = useMemo(() => !!currentUser && pocketbaseService.isAuthValid(), [currentUser]);

    const login = useCallback(async (username: string, password: string) => {
        const user = await pocketbaseService.login(username, password);
        setCurrentUser(user as User);
    }, []);

    const logout = useCallback(() => {
        pocketbaseService.logout();
        setCurrentUser(null);
    }, []);
    
    const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
        if (!currentUser) throw new Error("Nenhum usuário logado.");
        await pocketbaseService.changeUserPassword(currentUser.id, currentPassword, newPassword, newPassword);
    }, [currentUser]);
    
    const adminResetPassword = useCallback(async (targetUserId: string, newPassword: string) => {
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Ação não autorizada.');
        }
        await pocketbaseService.adminResetUserPassword(targetUserId, newPassword);
    }, [currentUser]);

    const updateUserInSession = useCallback((updates: Partial<User>) => {
        const updatedUser = pocketbaseService.updateCurrentUser(updates);
        if (updatedUser) {
          setCurrentUser(updatedUser as User);
        }
    }, []);

    const value = useMemo(() => ({ currentUser, isAuthenticated, isLoadingAuth, login, logout, changePassword, adminResetPassword, updateUserInSession }), [currentUser, isAuthenticated, isLoadingAuth, login, logout, changePassword, adminResetPassword, updateUserInSession]);

    return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};