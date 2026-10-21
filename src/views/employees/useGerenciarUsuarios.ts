import { useState, useCallback, useMemo } from 'react';
import { sql } from '../../lib/neon';
import { put } from '@vercel/blob';

export interface SystemUser {
    id: string;
    name: string;
    cpf?: string | null;
    email?: string | null;
    hasLogin: boolean;
    role: 'RH' | 'LEADER' | 'INSTRUCTOR';
    department: string;
    photo_url?: string | null;
}

type AppRole = SystemUser['role'];

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const normalize = (value: string) =>
    value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const NEON_AUTH_URL = (import.meta as any).env?.VITE_NEON_AUTH_URL as string | undefined;
// Token do Vercel Blob (.env)
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

export const generateTempPassword = (length = 12): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = new Uint32Array(length - 2);
    crypto.getRandomValues(bytes);
    const base = Array.from(bytes, (b) => chars[b % chars.length]).join('');
    const symbols = '@#$%&*!';
    const extra = new Uint32Array(2);
    crypto.getRandomValues(extra);
    return `${base}${symbols[extra[0] % symbols.length]}${extra[1] % 10}`;
};

export const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
    { value: 'RH', label: 'Administração' },
    { value: 'LEADER', label: 'Líder' },
    { value: 'INSTRUCTOR', label: 'Instrutor' },
];

