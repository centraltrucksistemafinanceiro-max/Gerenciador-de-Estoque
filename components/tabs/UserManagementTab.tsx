import React, { useState, useEffect, useCallback } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import { useAuth } from '../../hooks/useAuth';
import type { User, UserRole, Empresa } from '../../types';
import Spinner from '../Spinner';
import { PlusIcon, UserIcon, KeyIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

type SafeUser = Omit<User, 'password_hash'>;

export const UserManagementTab: React.FC<{ showToast: (message: string, type: 'success' | 'error' | 'warning') => void; }> = ({ showToast }) => {
    const { adminResetPassword } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [showForm, setShowForm] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('user');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const usersData = await pocketbaseService.getAllUsers();
            setUsers(usersData);
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

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Gerenciamento de Usuários</h2>
                    <HelpIcon text="Crie novos usuários e gerencie suas senhas." />
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
                                        <button onClick={() => handleResetPassword(user)} className="px-3 py-1 rounded-md text-sm font-semibold flex items-center gap-1" style={{backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)'}}>
                                            <KeyIcon className="w-4 h-4" /> Redefinir Senha
                                        </button>
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