import { useState, useEffect, useCallback } from 'react';
import type { LabelPreset } from '../types';

const defaultPreset: LabelPreset = {
  id: 'default-40x40-2col-v2', // Updated ID to force refresh
  name: '40x40mm (2 Colunas)',
  width: 40,
  height: 40,
  qrCodeSize: 20,
  codeFontSize: 11,
  descriptionFontSize: 9,
  footerFontSize: 8,
  labelsPerRow: 2,
};

const defaultPresets: LabelPreset[] = [defaultPreset];

export const useLabelConfig = () => {
  const [presets, setPresets] = useState<LabelPreset[]>(() => {
    try {
      const stored = localStorage.getItem('label-presets');
      return stored ? JSON.parse(stored) : defaultPresets;
    } catch (error) {
      console.error('Error reading label presets from localStorage', error);
      return defaultPresets;
    }
  });

  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('active-label-preset-id');
      // If stored ID is from an older default version or null, switch to the new default
      if (!stored || stored.startsWith('default-') && stored !== defaultPreset.id) {
          return defaultPreset.id;
      }
      return stored;
    } catch (error) {
      return defaultPreset.id;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('label-presets', JSON.stringify(presets));
      // Ensure active preset exists, otherwise reset
      if (!presets.find(p => p.id === activePresetId)) {
        const newActiveId = presets[0]?.id || defaultPreset.id;
        setActivePresetId(newActiveId);
        localStorage.setItem('active-label-preset-id', newActiveId);
      } else {
        localStorage.setItem('active-label-preset-id', activePresetId);
      }
    } catch (error) {
      console.error('Error saving label presets to localStorage', error);
    }
  }, [presets, activePresetId]);
  
  const addPreset = (preset: Omit<LabelPreset, 'id'>) => {
    const newPreset: LabelPreset = { ...preset, id: `preset-${Date.now()}` };
    setPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id); // Set new preset as active
  };

  const updatePreset = (id: string, updates: Partial<Omit<LabelPreset, 'id'>>) => {
    setPresets(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePreset = (id: string) => {
     if (presets.length <= 1) {
      // Prevent deleting the last preset
      throw new Error("Não é possível excluir a última configuração de etiqueta.");
    }
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  return { presets, activePresetId, setActivePresetId, addPreset, updatePreset, deletePreset };
};