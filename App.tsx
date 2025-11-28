

import React, { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { ToastContainer } from './components/Toast';
import QRCodeScanner from './components/QRCodeScanner';
import { 
    QrCodeIcon, MoreHorizontalIcon, UserIcon, LogoutIcon, DashboardIcon, SearchIcon, 
    ArrowsRightLeftIcon, ClipboardListIcon, DotsCircleHorizontalIcon, ClipboardCheckIcon,
    PackageIcon, PlusIcon, TrendingUpIcon, EditIcon, IconProps
} from './components/icons/Icon';

import { DashboardTab } from './components/tabs/DashboardTab';
import { ConsultaTab } from './components/tabs/ConsultaTab';
import { InventarioTab } from './components/tabs/InventarioTab';
import { MovimentacaoTab } from './components/tabs/MovimentacaoTab';
import { CadastroTab } from './components/tabs/CadastroTab';
import { RelatoriosTab } from './components/tabs/RelatoriosTab';
import { EtiquetasTab } from './components/tabs/EtiquetasTab';
import { PersonalizarTab } from './components/tabs/PersonalizarTab';
import { SeparacaoTab } from './components/tabs/SeparacaoTab';
import { ContagemTab } from './components/tabs/ContagemTab';
import { UserManagementTab } from './components/tabs/UserManagementTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { EmpresasTab } from './components/tabs/EmpresasTab';
import CompanySelector from './components/CompanySelector';
import CompanySelectionScreen from './components/CompanySelectionScreen';
import Spinner from './components/Spinner';

import type { Tab, ToastMessage, UserRole } from './types';
import { useAuth } from './hooks/useAuth';
import { useCompany } from './hooks/useCompany';
import LoginScreen from './components/LoginScreen';
import { useIsMobile } from './hooks/useIsMobile';

export const App: React.FC = () => {
  const { theme, setTheme, resetTheme } = useTheme();
  const { isAuthenticated, currentUser, logout, isLoadingAuth } = useAuth();
  const { currentCompany, isLoadingCompanies } = useCompany();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [navigationData, setNavigationData] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const tabsForMeasurementRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const navTabsContainerRef = useRef<HTMLDivElement>(null); // Ref for the direct container of tabs

  const allTabs = useMemo(() => {
    const tabs: { id: Tab; label: string; roles: UserRole[]; icon: React.ReactElement<IconProps> }[] = [
      { id: 'dashboard', label: 'Dashboard', roles: ['admin', 'user'], icon: <DashboardIcon/> },
      { id: 'consulta', label: 'Consulta', roles: ['admin', 'user'], icon: <SearchIcon/> },
      { id: 'separacao', label: 'Separação', roles: ['admin', 'user'], icon: <ClipboardListIcon/> },
      { id: 'movimentacao', label: 'Movimentação', roles: ['admin', 'user'], icon: <ArrowsRightLeftIcon/> },
      { id: 'contagem', label: 'Contagem', roles: ['admin', 'user'], icon: <ClipboardCheckIcon/> },
      { id: 'estoque', label: 'Estoque', roles: ['admin', 'user'], icon: <PackageIcon/> },
      { id: 'cadastro', label: 'Cadastro', roles: ['admin', 'user'], icon: <PlusIcon/> },
      { id: 'etiquetas', label: 'Etiquetas', roles: ['admin', 'user'], icon: <QrCodeIcon/> },
      { id: 'relatorios', label: 'Relatórios', roles: ['admin', 'user'], icon: <TrendingUpIcon/> },
      { id: 'personalizar', label: 'Personalizar', roles: ['admin'], icon: <EditIcon/> },
      { id: 'empresas', label: 'Empresas', roles: ['admin'], icon: <PackageIcon/> },
      { id: 'usuarios', label: 'Usuários', roles: ['admin', 'user'], icon: <UserIcon/> },
    ];
    return tabs.filter(tab => !!currentUser?.role && tab.roles.includes(currentUser.role));
  }, [currentUser]);
  
  const mobileMainTabs = useMemo(() => allTabs.slice(0, 4), [allTabs]);
  const mobileMoreTabs = useMemo(() => allTabs.slice(4), [allTabs]);

  const [mainTabs, setMainTabs] = useState(allTabs);
  const [moreTabs, setMoreTabs] = useState<(typeof allTabs)[number][]>([]);
  
  // State for the animated indicator
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // FIX: Moved isMoreMenuActive declaration before its usage in useLayoutEffect.
  const isMoreMenuActive = moreTabs.some(tab => tab.id === activeTab) || (isMobile && mobileMoreTabs.some(tab => tab.id === activeTab));


  // Define which tabs don't require a company to be selected.
  const administrativeTabs: Tab[] = ['empresas', 'usuarios', 'perfil', 'backup', 'personalizar'];


  useLayoutEffect(() => {
    const updateTabs = () => {
        if (isMobile || !navContainerRef.current || !tabsForMeasurementRef.current) return;

        const containerWidth = navContainerRef.current.offsetWidth;
        
        if (containerWidth === 0) return;

        const moreButtonWidth = 70;
        const tabElements = Array.from(tabsForMeasurementRef.current.children) as HTMLElement[];

        let currentWidth = 0;
        const newMainTabs: (typeof allTabs) = [];
        
        for (let i = 0; i < tabElements.length; i++) {
            const tabElement = tabElements[i];
            const tabData = allTabs[i];
            const elementWidth = tabElement.offsetWidth + 8;
            
            const remainingTabs = tabElements.length - (i + 1);
            const willNeedMoreButton = remainingTabs > 0;
            
            if (currentWidth + elementWidth + (willNeedMoreButton ? moreButtonWidth : 0) <= containerWidth) {
                currentWidth += elementWidth;
                newMainTabs.push(tabData);
            } else {
                break;
            }
        }
        
        if (newMainTabs.length === allTabs.length) {
          setMainTabs(allTabs);
          setMoreTabs([]);
        } else {
          const newMoreTabs = allTabs.slice(newMainTabs.length);
          setMainTabs(newMainTabs);
          setMoreTabs(newMoreTabs);
        }
    };

    const timeoutId = setTimeout(updateTabs, 0);

    const resizeObserver = new ResizeObserver(updateTabs);
    if (navContainerRef.current) {
        resizeObserver.observe(navContainerRef.current);
    }

    return () => {
        clearTimeout(timeoutId);
        resizeObserver.disconnect();
    };
  }, [allTabs, isMobile]);

  // Effect for the animated indicator
  useLayoutEffect(() => {
    if (isMobile || !navTabsContainerRef.current) {
      setIndicatorStyle({ left: 0, width: 0, opacity: 0 });
      return;
    };
    
    const activeTabElement = navTabsContainerRef.current.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement;

    if (activeTabElement) {
        setIndicatorStyle({
            left: activeTabElement.offsetLeft,
            width: activeTabElement.offsetWidth,
            opacity: 1,
        });
    } else {
        // Handle case where active tab is in 'More' menu
        const moreButton = moreButtonRef.current;
        if(moreButton && isMoreMenuActive){
            setIndicatorStyle({
                left: moreButton.offsetLeft,
                width: moreButton.offsetWidth,
                opacity: 1,
            });
        } else {
            setIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
        }
    }
  }, [activeTab, mainTabs, moreTabs, isMobile, isMoreMenuActive]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    function hexToRgb(hex: string) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    }
    const primaryRgb = hexToRgb(theme.primary);
    if (primaryRgb) {
        document.documentElement.style.setProperty('--color-primary-rgb', primaryRgb);
    }
  }, [theme.primary]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const closeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };
  
  const handleNavigateToTab = (tab: Tab, data: any = null) => {
    setNavigationData(data);
    setActiveTab(tab);
    window.scrollTo(0, 0);
  };
  
  const handleScanSuccess = (codigo: string) => {
    setIsScannerOpen(false);
    
    // Intelligent Scanner Logic for Hybrid QR Codes
    let processedCode = codigo;
    if (codigo.includes('public-product-view.html') && codigo.includes('code=')) {
        try {
            const url = new URL(codigo);
            const codeParam = url.searchParams.get('code');
            if (codeParam) {
                processedCode = codeParam;
            }
        } catch (e) {
            console.error("Error parsing QR URL, using original code", e);
        }
    }

    showToast(`Código "${processedCode}" lido com sucesso!`, 'success');
    if (activeTab === 'separacao' || activeTab === 'contagem') {
       setNavigationData({ scannedCode: processedCode, timestamp: Date.now() });
    } else if (activeTab === 'etiquetas') {
      handleNavigateToTab('etiquetas', { codigoBuscaInicial: processedCode });
    } else {
      handleNavigateToTab('movimentacao', { codigoBuscaInicial: processedCode });
    }
  };

  const renderTabContent = () => {
    const requiresCompany = !administrativeTabs.includes(activeTab);

    if (requiresCompany && !currentCompany) {
      return <div className="text-center p-8">Por favor, selecione uma empresa para continuar.</div>;
    }
    
    switch (activeTab) {
      case 'personalizar':
        return <PersonalizarTab theme={theme} setTheme={setTheme} resetTheme={resetTheme} />;
      case 'empresas':
        return <EmpresasTab showToast={showToast} onNavigateToTab={handleNavigateToTab} />;
      case 'usuarios':
        return <UserManagementTab showToast={showToast} />;
      case 'perfil':
        return <ProfileTab showToast={showToast} />;
      case 'dashboard':
        return <DashboardTab showToast={showToast} onNavigateToTab={handleNavigateToTab} empresaId={currentCompany!.id} />;
      case 'consulta':
        return <ConsultaTab showToast={showToast} onNavigateToTab={handleNavigateToTab} codigoBuscaInicial={navigationData?.codigoBuscaInicial || null} empresaId={currentCompany!.id} />;
      case 'estoque':
        return <InventarioTab showToast={showToast} onNavigateToTab={handleNavigateToTab} empresaId={currentCompany!.id} />;
      case 'movimentacao':
        return <MovimentacaoTab showToast={showToast} codigoBuscaInicial={navigationData?.codigoBuscaInicial || null} empresaId={currentCompany!.id} />;
      case 'cadastro':
        return <CadastroTab showToast={showToast} onNavigateToTab={handleNavigateToTab} produtoParaEditar={navigationData?.produtoParaEditar || null} codigoNovoProduto={navigationData?.codigoNovoProduto || null} empresaId={currentCompany!.id} />;
      case 'relatorios':
        return <RelatoriosTab empresaId={currentCompany!.id} />;
      case 'etiquetas':
        return <EtiquetasTab showToast={showToast} empresaId={currentCompany!.id} onScanOpen={() => setIsScannerOpen(true)} codigoBuscaInicial={navigationData?.codigoBuscaInicial || null} />;
      case 'separacao':
        return <SeparacaoTab showToast={showToast} onNavigateToTab={handleNavigateToTab} scannedCode={navigationData?.scannedCode || null} scanTimestamp={navigationData?.timestamp || null} empresaId={currentCompany!.id} />;
      case 'contagem':
        return <ContagemTab showToast={showToast} onScanOpen={() => setIsScannerOpen(true)} scannedCode={navigationData?.scannedCode || null} scanTimestamp={navigationData?.timestamp || null} empresaId={currentCompany!.id} />;
      default:
        return null;
    }
  };
  
    const FloatingActionButton = () => (
        <button
            onClick={() => setIsScannerOpen(true)}
            className="fixed bottom-24 right-4 z-30 w-16 h-16 rounded-full flex items-center justify-center shadow-lg text-white transition-all transform hover:scale-110"
            style={{ backgroundColor: 'var(--color-primary)' }}
            title="Ler QR Code"
            aria-label="Ler QR Code do produto"
        >
            <QrCodeIcon className="w-8 h-8" />
        </button>
    );
    
    const BottomNavBar = () => (
        <div className="fixed bottom-0 left-0 right-0 z-40 h-20 shadow-lg" style={{ backgroundColor: 'var(--color-card)', borderTop: '1px solid var(--color-border)' }}>
            <div className="flex justify-around items-center h-full">
                {mobileMainTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleNavigateToTab(tab.id)}
                        className={`flex flex-col items-center justify-center text-xs transition-colors w-full h-full ${activeTab === tab.id ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                    >
                        {React.cloneElement(tab.icon, { className: "w-6 h-6 mb-1" })}
                        <span>{tab.label}</span>
                    </button>
                ))}
                <div className="relative h-full" ref={moreMenuRef}>
                    <button
                        onClick={() => setIsMoreMenuOpen(p => !p)}
                        className={`flex flex-col items-center justify-center text-xs transition-colors w-full h-full px-4 ${isMoreMenuActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}
                    >
                        <DotsCircleHorizontalIcon className="w-6 h-6 mb-1" />
                        <span>Mais</span>
                    </button>
                    {isMoreMenuOpen && (
                         <div className="absolute bottom-full right-0 mb-2 w-56 max-h-80 overflow-y-auto rounded-lg shadow-lg py-1 z-50 animate-fade-in" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)'}}>
                             {mobileMoreTabs.map(tab => (
                                 <a
                                     key={tab.id}
                                     href="#"
                                     onClick={(e) => {
                                         e.preventDefault();
                                         handleNavigateToTab(tab.id);
                                         setIsMoreMenuOpen(false);
                                     }}
                                     className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 w-full text-left`}
                                     style={{ color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text)' }}
                                 >
                                     {React.cloneElement(tab.icon, { className: "w-5 h-5" })}
                                     {tab.label}
                                 </a>
                             ))}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );


  const globalStyles = (
    <style>{`
        :root {
          --color-primary: ${theme.primary};
          --color-primary-rgb: 0,0,0; /* Fallback, will be replaced by useEffect */
          --color-background: ${theme.background};
          --color-card: ${theme.card};
          --color-text: ${theme.text};
          --color-text-secondary: ${theme.textSecondary};
          --color-border: ${theme.border};
        }
        @keyframes tab-fade-in {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-tab-content {
            animation: tab-fade-in 0.4s ease-out;
        }
        body {
          font-family: 'Inter', sans-serif;
          background-color: var(--color-background);
          background-image: radial-gradient(ellipse at center, ${theme.card} 0%, ${theme.background} 100%);
          color: var(--color-text);
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        input, select {
            border-radius: 0.5rem;
            transition: all 0.2s ease-in-out;
        }
        input:focus, select:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.2);
        }
        input[type="text"] {
          text-transform: uppercase;
        }
        input[type="text"]::placeholder {
          text-transform: none;
        }
        .tab-button {
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-weight: 500;
            transition: all 0.2s ease-in-out;
            line-height: 1.2;
        }
        .tab-button:hover {
            color: var(--color-text);
            transform: translateY(-2px);
        }
        .help-icon-container:hover .help-tooltip {
          opacity: 1;
          pointer-events: auto;
        }
        .btn-primary {
            background-color: var(--color-primary);
            color: white;
            font-weight: 600;
            border-radius: 0.5rem;
            padding: 0.5rem 1.5rem;
            transition: all 0.2s ease-in-out;
        }
        .btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 15px rgba(var(--color-primary-rgb), 0.2);
        }
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: translateY(0);
            box-shadow: none;
        }

        /* Table styles */
        table thead {
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-size: 0.8rem;
            color: var(--color-text-secondary);
        }
      `}</style>
  );

  if (isLoadingAuth) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            {globalStyles}
            <Spinner />
        </div>
      );
  }

  if (!isAuthenticated) {
    return (
      <>
        {globalStyles}
        <LoginScreen />
      </>
    );
  }

  const shouldShowCompanySelector = !currentCompany && !administrativeTabs.includes(activeTab) && !isLoadingCompanies;

  if (shouldShowCompanySelector) {
    return (
      <>
        {globalStyles}
        <CompanySelectionScreen onNavigateToTab={handleNavigateToTab} />
      </>
    );
  }

  return (
    <>
      {globalStyles}
      <ToastContainer toasts={toasts} onClose={closeToast} />
      {isScannerOpen && <QRCodeScanner onScan={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />}

      <div className={`min-h-screen font-sans ${isMobile ? 'pb-24' : ''}`}>
        <header className="shadow-lg sticky top-0 z-30" style={{backgroundColor: 'var(--color-card)', borderBottom: '1px solid var(--color-border)'}}>
            <div className="w-full max-w-7xl mx-auto flex justify-between items-center p-4">
                <div className="flex items-center gap-4">
                     <div className="relative" ref={userMenuRef}>
                        <button onClick={() => setIsUserMenuOpen(p => !p)} className="p-1 rounded-full hover:opacity-80 transition-opacity" title={`Perfil de ${currentUser?.username}`}>
                            <UserIcon className="w-8 h-8 rounded-full p-1" style={{color: 'var(--color-primary)', backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)'}}/>
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute left-0 mt-2 w-56 rounded-lg shadow-lg py-1 z-30 animate-fade-in" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)'}}>
                               <div className="px-4 py-2 border-b" style={{borderColor: 'var(--color-border)'}}>
                                 <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Logado como</p>
                                 <p className="font-semibold truncate">{currentUser?.username}</p>
                               </div>
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNavigateToTab('perfil');
                                        setIsUserMenuOpen(false);
                                    }}
                                    className="block px-4 py-2 text-sm transition-colors hover:bg-white/5 w-full text-left"
                                    style={{color: 'var(--color-text)'}}
                                >
                                    Meu Perfil
                                </a>
                                 <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        logout();
                                        setIsUserMenuOpen(false);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-white/5 w-full text-left"
                                    style={{color: 'var(--color-text-secondary)'}}
                                >
                                   <LogoutIcon className="w-5 h-5"/> Sair
                                </a>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="text-center">
                    <h1 className="text-xl sm:text-2xl font-bold hidden sm:block" style={{color: 'var(--color-text)'}}>
                        Gerenciador de Estoque
                    </h1>
                    <CompanySelector onNavigateToTab={handleNavigateToTab} />
                </div>
                <button 
                    onClick={() => setIsScannerOpen(true)}
                    className="p-2 rounded-full hover:opacity-80 transition-opacity md:hidden"
                    title="Ler QR Code"
                    aria-label="Ler QR Code do produto"
                >
                    <QrCodeIcon className="w-7 h-7" style={{color: 'var(--color-primary)'}} />
                </button>
                 <div className="hidden md:block w-12"></div>
            </div>
        </header>
        
        {isMobile && (
            <>
                <FloatingActionButton/>
                <BottomNavBar/>
            </>
        )}

        {!isMobile && (
            <nav className="p-2 sticky top-[95px] z-20" style={{backgroundColor: 'var(--color-card)', borderBottom: '1px solid var(--color-border)'}}>
                <div className="max-w-7xl mx-auto">
                    <div ref={navContainerRef} className="relative w-full flex justify-center">
                        <div ref={tabsForMeasurementRef} className="absolute invisible -z-50 flex space-x-2">
                            {allTabs.map(tab => (
                                <button key={tab.id} className="tab-button whitespace-nowrap flex flex-col items-center">
                                    {React.cloneElement(tab.icon, { className: "w-6 h-6 mb-1" })}
                                    <span className="text-xs">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div ref={navTabsContainerRef} className="flex justify-center space-x-2">
                            {mainTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    data-tab-id={tab.id}
                                    onClick={() => {
                                        setNavigationData(null);
                                        setActiveTab(tab.id);
                                    }}
                                    className="tab-button flex flex-col items-center"
                                    style={{color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)'}}
                                >
                                    {React.cloneElement(tab.icon, { className: "w-6 h-6 mb-1" })}
                                    <span className="text-xs whitespace-nowrap">{tab.label}</span>
                                </button>
                            ))}
                            {moreTabs.length > 0 && (
                                <div className="relative" ref={moreMenuRef}>
                                    <button 
                                        ref={moreButtonRef}
                                        data-tab-id="more"
                                        onClick={() => setIsMoreMenuOpen(prev => !prev)}
                                        className="tab-button flex flex-col items-center"
                                        style={{color: isMoreMenuActive ? 'var(--color-primary)' : 'var(--color-text-secondary)'}}
                                    >
                                        <DotsCircleHorizontalIcon className="w-6 h-6 mb-1"/>
                                        <span className="text-xs whitespace-nowrap">Mais</span>
                                    </button>
                                    {isMoreMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-30" style={{backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)'}}>
                                            {moreTabs.map(tab => (
                                                <a
                                                    key={tab.id}
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setNavigationData(null);
                                                        setActiveTab(tab.id);
                                                        setIsMoreMenuOpen(false);
                                                    }}
                                                    className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-white/5 w-full text-left`}
                                                    style={{
                                                        color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text)'
                                                    }}
                                                >
                                                    {React.cloneElement(tab.icon, { className: "w-5 h-5" })}
                                                    {tab.label}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div
                            className="absolute bottom-[-9px] h-0.5 rounded-full transition-all duration-300 ease-out"
                            style={{
                                left: indicatorStyle.left,
                                width: indicatorStyle.width,
                                opacity: indicatorStyle.opacity,
                                backgroundColor: 'var(--color-primary)',
                            }}
                        />
                    </div>
                </div>
            </nav>
        )}


        <main key={activeTab} className="p-4 sm:p-6 lg:p-8 relative animate-tab-content">
            {isLoadingCompanies && !currentCompany ? <div className="flex justify-center items-center h-64"><Spinner /></div> : renderTabContent()}
        </main>
      </div>
    </>
  );
};