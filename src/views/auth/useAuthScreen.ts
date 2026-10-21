import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { neonClient, sql } from '../../lib/neon';

export function useAuthAPI() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);

    const login = async (email: string, password: string): Promise<void> => {
        setLoading(true);
        try {
            const response = await neonClient.auth.signIn.email({ email, password });
            if (response?.error) throw new Error('E-mail ou senha inválidos.');
            
            if (response?.data?.token) {
                localStorage.setItem('admin_token', response.data.token);
            }

            try {
                // CORREÇÃO 1: Removido photo_url pois não existe na tabela users
                // CORREÇÃO 2: Busca feita pelo e-mail em vez do nome
                const dbUser = await sql`
                    SELECT id, name, role, department 
                    FROM users 
                    WHERE lower(email) = lower(${email}) 
                    LIMIT 1
                `;

                if (dbUser && dbUser.length > 0) {
                    localStorage.setItem('admin_data', JSON.stringify(dbUser[0]));
                } else {
                    const fallbackUser = { 
                        name: response.data?.user?.name || 'Administrador', 
                        role: response.data?.user?.role || 'ADMIN', 
                        department: 'Administração Sistema' 
                    };
                    localStorage.setItem('admin_data', JSON.stringify(fallbackUser));
                }
            } catch (dbError) {
                console.warn("Aviso ao buscar dados do usuário no banco:", dbError);
                localStorage.setItem('admin_data', JSON.stringify({ role: 'ADMIN', name: 'Administrador' }));
            }

            const savedData = JSON.parse(localStorage.getItem('admin_data') || '{}');
            const userRole = savedData.role;

            if (userRole === 'INSTRUCTOR') {
                navigate('/instrutor');
            } else if (userRole === 'LEADER') {
                navigate('/lider');
            } else {
                navigate('/rh');
            }
            
        } catch (error: any) {
        } finally {
            setLoading(false);
        }
    };

    return { login, loading };
}

export function useRegisterAPI(
    onSuccess: () => void
) {
    const [loading, setLoading] = useState<boolean>(false);

    const register = async (name: string, email: string, password: string): Promise<void> => {
        setLoading(true);
        try {
            const response = await neonClient.auth.signUp.email({ email, password, name });
            if (response?.error) throw new Error(response.error.message || 'Erro ao criar conta.');

            try {
                // Adicionado o email no insert
                await sql`
                    INSERT INTO users (name, email, role, department) 
                    VALUES (${name}, ${email.toLowerCase()}, 'ADMIN'::user_role, 'Administração Geral')
                    ON CONFLICT DO NOTHING
                `;
            } catch (dbError) {
                console.error("Erro ao registrar perfil de admin na tabela users:", dbError);
            }

            onSuccess();
        } catch (error: any) {
        } finally {
            setLoading(false);
        }
    };

    return { register, loading };
}