import { useState, useCallback, useMemo } from 'react';
import { sql, neonClient } from '../../lib/neon';

export interface TrainingData {
    id: string;
    title: string;
    startDate: string;
    capacity: number;
    enrolledCount: number;
    instructor: string;
    workloadHours: number;
    status: string;
}

export interface TeamMemberData {
    id: string;
    name: string;
    role: string;
    department: string;
}

// Registro de chamada (enrollments com status PRESENT/ABSENT) de colaboradores do setor do líder
export interface AttendanceRecord {
    id: string;
    userId: string;
    name: string;
    department: string;
    trainingTitle: string;
    trainingDate: string;
    status: 'PRESENT' | 'ABSENT';
}

// Matrícula de um colaborador do setor do líder em um treinamento (usada para permitir desvincular)
export interface TeamEnrollment {
    trainingId: string;
    userId: string;
    status: 'ENROLLED' | 'PRESENT' | 'ABSENT';
}

export type AlertType = 'success' | 'error' | 'warning';

// Remove acentos e ignora maiúsculas/minúsculas para as buscas por texto
const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Admin não pertence a um setor; para poder interagir com o portal, simulamos que ele é do setor Produção
export const SIMULATED_ADMIN_DEPARTMENT = 'Produção';

// Vagas restantes de um treinamento
export const getAvailableSlots = (t: TrainingData) => t.capacity - t.enrolledCount;

// Treinamento sem vagas ou já concluído (não aceita novas reservas)
export const isTrainingUnavailable = (t: TrainingData) =>
    getAvailableSlots(t) <= 0 || t.status === 'COMPLETED';

