import { useState, useCallback, useMemo, useEffect } from 'react';
import { sql } from '../../lib/neon';

export type AttendanceStatus = 'ENROLLED' | 'PRESENT' | 'ABSENT';

export interface InstructorTraining {
    id: string;
    title: string;
    date_time: string;
}

export interface StudentAttendee {
    enrollment_id: string;
    user_id: string;
    name: string;
    department: string;
    status: AttendanceStatus;
    db_photo_url: string | null; // Foto original do cadastro
    attendance_photo_url: string | null; // Foto tirada na hora da chamada
}

const normalize = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
    { value: 'ENROLLED', label: 'Pendente' },
    { value: 'PRESENT', label: 'Presente' },
    { value: 'ABSENT', label: 'Ausente' },
];

export function usePainelInstrutor(
    showAlert: (type: 'success' | 'error', title: string, message: string) => void
) {
    const [myTrainings, setMyTrainings] = useState<InstructorTraining[]>([]);
    const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
    const [attendees, setAttendees] = useState<StudentAttendee[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [search, setSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<AttendanceStatus | undefined>(undefined);

    // 1. Busca os treinamentos atribuídos ao instrutor logado (ou TODOS se for ADMIN)
    const fetchMyTrainings = useCallback(async () => {
        setLoading(true);
        try {
            const adminData = JSON.parse(localStorage.getItem('admin_data') || '{}');
            const userId = adminData.id;
            const userRole = adminData.role;

            if (!userId) throw new Error('Usuário não identificado na sessão.');

            let data;

            // Se for ADMIN, traz todos os treinamentos abertos no sistema
            if (userRole === 'ADMIN') {
                data = await sql`
                    SELECT id, title, TO_CHAR(date_time, 'DD/MM/YYYY HH24:MI') as date_time
                    FROM trainings
                    WHERE status != 'COMPLETED'
                    ORDER BY date_time ASC
                `;
            } else {
                // Se for INSTRUTOR, traz apenas os atribuídos a ele
                data = await sql`
                    SELECT id, title, TO_CHAR(date_time, 'DD/MM/YYYY HH24:MI') as date_time
                    FROM trainings
                    WHERE instructor_id = ${userId} AND status != 'COMPLETED'
                    ORDER BY date_time ASC
                `;
            }
            
            setMyTrainings(data as InstructorTraining[]);
            if (data.length > 0 && !selectedTrainingId) {
                setSelectedTrainingId((data as InstructorTraining[])[0].id);
            }
        } catch (error: any) {
            console.error('Erro ao buscar treinamentos:', error);
            showAlert('error', 'Erro', 'Falha ao carregar seus treinamentos.');
        } finally {
            setLoading(false);
        }
    }, [showAlert, selectedTrainingId]);

    // 2. Busca os alunos do treinamento selecionado
    const fetchAttendees = useCallback(async () => {
        if (!selectedTrainingId) {
            setAttendees([]);
            return;
        }
        setLoading(true);
        try {
            const data = await sql`
                SELECT
                    e.id as enrollment_id,
                    e.status,
                    u.id as user_id,
                    u.name,
                    u.department,
                    u.photo_url as db_photo_url,
                    e.attendance_photo_url
                FROM enrollments e
                JOIN users u ON e.user_id = u.id
                WHERE e.training_id = ${selectedTrainingId}
                ORDER BY u.name ASC
            `;
            setAttendees(data as StudentAttendee[]);
        } catch (error: any) {
            console.error('Erro ao buscar alunos inscritos:', error);
            showAlert('error', 'Erro', 'Falha ao carregar a lista de presença.');
        } finally {
            setLoading(false);
        }
    }, [selectedTrainingId, showAlert]);

    useEffect(() => {
        fetchMyTrainings();
    }, [fetchMyTrainings]);

    useEffect(() => {
        fetchAttendees();
    }, [fetchAttendees]);

    const updateAttendance = async (enrollmentId: string, status: AttendanceStatus): Promise<boolean> => {
        setUpdatingId(enrollmentId);
        try {
            let certCode: string | null = null;
            let mockPhotoUrl: string | null = null;

            if (status === 'PRESENT') {
                const randomHash = Math.random().toString(36).substring(2, 6).toUpperCase();
                certCode = `CERT-${new Date().getFullYear()}-${randomHash}`;
                mockPhotoUrl = 'https://picsum.photos/id/177/200/200'; // Simulação de snapshot da webcam
            }

            await sql`
                UPDATE enrollments
                SET
                    status = ${status}::enrollment_status,
                    certificate_code = CASE WHEN ${status}::text = 'PRESENT' THEN COALESCE(certificate_code, ${certCode}) ELSE NULL END,
                    attendance_photo_url = CASE WHEN ${status}::text = 'PRESENT' THEN COALESCE(attendance_photo_url, ${mockPhotoUrl}) ELSE NULL END,
                    updated_at = NOW()
                WHERE id = ${enrollmentId}
            `;

            setAttendees((prev) =>
                prev.map((item) =>
                    item.enrollment_id === enrollmentId
                        ? { ...item, status, attendance_photo_url: status === 'PRESENT' ? item.attendance_photo_url ?? mockPhotoUrl : null }
                        : item
                )
            );

            showAlert('success', 'Sucesso', 'Presença salva com sucesso.');
            return true;
        } catch (error: any) {
            console.error('Erro ao atualizar status:', error);
            showAlert('error', 'Erro', 'Não foi possível salvar a presença.');
            return false;
        } finally {
            setUpdatingId(null);
        }
    };

    const finishTraining = async (): Promise<boolean> => {
        if (!selectedTrainingId) return false;
        setLoading(true);
        try {
            await sql`
                UPDATE trainings SET status = 'COMPLETED' WHERE id = ${selectedTrainingId}
            `;
            showAlert('success', 'Treinamento Finalizado', 'O treinamento foi encerrado e os certificados estão disponíveis.');
            setSelectedTrainingId(null);
            await fetchMyTrainings();
            return true;
        } catch (error: any) {
            console.error('Erro ao finalizar treinamento:', error);
            showAlert('error', 'Erro', 'Não foi possível finalizar o treinamento.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const filteredAttendees = useMemo(() => {
        const q = normalize(search);
        return attendees.filter((a) => {
            if (statusFilter && a.status !== statusFilter) return false;
            if (!q) return true;
            return normalize(a.name).includes(q) || normalize(a.department || '').includes(q);
        });
    }, [attendees, search, statusFilter]);

    const stats = useMemo(
        () => ({
            total: attendees.length,
            present: attendees.filter((a) => a.status === 'PRESENT').length,
            absent: attendees.filter((a) => a.status === 'ABSENT').length,
            pending: attendees.filter((a) => a.status === 'ENROLLED').length,
        }),
        [attendees]
    );

    const activeTrainingTitle = useMemo(() => {
        return myTrainings.find(t => t.id === selectedTrainingId)?.title || '';
    }, [myTrainings, selectedTrainingId]);

    return {
        myTrainings,
        selectedTrainingId,
        setSelectedTrainingId,
        attendees,
        filteredAttendees,
        stats,
        activeTrainingTitle,
        statusOptions: STATUS_OPTIONS,
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        loading,
        updatingId,
        fetchAttendees,
        updateAttendance,
        finishTraining
    };
}