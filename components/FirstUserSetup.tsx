import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';
import { PackageIcon, KeyIcon } from './icons/Icon';

const FirstUserSetup: React.FC = () => {
    const [username, setUsername] = useState('ADMIN');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setupFirstAdmin } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 8) {
            setError('A senha deve ter pelo menos 8 caracteres.');
            return;
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        
        setIsLoading(true);
        try {
            await setupFirstAdmin(username, password);
            // On success, the App will transition to the next state (company selection)
        } catch (err: any) {
            setError(err.message || 'Falha ao criar o administrador.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans p-4" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="w-full max-w-md p-8 space-y-8 rounded-xl shadow-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="text-center">
                    <PackageIcon className="mx-auto w-12 h-12" style={{ color: 'var(--color-primary)' }} />
                    <h1 className="mt-4 text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Bem-vindo!</h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Vamos configurar o primeiro usuário administrador.</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Nome de Usuário</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toUpperCase())}
                            className="mt-1 block w-full px-3 py-2 border shadow-sm sm:text-sm"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Senha</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border shadow-sm sm:text-sm"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                        />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword"className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Confirmar Senha</label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border shadow-sm sm:text-sm"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-400">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center btn-primary items-center gap-2"
                        >
                            {isLoading ? <Spinner /> : <><KeyIcon /> Criar Administrador</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FirstUserSetup;
