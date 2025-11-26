import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Spinner from './Spinner';
import { PackageIcon } from './icons/Icon';

const LoginScreen: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            await login(username, password);
            // On success, the App component will re-render and show the main app
        } catch (err: any) {
            setError(err.message || 'Falha no login.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        alert('Entre em contato com o administrador para redefinir sua senha.');
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans p-4" style={{ backgroundColor: 'var(--color-background)' }}>
            <div className="w-full max-w-md p-8 space-y-8 rounded-xl shadow-2xl" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="text-center">
                    <PackageIcon className="mx-auto w-12 h-12" style={{ color: 'var(--color-primary)' }} />
                    <h1 className="mt-4 text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Gerenciador de Estoque</h1>
                    <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Faça login para continuar</p>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Usuário</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border shadow-sm sm:text-sm"
                            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', borderColor: 'var(--color-border)' }}
                        />
                    </div>

                    {error && <p className="text-sm text-center text-red-400">{error}</p>}

                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            <button type="button" onClick={handleForgotPassword} className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                                Esqueceu a senha?
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center btn-primary"
                        >
                            {isLoading ? <Spinner /> : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginScreen;