import React, { useState } from 'react';
import type { Tema, LabelPreset } from '../../types';
import { useLabelConfig } from '../../hooks/useLabelConfig';
import Spinner from '../Spinner';
import HelpIcon from '../HelpIcon';
import QRCodeGenerator from '../QRCodeGenerator';

interface PersonalizarTabProps {
  theme: Tema;
  setTheme: React.Dispatch<React.SetStateAction<Tema>>;
  resetTheme: () => void;
}

const ColorInput: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
        <label>{label}</label>
        <div className="flex items-center gap-2 p-1 rounded-md" style={{border: '1px solid var(--color-border)'}}>
            <div className="w-8 h-8 rounded cursor-pointer relative" style={{backgroundColor: value}}>
                <input 
                    type="color" 
                    value={value} 
                    onChange={onChange} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
            <span className="font-mono text-sm pr-2">{value}</span>
        </div>
    </div>
);


const LabelPresetForm: React.FC<{
    preset: Partial<LabelPreset> | null,
    onSave: (preset: Omit<LabelPreset, 'id'>) => void,
    onCancel: () => void
}> = ({ preset, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: preset?.name || '',
        width: preset?.width || 40,
        height: preset?.height || 40,
        horizontalGap: preset?.horizontalGap || 0,
        verticalGap: preset?.verticalGap || 0,
        qrCodeSize: preset?.qrCodeSize || 22,
        codeFontSize: preset?.codeFontSize || 12,
        descriptionFontSize: preset?.descriptionFontSize || 9,
        footerFontSize: preset?.footerFontSize || 9,
        labelsPerRow: preset?.labelsPerRow || 1,
    });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({...prev, [name]: type === 'number' ? Math.max(0, Number(value)) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };
    
    const dummyProduct = {
        codigo: 'ABC-123',
        descricao: 'Produto de Exemplo para Visualização',
        localizacao: '01.01 A',
    };
    
    return (
        <div className="mt-4 p-4 rounded-md border" style={{backgroundColor: 'var(--color-background)', borderColor: 'var(--color-border)'}}>
            <h4 className="font-semibold mb-4">{preset?.id ? 'Editar Configuração' : 'Nova Configuração'}</h4>
            <div className="flex flex-col md:flex-row gap-6">
                 <form onSubmit={handleSubmit} className="flex-1 space-y-3">
                    <div>
                        <label htmlFor="name" className="text-sm">Nome</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div><label className="text-sm">Largura (mm)</label><input type="number" name="width" value={formData.width} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">Altura (mm)</label><input type="number" name="height" value={formData.height} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">Gap Horiz. (mm)</label><input type="number" name="horizontalGap" value={formData.horizontalGap} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">Gap Vert. (mm)</label><input type="number" name="verticalGap" value={formData.verticalGap} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">QR Code (mm)</label><input type="number" name="qrCodeSize" value={formData.qrCodeSize} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">Fonte Cód. (pt)</label><input type="number" name="codeFontSize" value={formData.codeFontSize} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">Fonte Desc. (pt)</label><input type="number" name="descriptionFontSize" value={formData.descriptionFontSize} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                        <div><label className="text-sm">Fonte Rodapé (pt)</label><input type="number" name="footerFontSize" value={formData.footerFontSize} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/></div>
                    </div>
                    <div>
                        <label className="text-sm">Etiquetas por Linha</label>
                        <input type="number" name="labelsPerRow" min="1" value={formData.labelsPerRow} onChange={handleChange} required className="w-full p-2 mt-1 rounded text-sm" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}/>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onCancel} className="px-4 py-1 rounded-md text-sm" style={{backgroundColor: 'var(--color-border)'}}>Cancelar</button>
                        <button type="submit" className="px-4 py-1 rounded-md text-sm text-white" style={{backgroundColor: 'var(--color-primary)'}}>Salvar</button>
                    </div>
                 </form>

                 <div className="md:w-1/3 flex flex-col items-center pt-4 md:pt-0">
                    <h5 className="font-semibold mb-2" style={{color: 'var(--color-text-secondary)'}}>Pré-visualização</h5>
                    <div className="flex items-center justify-center p-2 rounded" style={{backgroundColor: 'var(--color-border)'}}>
                        <div key="preview-label" className="text-black bg-white flex flex-col text-center font-mono p-1 box-border overflow-hidden"
                            style={{
                                width: `${formData.width}mm`,
                                height: `${formData.height}mm`,
                                fontFamily: "'Courier New', Courier, monospace",
                                fontWeight: 'bold',
                                transition: 'all 0.2s ease-in-out'
                            }}>
                            
                            <div className="flex flex-col items-center">
                                <QRCodeGenerator value={dummyProduct.codigo} style={{ width: `${formData.qrCodeSize}mm`, height: `${formData.qrCodeSize}mm` }}/>
                                <p className="leading-tight mt-1" style={{ fontSize: `${formData.codeFontSize}pt` }}>{dummyProduct.codigo}</p>
                            </div>

                            <div className="flex-grow w-full flex items-center justify-center">
                                <p className="leading-tight" style={{ 
                                    fontSize: `${formData.descriptionFontSize}pt`,
                                    overflow: 'hidden', 
                                    display: '-webkit-box', 
                                    WebkitBoxOrient: 'vertical', 
                                    WebkitLineClamp: 2, 
                                    wordBreak: 'break-word' 
                                }}>
                                    {dummyProduct.descricao}
                                </p>
                            </div>

                            <div className="flex justify-between w-full" style={{ fontSize: `${formData.footerFontSize}pt` }}>
                                <span>loc: {dummyProduct.localizacao}</span>
                                <span>Qtd: 1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};


