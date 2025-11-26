import React, { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import { useAuth } from '../../hooks/useAuth';
import type { User, UserRole, Empresa } from '../../types';
import Spinner from '../Spinner';
import { PlusIcon, UserIcon, KeyIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

type SafeUser = Omit<User, 'password_hash'>;

const PermissionModal: React.FC<{
    user: SafeUser;
    allCompanies: Empresa[];
    onClose: () => void;
    onSave: (userId: string, companyIds: string[]) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ user, allCompanies, onClose, onSave, showToast }) => {
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set(user.empresas));
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (companyId: string) => {
        setSelectedCompanyIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(companyId)) {
                newSet.delete(companyId);
            } else {
                newSet.add(companyId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(user.id, Array.from(selectedCompanyIds));
            showToast('Permissões salvas com sucesso!', 'success');
            onClose();
        } catch (e) {
            showToast('Erro ao salvar permissões.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-[var(--color-card)] rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b" style={{borderColor: 'var(--color-border)'}}>
                    <h3 className="text-lg font-semibold">Gerenciar Acesso - {user.username}</h3>
                    <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Selecione as empresas que este usuário pode acessar.</p>
                </div>
                <div className="p-4 space-y-2 overflow-y-auto">
                    {allCompanies.map(company => (
                        <label key={company.id} className="flex items-center p-3 rounded-md cursor-pointer hover:bg-white/5" style={{backgroundColor: 'var(--color-background)'}}>
                            <input
                                type="checkbox"
                                checked={selectedCompanyIds.has(company.id)}
                                onChange={() => handleToggle(company.id)}
                                className="h-5 w-5 rounded"
                                style={{accentColor: 'var(--color-primary)'}}
                            />
                            <span className="ml-3 font-medium">{company.nome}</span>
                        </label>
                    ))}
                </div>
                <div className="p-4 border-t flex justify-end gap-2" style={{borderColor: 'var(--color-border)'}}>
                    <button onClick={onClose} className="px-4 py-2 rounded-md" style={{backgroundColor: 'var(--color-border)'}}>Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="btn-primary px-4 py-2 rounded-md">
                        {isSaving ? <Spinner /> : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const UserManagementTab: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'warning') => void; }> = ({ showToast }) => {
    const { currentUser, adminResetPassword } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [allCompanies, setAllCompanies] = useState<Empresa[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showForm, setShowForm] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('user');

    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const [usersData, companiesData] = await Promise.all([
                pocketbaseService.getAllUsers(),
                pocketbaseService.getAllEmpresas()
            ]);
            setUsers(usersData);
            setAllCompanies(companiesData);
        } catch (error) {
            showToast('Erro ao carregar dados.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            showToast('A senha deve ter pelo menos 8 caracteres.', 'warning');
            return;
        }
        setIsSubmitting(true);
        try {
            await pocketbaseService.createUser({username, password, role, passwordConfirm: password });
            showToast('Usuário criado com sucesso!', 'success');
            setShowForm(false);
            setUsername('');
            setPassword('');
            setRole('user');
            fetchUsers();
        } catch (error: any) {
            showToast(error.message || 'Erro ao criar usuário.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (user: User) => {
        const newPassword = prompt(`Digite a nova senha para o usuário "${user.username}":`);
        if (!newPassword) return;
        if (newPassword.length < 8) {
            showToast('A nova senha deve ter pelo menos 8 caracteres.', 'warning');
            return;
        }

        try {
            await adminResetPassword(user.id, newPassword);
            showToast(`Senha para "${user.username}" redefinida com sucesso.`, 'success');
        } catch (error: any) {
            showToast(error.message || 'Erro ao redefinir a senha.', 'error');
        }
    };
    
    const handleSavePermissions = async (userId: string, companyIds: string[]) => {
        if (!currentUser) return;
        await pocketbaseService.updateUserCompanyPermissions(userId, companyIds);
        fetchUsers(); // Refresh user list to show updated data
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            {editingUser && (
                <PermissionModal 
                    user={editingUser}
                    allCompanies={allCompanies}
                    onClose={() => setEditingUser(null)}
                    onSave={handleSavePermissions}
                    showToast={showToast}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Gerenciamento de Usuários</h2>
                    <HelpIcon text="Crie novos usuários e gerencie suas senhas e permissões de acesso às empresas." />
                </div>
                <button onClick={() => setShowForm(prev => !prev)} className="btn-primary flex items-center justify-center gap-2">
                    <PlusIcon/> {showForm ? 'Cancelar' : 'Novo Usuário'}
                </button>
            </div>
            
            {showForm && (
                <form onSubmit={handleCreateUser} className="p-6 rounded-lg mb-6 space-y-4 animate-fade-in shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label htmlFor="newUsername">Nome de Usuário</label>
                           <input id="newUsername" type="text" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                        </div>
                        <div>
                           <label htmlFor="newPassword">Senha</label>
                           <input id="newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                        </div>
                         <div>
                           <label htmlFor="newRole">Função</label>
                           <select id="newRole" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>
                               <option value="user">Usuário</option>
                               <option value="admin">Administrador</option>
                           </select>
                        </div>
                     </div>
                     <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                            {isSubmitting ? <Spinner /> : 'Criar Usuário'}
                        </button>
                     </div>
                </form>
            )}

            <div className="overflow-x-auto rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <table className="w-full text-left">
                    <thead style={{ backgroundColor: 'var(--color-background)' }}>
                        <tr>
                            <th className="p-4 font-semibold">Usuário</th>
                            <th className="p-4 font-semibold">Função</th>
                            <th className="p-4 font-semibold text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                <td className="p-4 flex items-center gap-3"><UserIcon className="w-5 h-5" /> {user.username}</td>
                                <td className="p-4 capitalize">{user.role}</td>
                                <td className="p-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => handleResetPassword(user)} className="px-3 py-1 rounded-md text-sm font-semibold" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)'}}>
                                            Redefinir Senha
                                        </button>
                                        {user.role === 'user' && (
                                            <button onClick={() => setEditingUser(user)} className="px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)'}}>
                                                <KeyIcon className="w-4 h-4" /> Permissões
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
