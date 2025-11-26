import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../Spinner';
import { KeyIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

interface ProfileTabProps {
    showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ showToast }) => {
    const { currentUser, changePassword, logout } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showToast('As novas senhas não coincidem.', 'warning');
            return;
        }
        if (newPassword.length < 8) {
            showToast('A nova senha deve ter pelo menos 8 caracteres.', 'warning');
            return;
        }

        setIsLoading(true);
        try {
            await changePassword(currentPassword, newPassword);
            showToast('Senha alterada com sucesso! Você será desconectado.', 'success');
            setTimeout(() => {
                logout();
            }, 2000);
        } catch (error: any) {
            showToast(error.message || 'Erro ao alterar a senha.', 'error');
        } finally {
            setIsLoading(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <div className="animate-fade-in max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Meu Perfil</h2>
                <HelpIcon text="Altere sua senha de acesso ao sistema." />
            </div>
            <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <p className="text-lg">Usuário: <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{currentUser?.username}</span></p>
                <p className="text-sm mb-6 capitalize" style={{ color: 'var(--color-text-secondary)' }}>Função: {currentUser?.role}</p>

                <form onSubmit={handleSubmit} className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--color-border)' }}>
                    <h3 className="font-semibold text-lg">Alterar Senha</h3>
                    <div>
                        <label htmlFor="currentPassword">Senha Atual</label>
                        <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                    </div>
                    <div>
                        <label htmlFor="newPassword">Nova Senha</label>
                        <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1 w-full px-4 py-2" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
                    </div>
                    <div className="pt-2">
                        <button type="submit" disabled={isLoading} className="w-full btn-primary flex items-center justify-center gap-2">
                            {isLoading ? <Spinner /> : <><KeyIcon /> Alterar Senha</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