const LabelConfigManager: React.FC = () => {
    const { presets, activePresetId, setActivePresetId, addPreset, updatePreset, deletePreset } = useLabelConfig();
    const [editingPreset, setEditingPreset] = useState<Partial<LabelPreset> | null>(null);

    const handleSave = (presetData: Omit<LabelPreset, 'id'>) => {
        if (editingPreset && 'id' in editingPreset && editingPreset.id) {
            updatePreset(editingPreset.id, presetData);
        } else {
            addPreset(presetData);
        }
        setEditingPreset(null);
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir esta configuração?")) {
            try {
                deletePreset(id);
            } catch (e: any) {
                alert(e.message);
            }
        }
    }

    return (
        <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
            <h3 className="text-lg font-semibold">Configuração de Etiquetas</h3>
            <div className="space-y-2">
                {presets.map(p => (
                    <div key={p.id} className="p-2 rounded flex items-center justify-between text-sm" style={{backgroundColor: p.id === activePresetId ? 'rgba(var(--color-primary-rgb), 0.1)' : 'var(--color-background)'}}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="active-preset"
                                checked={p.id === activePresetId}
                                onChange={() => setActivePresetId(p.id)}
                                title="Marcar como padrão"
                                className="cursor-pointer"
                                style={{accentColor: 'var(--color-primary)'}}
                            />
                            <div>
                               <p className="font-semibold">{p.name}</p>
                               <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>{p.width}x{p.height}mm ({p.labelsPerRow} col) - Gap: {p.horizontalGap}x{p.verticalGap}mm</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingPreset(p)} className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Editar</button>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400">Excluir</button>
                        </div>
                    </div>
                ))}
            </div>
            
            {editingPreset ? (
                <LabelPresetForm preset={editingPreset} onSave={handleSave} onCancel={() => setEditingPreset(null)} />
            ) : (
                <div className="pt-2">
                    <button onClick={() => setEditingPreset({})} className="w-full text-center py-2 rounded-md text-sm" style={{backgroundColor: 'var(--color-border)'}}>+ Adicionar Nova Configuração</button>
                </div>
            )}
        </div>
    )
}

export const PersonalizarTab: React.FC<PersonalizarTabProps> = ({ theme, setTheme, resetTheme }) => {

  const handleColorChange = (key: keyof Tema) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheme(prev => ({ ...prev, [key]: e.target.value }));
  };
  
   function hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    }
    
    React.useEffect(() => {
        const primaryRgb = hexToRgb(theme.primary);
        if (primaryRgb) {
            document.documentElement.style.setProperty('--color-primary-rgb', primaryRgb);
        }
    }, [theme.primary]);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Personalizar Tema</h2>
            <HelpIcon text="Altere as cores do sistema para deixar com a cara da sua empresa." />
        </div>
        <div className="p-6 rounded-lg space-y-4" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
          
          <ColorInput label="Cor Principal (Destaque)" value={theme.primary} onChange={handleColorChange('primary')} />
          <ColorInput label="Cor de Fundo" value={theme.background} onChange={handleColorChange('background')} />
          <ColorInput label="Cor dos Cards" value={theme.card} onChange={handleColorChange('card')} />
          <ColorInput label="Cor do Texto Principal" value={theme.text} onChange={handleColorChange('text')} />
          <ColorInput label="Cor do Texto Secundário" value={theme.textSecondary} onChange={handleColorChange('textSecondary')} />
          <ColorInput label="Cor da Borda" value={theme.border} onChange={handleColorChange('border')} />

          <div className="pt-4">
              <button
                  onClick={resetTheme}
                  className="w-full px-6 py-2 rounded-md font-semibold transition-all"
                  style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                  Restaurar Padrão
              </button>
          </div>
        </div>
      </div>
      
      <div>
         <div className="flex items-center gap-2 mb-6">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Etiquetas</h2>
            <HelpIcon text="Crie e gerencie diferentes formatos e tamanhos para a impressão de etiquetas." />
         </div>
         <LabelConfigManager />
      </div>
    </div>
  );
};