export function usePortalLider(
    showAlert: (type: AlertType, title: string, message: string) => void
) {
    const [trainings, setTrainings] = useState<TrainingData[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMemberData[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [enrollments, setEnrollments] = useState<TeamEnrollment[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [search, setSearch] = useState<string>('');
    const [memberSearch, setMemberSearch] = useState<string>('');
    const [leaderDepartment, setLeaderDepartment] = useState<string | null>(null);

    // Identifica o setor do líder através do ID local salvo no storage
    const resolveLeaderDepartment = useCallback(async (): Promise<string | null> => {
        try {
            const adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
            const sessionName: string | undefined = adminData.name;
            const sessionRole: string | undefined = adminData.role;
            const sessionDept: string | undefined = adminData.department;
            
            if (!sessionName) return null;

            // ADMIN não tem setor: simula o setor Produção para poder ver e usar o portal
            if (sessionRole === 'ADMIN') return SIMULATED_ADMIN_DEPARTMENT;
            if (!sessionDept) return null;

            const rows = await sql`
                SELECT
                    role::text as role,
                    COALESCE(NULLIF(TRIM(department), ''), 'Geral') as department
                FROM users
                WHERE lower(trim(name)) = lower(trim(${sessionName}))
                LIMIT 1
            `;
            const row = rows[0];
            if (!row) return null;
            // Cargo ADMIN gravado no banco também usa o setor simulado
            if (row.role === 'ADMIN') return SIMULATED_ADMIN_DEPARTMENT;
            return row.department ?? null;
        } catch (e) {
            return null;
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const department = await resolveLeaderDepartment();
            setLeaderDepartment(department);

            // Se não tiver departamento, zera tudo e para.
            if (!department) {
                setTrainings([]);
                setTeamMembers([]);
                setAttendance([]);
                setEnrollments([]);
                setLoading(false);
                return;
            }

            // Busca treinamentos abertos e calcula as vagas preenchidas via JOIN com enrollments
            const trainingsResult = await sql`
                SELECT
                    t.id,
                    t.title,
                    TO_CHAR(t.date_time, 'DD/MM/YYYY HH24:MI') as "startDate",
                    t.total_spots as capacity,
                    COALESCE(COUNT(e.id), 0)::int as "enrolledCount",
                    COALESCE(i.name, 'A Definir') as instructor,
                    t.workload_hours as "workloadHours",
                    t.status
                FROM trainings t
                LEFT JOIN users i ON t.instructor_id = i.id
                LEFT JOIN enrollments e ON t.id = e.training_id
                WHERE t.status = 'OPEN'
                GROUP BY t.id, i.name, t.date_time, t.total_spots, t.workload_hours, t.status
                ORDER BY t.date_time ASC
            `;

            const teamResult = await sql`
                SELECT id, name, role, department
                FROM users
                WHERE role = 'EMPLOYEE'
                    AND lower(trim(COALESCE(NULLIF(TRIM(department), ''), 'Geral'))) = lower(trim(${department}))
                ORDER BY name ASC
            `;

            const attendanceResult = await sql`
                SELECT
                    e.id,
                    u.id as "userId",
                    u.name,
                    COALESCE(NULLIF(TRIM(u.department), ''), 'Geral') as department,
                    t.title as "trainingTitle",
                    TO_CHAR(t.date_time, 'DD/MM/YYYY HH24:MI') as "trainingDate",
                    e.status::text as status
                FROM enrollments e
                JOIN users u ON u.id = e.user_id
                JOIN trainings t ON t.id = e.training_id
                WHERE e.status IN ('PRESENT', 'ABSENT')
                    AND u.role = 'EMPLOYEE'
                    AND lower(trim(COALESCE(NULLIF(TRIM(u.department), ''), 'Geral'))) = lower(trim(${department}))
                ORDER BY t.date_time DESC, u.name ASC
            `;

            const enrollmentsResult = await sql`
                SELECT
                    e.training_id::text as "trainingId",
                    e.user_id::text as "userId",
                    e.status::text as status
                FROM enrollments e
                JOIN users u ON u.id = e.user_id
                WHERE u.role = 'EMPLOYEE'
                    AND lower(trim(COALESCE(NULLIF(TRIM(u.department), ''), 'Geral'))) = lower(trim(${department}))
            `;

            setTrainings(trainingsResult as TrainingData[]);
            setTeamMembers(teamResult as TeamMemberData[]);
            setAttendance(attendanceResult as AttendanceRecord[]);
            setEnrollments(enrollmentsResult as TeamEnrollment[]);
        } catch (error: any) {
            console.error('Erro ao carregar dados do líder:', error);
            showAlert('error', 'Erro', 'Falha ao carregar treinamentos ou equipe.');
        } finally {
            setLoading(false);
        }
    }, [showAlert, resolveLeaderDepartment]);

    const enrollMembers = async (trainingId: string, memberIds: string[]): Promise<boolean> => {
        if (!trainingId || memberIds.length === 0) return false;

        // Só aceita colaboradores do setor do líder (a lista já vem filtrada por setor)
        const allowedIds = new Set(teamMembers.map((m) => String(m.id)));
        if (memberIds.some((id) => !allowedIds.has(String(id)))) {
            showAlert('error', 'Erro', 'Há colaboradores selecionados que não pertencem ao seu setor.');
            return false;
        }

        setActionLoading(true);

        try {
            // Quem já está matriculado não consome uma nova vaga
            const existing = await sql`
                SELECT user_id::text as user_id
                FROM enrollments
                WHERE training_id = ${trainingId}
            `;
            const alreadyEnrolled = new Set(existing.map((row: any) => String(row.user_id)));
            const newMemberIds = memberIds.filter((id) => !alreadyEnrolled.has(String(id)));

            if (newMemberIds.length === 0) {
                showAlert('warning', 'Atenção', 'Os colaboradores selecionados já estão inscritos neste treinamento.');
                return false;
            }

            // Validação de vagas
            const spotCheck = await sql`
                SELECT (total_spots - (SELECT COUNT(*) FROM enrollments WHERE training_id = ${trainingId}))::int as available_spots
                FROM trainings
                WHERE id = ${trainingId}
            `;
            const availableSpots = spotCheck[0]?.available_spots || 0;

            if (newMemberIds.length > availableSpots) {
                showAlert(
                    'error',
                    'Vagas Insuficientes',
                    `Você tentou inscrever ${newMemberIds.length} pessoas, mas só há ${availableSpots} vagas.`
                );
                return false;
            }

            // Insere as matrículas ignorando duplicatas
            for (const userId of newMemberIds) {
                await sql`
                    INSERT INTO enrollments (training_id, user_id, status)
                    VALUES (${trainingId}, ${userId}, 'ENROLLED')
                    ON CONFLICT (training_id, user_id) DO NOTHING
                `;
            }

            showAlert('success', 'Sucesso', `${newMemberIds.length} colaborador(es) escalado(s) com sucesso.`);
            await fetchData(); // Atualiza os badges de vagas
            return true;
        } catch (error: any) {
            console.error('Erro ao inscrever equipe:', error);
            showAlert('error', 'Erro', 'Não foi possível efetuar a reserva de vagas.');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    // Desvincula um colaborador do setor de um treinamento (só enquanto a inscrição ainda está como ENROLLED)
    const unenrollMember = async (trainingId: string, userId: string): Promise<boolean> => {
        if (!trainingId || !userId) return false;

        const member = teamMembers.find((m) => String(m.id) === String(userId));
        if (!member) {
            showAlert('error', 'Erro', 'Este colaborador não pertence ao seu setor.');
            return false;
        }

        setActionLoading(true);

        try {
            const removed = await sql`
                DELETE FROM enrollments
                WHERE training_id = ${trainingId}
                    AND user_id = ${userId}
                    AND status = 'ENROLLED'
                RETURNING id
            `;

            if (removed.length === 0) {
                showAlert(
                    'warning',
                    'Atenção',
                    'Não foi possível desvincular: a inscrição não existe mais ou a chamada já foi registrada.'
                );
                await fetchData();
                return false;
            }

            showAlert('success', 'Sucesso', `${member.name} foi desvinculado(a) do treinamento.`);
            await fetchData(); // Atualiza os badges de vagas
            return true;
        } catch (error: any) {
            console.error('Erro ao desvincular colaborador:', error);
            showAlert('error', 'Erro', 'Não foi possível desvincular o colaborador.');
            return false;
        } finally {
            setActionLoading(false);
        }
    };

    // Busca por título ou instrutor
    const filteredTrainings = useMemo(() => {
        const q = normalize(search);

        return trainings.filter((t) => {
            if (!q) return true;
            return normalize(t.title).includes(q) || normalize(t.instructor).includes(q);
        });
    }, [trainings, search]);

    // Busca de colaboradores dentro do modal de escalação
    const filteredMembers = useMemo(() => {
        const q = normalize(memberSearch);
        if (!q) return teamMembers;
        return teamMembers.filter(
            (m) => normalize(m.name).includes(q) || normalize(m.department || '').includes(q)
        );
    }, [teamMembers, memberSearch]);

    // Números dos cards de KPI
    const stats = useMemo(() => {
        const available = trainings.reduce((sum, t) => sum + Math.max(getAvailableSlots(t), 0), 0);
        const present = attendance.filter((a) => a.status === 'PRESENT').length;
        const absent = attendance.filter((a) => a.status === 'ABSENT').length;
        const called = present + absent;
        return {
            presentCount: present,
            absentCount: absent,
            attendanceRate: called > 0 ? Math.round((present / called) * 100) : 0,
            totalTrainings: trainings.length,
            availableSlots: available,
            teamSize: teamMembers.length,
        };
    }, [trainings, teamMembers, attendance]);

    return {
        trainings,
        filteredTrainings,
        teamMembers,
        leaderDepartment,
        attendance,
        enrollments,
        filteredMembers,
        stats,
        search,
        setSearch,
        memberSearch,
        setMemberSearch,
        loading,
        actionLoading,
        fetchData,
        enrollMembers,
        unenrollMember,
    };
}