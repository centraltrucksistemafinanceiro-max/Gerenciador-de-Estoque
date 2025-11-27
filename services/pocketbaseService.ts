import PocketBase, { RecordModel } from 'pocketbase';
import type { User, Empresa, Produto, Movimentacao, Separacao, SeparacaoItem, ContagemEstoque, ContagemEstoqueItem, MovimentacaoTipo, BackupData } from '../types';

const pb = new PocketBase('https://sistemaB.fs-sistema.cloud/');

// Cache for products to reduce API calls (for single product lookups)
const productCache = new Map<string, Produto>();

const getAuthHeader = () => {
    return { 'Authorization': pb.authStore.token };
};

export const pocketbaseService = {
    // --- AUTH METHODS ---
    getCurrentUser(): User | null {
        return pb.authStore.model as User | null;
    },

    isAuthValid(): boolean {
        return pb.authStore.isValid;
    },

    async login(username: string, password: string): Promise<User | null> {
        await pb.collection('users').authWithPassword<User>(username, password);
        const refreshedRecord = await pb.collection('users').authRefresh<User>();
        return refreshedRecord.record;
    },

    logout() {
        pb.authStore.clear();
    },

    updateCurrentUser(updates: Partial<User>): User | null {
        if (pb.authStore.model) {
            const updatedModel = { ...pb.authStore.model, ...updates };
            pb.authStore.save(pb.authStore.token, updatedModel);
            return updatedModel as User;
        }
        return null;
    },

    // --- COMPANY METHODS ---
    async getAllEmpresas(): Promise<Empresa[]> {
        return pb.collection('empresas').getFullList<Empresa>({ sort: 'nome' });
    },
    
    async createEmpresa(nome: string): Promise<Empresa> {
        return pb.collection('empresas').create<Empresa>({ nome });
    },
        
    // --- PRODUCT METHODS ---
    async checkCodeUniqueness(empresaId: string, codigo: string, currentProductId: string | null = null): Promise<boolean> {
        const filterParts = [
            `empresa = "${empresaId}"`,
            `(codigo = "${codigo}" || codigos_alternativos ~ "${codigo}")`
        ];
        if (currentProductId) {
            filterParts.push(`id != "${currentProductId}"`);
        }
        const filter = filterParts.join(' && ');
        
        try {
            await pb.collection('produtos').getFirstListItem(filter);
            return false; // Found a match, so not unique
        } catch (error: any) {
            if (error.status === 404) {
                return true; // Not found, so it is unique
            }
            throw error; // Other error
        }
    },

    async findProdutoByCodigo(empresaId: string, codigo: string): Promise<Produto | null> {
        const cacheKey = `${empresaId}-${codigo.toLowerCase()}`;
        if (productCache.has(cacheKey)) {
            return productCache.get(cacheKey)!;
        }

        const filter = `empresa = "${empresaId}" && (codigo = "${codigo}" || codigos_alternativos ~ "${codigo}")`;
        try {
            const produto = await pb.collection('produtos').getFirstListItem<Produto>(filter);
            productCache.set(cacheKey, produto);
            return produto;
        } catch (error: any) {
             if (error.status === 404) {
                return null;
            }
            throw error;
        }
    },

    async getAllProdutos(
        empresaId: string, 
        includeInactive: boolean = false, 
        options: { 
            searchTerm?: string; 
            location?: string;
            sortKey?: string;
            sortDirection?: 'asc' | 'desc';
        } = {}
    ): Promise<Produto[]> {
        const filterParts: string[] = [`empresa = "${empresaId}"`];
        
        if (!includeInactive) {
            filterParts.push(`status = "ativo"`);
        }

        if (options.searchTerm) {
            const term = options.searchTerm;
            const searchFilter = `(codigo ~ "${term}" || descricao ~ "${term}" || localizacao ~ "${term}" || codigos_alternativos ~ "${term}")`;
            filterParts.push(searchFilter);
        }

        if (options.location) {
            filterParts.push(`localizacao = "${options.location}"`);
        }
        
        const filter = filterParts.join(' && ');
        const sortDirection = options.sortDirection === 'desc' ? '-' : '+';
        const sort = `${sortDirection}${options.sortKey || 'descricao'}`;

        const produtos = await pb.collection('produtos').getFullList<Produto>({ filter, sort });
        return produtos;
    },
    
    async getUniqueProductLocations(empresaId: string): Promise<string[]> {
        const records = await pb.collection('produtos').getFullList<{ localizacao: string }>({
            filter: `empresa = "${empresaId}" && localizacao != ""`,
            fields: 'localizacao',
        });
        // FIX: Explicitly cast `r.localizacao` to string. When using `fields` option, the PocketBase SDK may not correctly infer the type, leading to a TypeScript error where `r.localizacao` is `unknown`.
        const locations = new Set(records.map(r => String(r.localizacao).trim()));
        return [...locations].sort();
    },

    async cadastrarProduto(novoProdutoData: Omit<Produto, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated'>, userId: string): Promise<Produto> {
        const createdProduto = await pb.collection('produtos').create<Produto>(novoProdutoData);
        productCache.set(`${novoProdutoData.empresa}-${novoProdutoData.codigo.toLowerCase()}`, createdProduto);

        if (novoProdutoData.quantidade > 0) {
            await this.registrarMovimentacao({
                empresa: novoProdutoData.empresa,
                produto_codigo: novoProdutoData.codigo,
                produto_descricao: novoProdutoData.descricao,
                tipo: 'entrada',
                quantidade: novoProdutoData.quantidade,
                usuario: userId
            });
        }
        return createdProduto;
    },

    async editarProduto(produtoId: string, updates: Partial<Omit<Produto, 'id' | 'created' | 'updated' | 'collectionId' | 'collectionName' | 'empresa'>>): Promise<Produto> {
        const updatedProduto = await pb.collection('produtos').update<Produto>(produtoId, updates);
        // Invalidate cache
        productCache.clear();
        return updatedProduto;
    },
    
    async validarProdutosEmLote(empresaId: string, produtosParaValidar: Array<{codigo: string}>): Promise<any[]> {
        // This is a complex operation on the frontend, let's keep it mostly client-side for now
        // to avoid too many API calls. We'll fetch all existing codes once.
        const allExistingProducts = await this.getAllProdutos(empresaId, true);
        const allExistingCodes = new Set(allExistingProducts.flatMap(p => [p.codigo.toLowerCase(), ...p.codigos_alternativos.map(c => c.toLowerCase())]));
        const codesInThisBatch = new Set<string>();
        
        return produtosParaValidar.map((p: any) => {
            const result = { data: p, status: 'novo' as 'novo' | 'ignorado' | 'erro', errorMessage: '' };
            if (!p.codigo || !p.descricao || p.valor <= 0 || !p.localizacao) {
                result.status = 'erro';
                result.errorMessage = 'Dados incompletos.';
                return result;
            }
            const lowerCodigo = p.codigo.toLowerCase();
            if (allExistingCodes.has(lowerCodigo) || codesInThisBatch.has(lowerCodigo)) {
                result.status = 'ignorado';
                result.errorMessage = 'Código já existe.';
            }
            if (result.status === 'novo') {
                codesInThisBatch.add(lowerCodigo);
            }
            return result;
        });
    },

    async cadastrarProdutosEmLote(empresaId: string, novosProdutos: any[], userId: string): Promise<{ criados: number, ignorados: number }> {
        let criados = 0;
        // In a real scenario, you'd use a transactional API, but PocketBase requires this one-by-one
        for (const p of novosProdutos) {
            try {
                await this.cadastrarProduto({
                    ...p,
                    empresa: empresaId,
                    codigos_alternativos: [],
                    status: 'ativo'
                }, userId);
                criados++;
            } catch (e) {
                console.error("Batch create error:", e);
            }
        }
        return { criados, ignorados: novosProdutos.length - criados };
    },

    // --- MOVIMENTACAO METHODS ---
    async registrarMovimentacao(data: Omit<Movimentacao, 'id'|'collectionId'|'collectionName'|'created'|'updated'|'expand'>): Promise<Movimentacao> {
        return pb.collection('movimentacoes').create<Movimentacao>(data);
    },

    async updateQuantidadeProduto(produtoId: string, novaQuantidade: number): Promise<Produto> {
        return this.editarProduto(produtoId, { quantidade: novaQuantidade });
    },

    async getMovimentacoes(empresaId: string, filters: { produtoCodigo?: string; dataInicio?: string; dataFim?: string; tipo?: MovimentacaoTipo | 'todos' }): Promise<Movimentacao[]> {
        const filterParts: string[] = [`empresa = "${empresaId}"`];
        if (filters.produtoCodigo) {
            filterParts.push(`produto_codigo ~ "${filters.produtoCodigo}"`);
        }
        if (filters.tipo && filters.tipo !== 'todos') {
            filterParts.push(`tipo = "${filters.tipo}"`);
        }
        if (filters.dataInicio) {
            filterParts.push(`created >= "${filters.dataInicio} 00:00:00"`);
        }
        if (filters.dataFim) {
            filterParts.push(`created <= "${filters.dataFim} 23:59:59"`);
        }
        
        return pb.collection('movimentacoes').getFullList<Movimentacao>({
            filter: filterParts.join(' && '),
            sort: '-created',
            expand: 'usuario'
        });
    },
    
    // --- BACKUP METHODS ---
    async exportBackup(): Promise<BackupData> {
        const collections: (keyof BackupData)[] = ['empresas', 'produtos', 'movimentacoes', 'separacoes', 'separacao_itens', 'contagens', 'contagem_itens', 'users'];
        const backupData: Partial<BackupData> = {};
        
        for (const collectionName of collections) {
             (backupData[collectionName] as any) = await pb.collection(collectionName).getFullList({
                // Don't export sensitive fields for users
                fields: collectionName === 'users' ? 'id,username,role,created,updated' : undefined
            });
        }
        return backupData as BackupData;
    },

    async importBackup(data: BackupData): Promise<void> {
        const collections: (keyof BackupData)[] = ['empresas', 'produtos', 'movimentacoes', 'separacoes', 'separacao_itens', 'contagens', 'contagem_itens'];
        
        // This is a dangerous operation. Order matters due to relations.
        // It's safer to delete in reverse order of creation.
        for (let i = collections.length - 1; i >= 0; i--) {
            const collectionName = collections[i];
            const records = await pb.collection(collectionName).getFullList({ fields: 'id' });
            const deletePromises = records.map(r => pb.collection(collectionName).delete(r.id));
            await Promise.all(deletePromises);
        }

        // Now import in order
        for (const collectionName of collections) {
            const recordsToImport = (data as any)[collectionName];
            if (recordsToImport && recordsToImport.length > 0) {
                 for(const record of recordsToImport) {
                    // PocketBase doesn't allow setting ID on create
                    const { id, collectionId, collectionName: cName, created, updated, expand, ...createData } = record;
                    await pb.collection(collectionName).create(createData);
                 }
            }
        }
    },

    // --- SEPARACAO METHODS ---
    async createSeparacao(data: Partial<Separacao>): Promise<Separacao> {
        return pb.collection('separacoes').create<Separacao>(data);
    },
    
    async getSeparacoes(empresaId: string): Promise<Separacao[]> {
        return pb.collection('separacoes').getFullList<Separacao>({
            filter: `empresa = "${empresaId}"`,
            sort: '+status,-created' // Sort by status first, then newest
        });
    },

    async getSeparacaoComItens(separacaoId: string): Promise<{ separacao: Separacao, items: SeparacaoItem[] }> {
        const [separacao, items] = await Promise.all([
            pb.collection('separacoes').getOne<Separacao>(separacaoId, { expand: 'usuario' }),
            pb.collection('separacao_itens').getFullList<SeparacaoItem>({ filter: `separacao = "${separacaoId}"` })
        ]);
        return { separacao, items };
    },
    
    async setSeparacaoItems(separacaoId: string, items: Omit<SeparacaoItem, 'id'|'collectionId'|'collectionName'|'created'|'updated'>[]): Promise<void> {
        // Clear existing items
        const existingItems = await pb.collection('separacao_itens').getFullList({ filter: `separacao = "${separacaoId}"`, fields: 'id' });
        const deletePromises = existingItems.map(item => pb.collection('separacao_itens').delete(item.id));
        await Promise.all(deletePromises);

        // Add new items
        const createPromises = items.map(item => pb.collection('separacao_itens').create(item));
        await Promise.all(createPromises);
    },

    async addItemToSeparacao(separacaoId: string, produtoCodigo: string): Promise<SeparacaoItem | null> {
        const filter = `separacao = "${separacaoId}" && produto_codigo = "${produtoCodigo}"`;
        try {
            const item = await pb.collection('separacao_itens').getFirstListItem<SeparacaoItem>(filter);
            const separacao = await pb.collection('separacoes').getOne(separacaoId);
            const produto = await this.findProdutoByCodigo(separacao.empresa, produtoCodigo);

            if (!produto) throw new Error("Produto não encontrado no estoque.");
            if (item.quantidade_separada >= produto.quantidade) throw new Error("Estoque insuficiente.");
            if (item.quantidade_separada >= item.quantidade_requerida) throw new Error("Quantidade requerida já atingida.");

            return pb.collection('separacao_itens').update(item.id, { 'quantidade_separada+': 1 });
        } catch (error: any) {
            if (error.status === 404) throw new Error('Item não pertence a esta separação.');
            throw error;
        }
    },

    async updateSeparacaoItemQuantidade(itemId: string, quantidade: number): Promise<SeparacaoItem> {
        return pb.collection('separacao_itens').update<SeparacaoItem>(itemId, { quantidade_separada: quantidade });
    },
    
    async finalizarSeparacao(separacaoId: string, userId: string): Promise<Separacao> {
        const { separacao, items } = await this.getSeparacaoComItens(separacaoId);
        if (separacao.status !== 'em andamento') throw new Error("Separação já foi finalizada.");
        
        // This should be a transaction, but PocketBase doesn't support it in JS SDK.
        // Doing it step by step.
        for (const item of items) {
            if (item.quantidade_separada > 0) {
                const produto = await this.findProdutoByCodigo(separacao.empresa, item.produto_codigo);
                if (!produto) throw new Error(`Produto ${item.produto_codigo} não encontrado.`);
                if (produto.quantidade < item.quantidade_separada) throw new Error(`Estoque insuficiente para ${produto.descricao}.`);
                
                await this.updateQuantidadeProduto(produto.id, produto.quantidade - item.quantidade_separada);
                await this.registrarMovimentacao({
                    empresa: separacao.empresa,
                    produto_codigo: produto.codigo,
                    produto_descricao: produto.descricao,
                    tipo: 'saida',
                    quantidade: item.quantidade_separada,
                    usuario: userId,
                });
            }
        }
        
        return pb.collection('separacoes').update<Separacao>(separacaoId, {
            status: 'aguardando entrega',
            usuario: userId,
            dataFinalizacao: new Date().toISOString()
        });
    },
  
    async confirmarEntrega(separacaoId: string, nome_recebedor: string): Promise<Separacao> {
        return pb.collection('separacoes').update<Separacao>(separacaoId, {
            status: 'entregue',
            nome_recebedor,
            dataFinalizacao: new Date().toISOString()
        });
    },

    // --- CONTAGEM METHODS ---
    async createContagem(data: Pick<ContagemEstoque, 'empresa'|'nome'|'status'>): Promise<ContagemEstoque> {
        return pb.collection('contagens').create<ContagemEstoque>(data);
    },
    async getContagens(empresaId: string): Promise<ContagemEstoque[]> {
        return pb.collection('contagens').getFullList<ContagemEstoque>({
            filter: `empresa = "${empresaId}"`,
            sort: '-created'
        });
    },
    async getContagemComItens(contagemId: string): Promise<{ contagem: ContagemEstoque, items: ContagemEstoqueItem[] }> {
        const [contagem, items] = await Promise.all([
            pb.collection('contagens').getOne<ContagemEstoque>(contagemId),
            pb.collection('contagem_itens').getFullList<ContagemEstoqueItem>({ filter: `contagem = "${contagemId}"` })
        ]);
        return { contagem, items };
    },
    async addItemToContagem(contagemId: string, itemData: Omit<ContagemEstoqueItem, 'id'|'collectionId'|'collectionName'|'created'|'updated'|'contagem'>): Promise<ContagemEstoqueItem[]> {
        const filter = `contagem = "${contagemId}" && produto_codigo = "${itemData.produto_codigo}"`;
        try {
            const existing = await pb.collection('contagem_itens').getFirstListItem(filter);
            await pb.collection('contagem_itens').update(existing.id, { quantidade_contada: itemData.quantidade_contada });
        } catch (error: any) {
            if (error.status === 404) {
                await pb.collection('contagem_itens').create({ contagem: contagemId, ...itemData });
            } else {
                throw error;
            }
        }
        return this.getContagemComItens(contagemId).then(res => res.items);
    },
    async finalizarContagem(contagemId: string): Promise<ContagemEstoque> {
        return pb.collection('contagens').update<ContagemEstoque>(contagemId, {
            status: 'finalizada',
            dataFinalizacao: new Date().toISOString()
        });
    },
    async ajustarEstoque(contagemId: string, userId: string): Promise<{ ajustados: number }> {
        const { contagem, items } = await this.getContagemComItens(contagemId);
        if (contagem.status !== 'em andamento') throw new Error("A contagem já foi finalizada/ajustada.");

        let ajustados = 0;
        for (const item of items) {
            const discrepancia = item.quantidade_contada - item.quantidade_sistema;
            if (discrepancia !== 0) {
                const produto = await this.findProdutoByCodigo(contagem.empresa, item.produto_codigo);
                if (produto) {
                    await this.updateQuantidadeProduto(produto.id, item.quantidade_contada);
                    await this.registrarMovimentacao({
                        empresa: contagem.empresa,
                        produto_codigo: produto.codigo,
                        produto_descricao: produto.descricao,
                        tipo: discrepancia > 0 ? 'entrada' : 'saida',
                        quantidade: Math.abs(discrepancia),
                        usuario: userId
                    });
                    ajustados++;
                }
            }
        }
        await this.finalizarContagem(contagemId);
        return { ajustados };
    },

    // --- USER MANAGEMENT ---
    async getAllUsers(): Promise<User[]> {
        return pb.collection('users').getFullList<User>({ sort: 'username' });
    },
    async createUser(data: any): Promise<RecordModel> {
        return pb.collection('users').create(data);
    },
    async changeUserPassword(userId: string, oldPassword: string, newPassword: string, newPasswordConfirm: string): Promise<void> {
        await pb.collection('users').update(userId, { oldPassword, newPassword, newPasswordConfirm });
    },
    async adminResetUserPassword(targetUserId: string, newPassword: string): Promise<void> {
        await pb.collection('users').update(targetUserId, { password: newPassword, passwordConfirm: newPassword });
    },
};