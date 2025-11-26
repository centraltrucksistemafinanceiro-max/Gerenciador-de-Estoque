import React, { useState, useRef } from 'react';
import { pocketbaseService } from '../../services/pocketbaseService';
import type { BackupData } from '../../types';
import Spinner from '../Spinner';
import { DownloadIcon, UploadIcon } from '../icons/Icon';
import HelpIcon from '../HelpIcon';

interface BackupTabProps {
  showToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export const BackupTab: React.FC<BackupTabProps> = ({ showToast }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await pocketbaseService.exportBackup();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup-estoque-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exportado com sucesso!', 'success');
    } catch (error) {
      showToast('Falha ao exportar o backup.', 'error');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Falha ao ler o arquivo.');
        }
        const data: BackupData = JSON.parse(text);

        // Simple validation
        if (!data.produtos || !data.movimentacoes || !Array.isArray(data.produtos) || !Array.isArray(data.movimentacoes)) {
          throw new Error('Arquivo de backup inválido ou corrompido.');
        }
        
        const confirmed = window.confirm(
            'ATENÇÃO: Importar este backup substituirá TODOS os dados atuais no servidor. Esta ação não pode ser desfeita. Deseja continuar?'
        );

        if (confirmed) {
            setIsImporting(true);
            await pocketbaseService.importBackup(data);
            showToast('Backup importado com sucesso! A aplicação será recarregada para exibir os novos dados.', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2500); // Give user time to read the toast
        } else {
            // User cancelled, reset the file input
            if(fileInputRef.current) fileInputRef.current.value = '';
        }

      } catch (error: any) {
        showToast(error.message || 'Erro ao processar o arquivo de backup.', 'error');
        console.error('Import error:', error);
        setIsImporting(false);
        // Reset file input on error
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Backup e Restauração</h2>
        <HelpIcon text="Exporte todos os dados do sistema para um arquivo seguro ou importe um backup para restaurar os dados." />
      </div>
      
      <div className="space-y-8">
        {/* Export Card */}
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 rounded-full" style={{backgroundColor: 'var(--color-background)'}}>
                <DownloadIcon className="w-6 h-6" style={{color: 'var(--color-primary)'}} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Exportar Dados</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Crie um arquivo de backup com todos os dados do servidor. Guarde-o em um local seguro.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="btn-primary flex items-center justify-center gap-2"
              >
              {isExporting ? <Spinner /> : 'Exportar Backup'}
            </button>
          </div>
        </div>

        {/* Import Card */}
        <div className="p-6 rounded-lg border-2 shadow-md" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-primary)' }}>
           <div className="flex items-center gap-4">
            <div className="flex-shrink-0 p-3 rounded-full" style={{backgroundColor: 'var(--color-background)'}}>
                <UploadIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-400">Importar Dados</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Restaure o sistema a partir de um arquivo de backup. <strong className="text-yellow-400">Atenção: esta ação substituirá todos os dados atuais no servidor.</strong></p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            <button 
                onClick={triggerFileInput} 
                disabled={isImporting}
                className="flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all border-2 border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black disabled:opacity-50"
            >
              {isImporting ? <Spinner /> : 'Selecionar Arquivo e Importar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
