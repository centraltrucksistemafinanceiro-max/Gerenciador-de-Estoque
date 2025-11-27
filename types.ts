// PocketBase Record types
export interface BaseRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
}

export interface Produto extends BaseRecord {
  empresa: string; // Relation ID
  codigo: string;
  descricao: string;
  valor: number;
  quantidade: number;
  localizacao: string;
  status: 'ativo' | 'inativo';
  codigos_alternativos: string[];
}

export type MovimentacaoTipo = 'entrada' | 'saida';

export interface Movimentacao extends BaseRecord {
  empresa: string; // Relation ID
  produto_codigo: string;
  produto_descricao: string;
  tipo: MovimentacaoTipo;
  quantidade: number;
  usuario: string; // Relation ID
  expand?: {
    usuario?: Pick<User, 'username'>; // To get the user's name
  };
}

export interface Tema {
  primary: string;
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
}

export type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
};

export type Tab = 'dashboard' | 'consulta' | 'estoque' | 'movimentacao' | 'cadastro' | 'relatorios' | 'etiquetas' | 'personalizar' | 'backup' | 'separacao' | 'contagem' | 'usuarios' | 'perfil' | 'empresas';

export interface Empresa extends BaseRecord {
    nome: string;
}

export type SeparacaoStatus = 'em andamento' | 'aguardando entrega' | 'entregue';

export interface Separacao extends BaseRecord {
  empresa: string; // Relation ID
  osNumero: string;
  cliente: string;
  placaVeiculo?: string;
  dataFinalizacao: string | null;
  status: SeparacaoStatus;
  usuario: string | null; // Relation ID
  nome_recebedor: string | null;
  expand?: {
    usuario?: Pick<User, 'username'>;
  };
}

export interface SeparacaoItem extends BaseRecord {
    separacao: string; // Relation ID
    produto_codigo: string;
    produto_descricao: string;
    localizacao: string;
    quantidade_requerida: number;
    quantidade_separada: number;
    quantidade_estoque_inicial: number;
}

export interface LabelPreset {
  id: string;
  name: string;
  width: number; // in mm
  height: number; // in mm
  qrCodeSize: number; // in mm
  codeFontSize: number; // in pt
  descriptionFontSize: number; // in pt
  footerFontSize: number; // in pt
  labelsPerRow: number;
}

export interface ProdutoParaImpressao {
  produto: Produto;
  quantidade: number;
}

export type ContagemStatus = 'em andamento' | 'finalizada';

export interface ContagemEstoque extends BaseRecord {
  empresa: string; // Relation ID
  nome: string;
  dataFinalizacao: string | null;
  status: ContagemStatus;
}

export interface ContagemEstoqueItem extends BaseRecord {
  contagem: string; // Relation ID
  produto_codigo: string;
  produto_descricao: string;
  quantidade_sistema: number;
  quantidade_contada: number;
}

export type UserRole = 'admin' | 'user';

// Represents the PocketBase AuthModel with our custom fields
export interface User extends BaseRecord {
  username: string;
  email: string;
  emailVisibility: boolean;
  verified: boolean;
  name: string;
  avatar: string;
  // Custom fields
  role: UserRole;
}