export function useGerenciarUsuarios(
    showAlert: (type: 'success' | 'error', title: string, message: string) => void
) {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [roleFilter, setRoleFilter] = useState<AppRole | undefined>(undefined);
    const [setorFilter, setSetorFilter] = useState<string | undefined>(undefined);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await sql`
                SELECT id, name, cpf, email, role, department, photo_url,
                       (auth_user_id IS NOT NULL) AS "hasLogin"
                FROM users
                WHERE role IN ('RH', 'LEADER', 'INSTRUCTOR')
                ORDER BY name ASC
            `;
            setUsers(data as SystemUser[]);
        } catch (error: any) {
            console.error('Erro ao buscar usuários:', error);
            showAlert('error', 'Erro', 'Não foi possível carregar a lista de usuários.');
        } finally {
            setLoading(false);
        }
    }, [showAlert]);

    const createAuthLogin = async (data: { name: string; email: string; password: string }): Promise<string> => {
        if (!NEON_AUTH_URL) {
            throw new Error('Configure VITE_NEON_AUTH_URL para cadastrar logins.');
        }

        const response = await fetch(`${NEON_AUTH_URL.replace(/\/$/, '')}/sign-up/email`, {
            method: 'POST',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: data.name,
                email: data.email.trim().toLowerCase(),
                password: data.password,
            }),
        });

        const body: any = await response.json().catch(() => ({}));

        if (!response.ok) {
            const code = String(body?.code || '').toUpperCase();
            if (code.includes('ALREADY_EXISTS') || String(body?.message || '').toLowerCase().includes('already exists')) {
                throw new Error('Este e-mail já está cadastrado no sistema.');
            }
            throw new Error(body?.message || 'Erro ao registrar credenciais de autenticação.');
        }

        const authUserId: string | undefined = body?.user?.id;
        if (!authUserId) {
            throw new Error('O Neon Auth não retornou o id do usuário criado.');
        }
        return authUserId;
    };

    // Sobe a foto no Vercel Blob e devolve a URL pública.
    // Em caso de falha lança erro (nada é salvo sem a foto sem o usuário saber).
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

    const createUser = async (userData: {
        name: string;
        cpf: string;
        email: string;
        tempPassword: string;
        role: AppRole;
        department: string;
        photoFile?: File | null;
    }): Promise<boolean> => {
        setActionLoading(true);
        let uploadedPhotoUrl: string | null = null;
        let photoCommitted = false;
        try {
            const duplicate = await sql`
                SELECT 1 FROM users
                WHERE regexp_replace(cpf, '[^0-9]', '', 'g') = ${onlyDigits(userData.cpf)}
                LIMIT 1
            `;
            if (duplicate.length > 0) {
                throw new Error('Este CPF já está cadastrado no sistema.');
            }

            const duplicateEmail = await sql`
                SELECT 1 FROM users
                WHERE lower(email) = lower(${userData.email})
                LIMIT 1
            `;
            if (duplicateEmail.length > 0) {
                throw new Error('Este e-mail já está cadastrado no sistema.');
            }

            // A foto sobe antes do login: se o upload falhar, nenhuma conta é criada
            if (userData.photoFile) {
                uploadedPhotoUrl = await uploadPhoto(userData.photoFile);
            }

            const authUserId = await createAuthLogin({
                name: userData.name,
                email: userData.email,
                password: userData.tempPassword,
            });

            await sql`
                INSERT INTO users (name, cpf, email, auth_user_id, role, department, photo_url)
                VALUES (
                    ${userData.name},
                    ${userData.cpf},
                    ${userData.email.trim().toLowerCase()},
                    ${authUserId}::uuid,
                    ${userData.role}::user_role,
                    ${userData.department},
                    ${uploadedPhotoUrl}
                )
            `;
            photoCommitted = true;

            await sql`
                UPDATE "neon_auth"."user"
                SET role = ${userData.role}
                WHERE id = ${authUserId}::uuid
            `;

            showAlert('success', 'Sucesso', 'Usuário cadastrado com sucesso!');
            await fetchUsers();
            return true;
        } catch (error: any) {
            console.error('Erro ao cadastrar usuário:', error);

            // Não deixa arquivo órfão no Blob se o cadastro não foi concluído
            if (uploadedPhotoUrl && !photoCommitted) {
                deleteVercelFile(uploadedPhotoUrl).catch(() => { });
            }

            const msg = error.message?.toLowerCase() || '';
            if (error?.code === '23505') {
                showAlert('error', 'Erro', 'CPF ou e-mail já cadastrado no sistema.');
            } else if (msg.includes('already exists') || msg.includes('em uso')) {
                showAlert('error', 'Erro', 'Este e-mail já está cadastrado no sistema.');
            } else {
                showAlert('error', 'Erro', error.message || 'Não foi possível cadastrar o usuário.');
            }
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const updateUser = async (
        id: string,
        userData: {
            name: string;
            cpf: string;
            role: AppRole;
            department: string;
            email?: string;
            tempPassword?: string;
            photoFile?: File | null;
            removePhoto?: boolean;
        }
    ): Promise<boolean> => {
        setActionLoading(true);
        let newAuthUserId: string | null = null;
        let uploadedPhotoUrl: string | null = null;
        let photoCommitted = false;
        try {
            const current = await sql`
                SELECT auth_user_id, photo_url FROM users
                WHERE id = ${id} AND role IN ('RH', 'LEADER', 'INSTRUCTOR')
                LIMIT 1
            `;
            const existingAuthId: string | null = current[0]?.auth_user_id ?? null;
            const currentPhotoUrl: string | null = current[0]?.photo_url ?? null;

            // Foto nova (sobe antes de criar login) ou remoção da foto atual
            let newPhotoUrl: string | null = currentPhotoUrl;
            if (userData.photoFile) {
                uploadedPhotoUrl = await uploadPhoto(userData.photoFile, id);
                newPhotoUrl = uploadedPhotoUrl;
            } else if (userData.removePhoto) {
                newPhotoUrl = null;
            }

            if (!existingAuthId && userData.email && userData.tempPassword) {
                const duplicateEmail = await sql`
                    SELECT 1 FROM users
                    WHERE lower(email) = lower(${userData.email}) AND id <> ${id}
                    LIMIT 1
                `;
                if (duplicateEmail.length > 0) {
                    throw new Error('Este e-mail já está cadastrado no sistema.');
                }

                newAuthUserId = await createAuthLogin({
                    name: userData.name,
                    email: userData.email,
                    password: userData.tempPassword,
                });
            }

            await sql`
                UPDATE users
                SET name = ${userData.name},
                    cpf = ${userData.cpf},
                    role = ${userData.role}::user_role,
                    department = ${userData.department},
                    email = COALESCE(${newAuthUserId ? userData.email!.trim().toLowerCase() : null}, email),
                    auth_user_id = COALESCE(${newAuthUserId}::uuid, auth_user_id),
                    photo_url = ${newPhotoUrl},
                    updated_at = now()
                WHERE id = ${id}
                  AND role IN ('RH', 'LEADER', 'INSTRUCTOR')
            `;
            photoCommitted = true;

            const finalAuthId = newAuthUserId || existingAuthId;

            if (finalAuthId) {
                await sql`
                    UPDATE "neon_auth"."user"
                    SET role = ${userData.role}
                    WHERE id = ${finalAuthId}::uuid
                `;
            }

            // Foto antiga só é apagada do Blob depois que o banco foi atualizado
            if (currentPhotoUrl && currentPhotoUrl !== newPhotoUrl) {
                deleteVercelFile(currentPhotoUrl).catch(() => { });
            }

            showAlert('success', 'Sucesso', 'Usuário atualizado com sucesso!');
            await fetchUsers();
            return true;
        } catch (error: any) {
            console.error('Erro ao atualizar usuário:', error);

            // Não deixa a foto nova órfã no Blob se a atualização falhou
            if (uploadedPhotoUrl && !photoCommitted) {
                deleteVercelFile(uploadedPhotoUrl).catch(() => { });
            }

            if (error?.code === '23505') {
                showAlert('error', 'Erro', 'CPF ou e-mail já cadastrado em outro usuário.');
            } else {
                showAlert('error', 'Erro', error.message || 'Não foi possível atualizar o usuário.');
            }
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const deleteUser = async (id: string): Promise<boolean> => {
        setActionLoading(true);
        try {
            const photoUrl = users.find((u) => u.id === id)?.photo_url ?? null;

            await sql`
                DELETE FROM users
                WHERE id = ${id}
                  AND role IN ('RH', 'LEADER', 'INSTRUCTOR')
            `;

            // Remove a foto do Blob junto com o usuário
            if (photoUrl) {
                deleteVercelFile(photoUrl).catch(() => { });
            }

            showAlert('success', 'Sucesso', 'Usuário excluído com sucesso!');
            await fetchUsers();
            return true;
        } catch (error: any) {
            console.error('Erro ao excluir usuário:', error);
            const msg = error.message?.toLowerCase() || '';
            if (error?.code === '23503' || msg.includes('foreign key')) {
                showAlert('error', 'Erro', 'Não é possível excluir: este usuário está vinculado a treinamentos como instrutor.');
            } else {
                showAlert('error', 'Erro', error.message || 'Não foi possível excluir o usuário.');
            }
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    const departmentOptions = useMemo(
        () =>
            Array.from(new Set(users.map((u) => u.department || 'Geral')))
                .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                .map((d) => ({ value: d, label: d })),
        [users]
    );

    const filteredUsers = useMemo(() => {
        const q = normalize(search);
        const qDigits = search.replace(/\D/g, '');
        const onlyNumbers = /^[\d.\-\s]+$/.test(search.trim());

        return users.filter((u) => {
            if (roleFilter && u.role !== roleFilter) return false;
            if (setorFilter && (u.department || 'Geral') !== setorFilter) return false;
            if (!q) return true;
            if (onlyNumbers) return !qDigits || (u.cpf || '').replace(/\D/g, '').includes(qDigits);
            return normalize(u.name).includes(q) || normalize(u.email || '').includes(q);
        });
    }, [users, search, roleFilter, setorFilter]);

    return {
        users,
        filteredUsers,
        departmentOptions,
        roleOptions: ROLE_OPTIONS,
        search,
        setSearch,
        roleFilter,
        setRoleFilter,
        setorFilter,
        setSetorFilter,
        loading,
        actionLoading,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
    };
}
