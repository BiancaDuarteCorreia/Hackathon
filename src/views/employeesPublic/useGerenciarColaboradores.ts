import { useState, useCallback, useMemo } from 'react';
import { sql } from '../../lib/neon';
import { put } from '@vercel/blob';

export interface ColaboradorUser {
    id: string;
    name: string;
    cpf?: string | null;
    email?: string | null;
    photo_url?: string | null;
    role: 'EMPLOYEE';
    department: string;
}

// Remove acentos e ignora maiúsculas/minúsculas para a busca por nome
const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const BLOB_TOKEN = (import.meta as any).env?.VITE_BLOB_READ_WRITE_TOKEN as string | undefined;

// Limite da foto de perfil (mesmo padrão da tela de perfil: 10MB)
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

// Apaga o arquivo do Vercel Blob via API de exclusão (mesmo padrão do useProfile)
const deleteVercelFile = async (url?: string | null) => {
    if (!url || !url.includes('vercel-storage.com')) return;

    try {
        await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
    } catch (error) {
        console.error('Falha ao comunicar com a API de exclusão:', error);
    }
};

export function useGerenciarColaboradores(
    showAlert: (type: 'success' | 'error', title: string, message: string) => void
) {
    const [colaboradores, setColaboradores] = useState<ColaboradorUser[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [setorFilter, setSetorFilter] = useState<string | undefined>(undefined);

    const fetchColaboradores = useCallback(async () => {
        setLoading(true);
        try {
            // Busca os colaboradores com os novos campos (email e photo_url)
            const data = await sql`
                SELECT id, name, cpf, email, role, department, photo_url
                FROM users
                WHERE role = 'EMPLOYEE'::user_role
                ORDER BY name ASC
            `;
            setColaboradores(data as ColaboradorUser[]);
        } catch (error: any) {
            console.error('Erro ao buscar colaboradores:', error);
            showAlert('error', 'Erro', 'Não foi possível carregar a lista de colaboradores.');
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    // Função para upload no Vercel Blob
    const uploadPhoto = async (file: File, userId?: string): Promise<string> => {
        if (!file.type.startsWith('image/')) {
            throw new Error('Selecione um arquivo de imagem.');
        }
        if (file.size > MAX_PHOTO_SIZE) {
            throw new Error('A imagem é muito grande. O limite máximo é de 10MB.');
        }

        try {
            const fileName = `profile-user-${userId ?? 'new'}-${Date.now()}`;
            const blob = await put(fileName, file, {
                access: 'public',
                contentType: file.type,
                token: BLOB_TOKEN,
            });
            return blob.url;
        } catch (error) {
            console.error('Erro ao fazer upload da foto no Vercel Blob:', error);
            throw new Error('Falha ao enviar a imagem. Tente novamente.');
        }
    };

    const createColaborador = async (userData: {
        name: string;
        cpf: string;
        email?: string;
        department: string;
        photoFile?: File | null;
    }): Promise<boolean> => {
        setActionLoading(true);
        let uploadedPhotoUrl: string | null = null;
        let photoCommitted = false;
        try {
            // Valida CPF duplicado
            const duplicateCpf = await sql`
                SELECT 1 FROM users WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = ${onlyDigits(userData.cpf)} LIMIT 1
            `;
            if (duplicateCpf.length > 0) throw new Error('Este CPF já está cadastrado no sistema.');

            // Valida E-mail duplicado (se preenchido)
            if (userData.email) {
                const duplicateEmail = await sql`
                    SELECT 1 FROM users WHERE lower(email) = lower(${userData.email}) LIMIT 1
                `;
                if (duplicateEmail.length > 0) throw new Error('Este e-mail já está cadastrado no sistema.');
            }

            // Upload da foto
            if (userData.photoFile) {
                uploadedPhotoUrl = await uploadPhoto(userData.photoFile);
            }

            const finalEmail = userData.email ? userData.email.trim().toLowerCase() : null;

            await sql`
                INSERT INTO users (name, cpf, email, role, department, photo_url)
                VALUES (
                    ${userData.name},
                    ${userData.cpf},
                    ${finalEmail},
                    'EMPLOYEE'::user_role,
                    ${userData.department},
                    ${uploadedPhotoUrl}
                )
            `;
            photoCommitted = true;

            showAlert('success', 'Sucesso', 'Colaborador cadastrado com sucesso!');
            await fetchColaboradores();
            return true;
        } catch (error: any) {
            console.error('Erro ao cadastrar colaborador:', error);

            // Não deixa arquivo órfão no Blob se o cadastro não foi concluído
            if (uploadedPhotoUrl && !photoCommitted) {
                deleteVercelFile(uploadedPhotoUrl).catch(() => { });
            }

            const msg = error.message?.toLowerCase() || '';
            if (error?.code === '23505' || msg.includes('já está cadastrado')) {
                showAlert('error', 'Erro', error.message || 'CPF ou E-mail já cadastrado.');
            } else {
                showAlert('error', 'Erro', error.message || 'Não foi possível cadastrar o colaborador.');
            }
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const updateColaborador = async (
        id: string,
        userData: {
            name: string;
            cpf: string;
            email?: string;
            department: string;
            photoFile?: File | null;
            removePhoto?: boolean;
        }
    ): Promise<boolean> => {
        setActionLoading(true);
        let uploadedPhotoUrl: string | null = null;
        let photoCommitted = false;
        try {
            // Busca a foto atual caso nenhuma nova seja enviada
            const current = await sql`
                SELECT photo_url FROM users
                WHERE id = ${id} AND role = 'EMPLOYEE'::user_role
                LIMIT 1
            `;
            const currentPhotoUrl: string | null = current[0]?.photo_url ?? null;
            let newPhotoUrl: string | null = currentPhotoUrl;

            if (userData.email) {
                const duplicateEmail = await sql`
                    SELECT 1 FROM users WHERE lower(email) = lower(${userData.email}) AND id <> ${id} LIMIT 1
                `;
                if (duplicateEmail.length > 0) throw new Error('Este e-mail já está cadastrado em outro usuário.');
            }

            if (userData.photoFile) {
                uploadedPhotoUrl = await uploadPhoto(userData.photoFile, id);
                newPhotoUrl = uploadedPhotoUrl;
            } else if (userData.removePhoto) {
                newPhotoUrl = null;
            }

            const finalEmail = userData.email ? userData.email.trim().toLowerCase() : null;

            await sql`
                UPDATE users
                SET name = ${userData.name},
                    cpf = ${userData.cpf},
                    email = ${finalEmail},
                    department = ${userData.department},
                    photo_url = ${newPhotoUrl},
                    updated_at = now()
                WHERE id = ${id}
                  AND role = 'EMPLOYEE'::user_role
            `;
            photoCommitted = true;

            // Foto antiga só é apagada do Blob depois que o banco foi atualizado
            if (currentPhotoUrl && currentPhotoUrl !== newPhotoUrl) {
                deleteVercelFile(currentPhotoUrl).catch(() => { });
            }

            showAlert('success', 'Sucesso', 'Colaborador atualizado com sucesso!');
            await fetchColaboradores();
            return true;
        } catch (error: any) {
            console.error('Erro ao atualizar colaborador:', error);

            // Não deixa a foto nova órfã no Blob se a atualização falhou
            if (uploadedPhotoUrl && !photoCommitted) {
                deleteVercelFile(uploadedPhotoUrl).catch(() => { });
            }

            const msg = error.message?.toLowerCase() || '';
            if (error?.code === '23505' || msg.includes('já está cadastrado')) {
                showAlert('error', 'Erro', error.message || 'CPF ou E-mail já cadastrado.');
            } else {
                showAlert('error', 'Erro', error.message || 'Não foi possível atualizar o colaborador.');
            }
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const deleteColaborador = async (id: string): Promise<boolean> => {
        setActionLoading(true);
        try {
            const photoUrl = colaboradores.find((c) => c.id === id)?.photo_url ?? null;

            await sql`
                DELETE FROM users
                WHERE id = ${id}
                  AND role = 'EMPLOYEE'::user_role
            `;

            // Remove a foto do Blob junto com o colaborador
            if (photoUrl) {
                deleteVercelFile(photoUrl).catch(() => { });
            }

            showAlert('success', 'Sucesso', 'Colaborador excluído com sucesso!');
            await fetchColaboradores();
            return true;
        } catch (error: any) {
            console.error('Erro ao excluir colaborador:', error);
            const msg = error.message?.toLowerCase() || '';
            if (error?.code === '23503' || msg.includes('foreign key')) {
                showAlert('error', 'Erro', 'Não é possível excluir: este colaborador possui vínculos no sistema.');
            } else {
                showAlert('error', 'Erro', error.message || 'Não foi possível excluir o colaborador.');
            }
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const departmentOptions = useMemo(
        () =>
            Array.from(new Set(colaboradores.map((c) => c.department || 'Geral')))
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .map((d) => ({ value: d, label: d })),
        [colaboradores]
    );

    const filteredColaboradores = useMemo(() => {
        const q = normalize(search);
        const qDigits = search.replace(/\D/g, '');
        const onlyNumbers = /^[\d.\-\s]+$/.test(search.trim());

        return colaboradores.filter((c) => {
            if (setorFilter && (c.department || 'Geral') !== setorFilter) return false;
            if (!q) return true;
            if (onlyNumbers) return !qDigits || (c.cpf || '').replace(/\D/g, '').includes(qDigits);
            return normalize(c.name).includes(q) || normalize(c.email || '').includes(q);
        });
    }, [colaboradores, search, setorFilter]);

    return {
        colaboradores,
        filteredColaboradores,
        departmentOptions,
        search,
        setSearch,
        setorFilter,
        setSetorFilter,
        loading,
        actionLoading,
        fetchColaboradores,
        createColaborador,
        updateColaborador,
        deleteColaborador,
    };
}