import { useState, useCallback, useMemo } from 'react';
import { sql } from '../../lib/neon';

export type StoredStatus = 'OPEN' | 'COMPLETED';
export type TrainingPhase = 'OPEN' | 'SOLD_OUT' | 'IN_PROGRESS' | 'COMPLETED';

export interface DashboardTraining {
  id: string;
  title: string;
  description: string | null;
  category: string;
  instructorId: string | null;
  instructorName: string;
  workloadHours: number;
  startDate: string; // DD/MM/YYYY HH:mm
  startDateISO: string; // YYYY-MM-DD
  dateTimeISO: string; // YYYY-MM-DD HH24:MI:SS (usado para popular edição)
  capacity: number;
  enrolledCount: number;
  presentCount: number;
  status: StoredStatus;
  hasStarted: boolean;
  phase: TrainingPhase;
}

type RawTraining = Omit<DashboardTraining, 'hasStarted' | 'phase'>;

export interface DashboardIndicators {
  openTrainings: number; 
  inProgressTrainings: number; 
  availableSpots: number; 
  absenceRate: number; 
}

export interface AbsenceByTraining {
  id: string;
  title: string;
  startDate: string;
  enrolled: number;
  present: number;
  absent: number;
  rate: number; 
}

export interface InstructorSelect {
  id: string;
  name: string;
}

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  OPEN: 'Inscrições Abertas',
  SOLD_OUT: 'Esgotado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
};

export const PHASE_OPTIONS: { value: TrainingPhase; label: string }[] = [
  { value: 'OPEN', label: PHASE_LABELS.OPEN },
  { value: 'SOLD_OUT', label: PHASE_LABELS.SOLD_OUT },
  { value: 'IN_PROGRESS', label: PHASE_LABELS.IN_PROGRESS },
  { value: 'COMPLETED', label: PHASE_LABELS.COMPLETED },
];

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const toISO = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const todayISO = () => toISO(new Date());

const ABSENCE_CHART_LIMIT = 8;

const withPhase = (t: RawTraining, today: string): DashboardTraining => {
  if (t.status === 'COMPLETED') return { ...t, hasStarted: true, phase: 'COMPLETED' };
  
  const hasStarted = t.startDateISO <= today;
  if (hasStarted) return { ...t, hasStarted, phase: 'IN_PROGRESS' };
  
  if (t.enrolledCount >= t.capacity) return { ...t, hasStarted: false, phase: 'SOLD_OUT' };
  
  return { ...t, hasStarted: false, phase: 'OPEN' };
};

export function useDashboardRH(
  showAlert?: (type: 'success' | 'error', title: string, msg: string) => void
) {
  const [rawTrainings, setRawTrainings] = useState<RawTraining[]>([]);
  const [instructors, setInstructors] = useState<InstructorSelect[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TrainingPhase | undefined>(undefined);
  const [instructorFilter, setInstructorFilter] = useState<string | undefined>(undefined);

  const trainings = useMemo(() => {
    const today = todayISO();
    return rawTrainings.map((t) => withPhase(t, today));
  }, [rawTrainings]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const trainingsResult = await sql`
        SELECT
          t.id,
          t.title,
          t.description,
          'Segurança (NRs)' as category,
          t.workload_hours as "workloadHours",
          TO_CHAR(t.date_time, 'DD/MM/YYYY HH24:MI') as "startDate",
          TO_CHAR(t.date_time, 'YYYY-MM-DD') as "startDateISO",
          TO_CHAR(t.date_time, 'YYYY-MM-DD HH24:MI:SS') as "dateTimeISO",
          t.total_spots as capacity,
          t.status,
          t.instructor_id as "instructorId",
          COALESCE(i.name, 'Não atribuído') as "instructorName",
          COALESCE(COUNT(e.id), 0)::int as "enrolledCount",
          COUNT(e.id) FILTER (WHERE e.status = 'PRESENT')::int as "presentCount"
        FROM trainings t
        LEFT JOIN users i ON t.instructor_id = i.id
        LEFT JOIN enrollments e ON t.id = e.training_id
        GROUP BY t.id, i.name, t.date_time
        ORDER BY t.date_time DESC
      `;

      // Apenas instrutores
      const instructorsResult = await sql`
        SELECT id, name FROM users WHERE role = 'INSTRUCTOR' ORDER BY name ASC
      `;

      setRawTrainings(trainingsResult as RawTraining[]);
      setInstructors(instructorsResult as InstructorSelect[]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      showAlert?.('error', 'Erro', 'Falha ao carregar indicadores do RH.');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  const fetchTrainingEnrollments = async (trainingId: string) => {
    try {
      const data = await sql`
        SELECT u.id, u.name, u.department, e.status
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        WHERE e.training_id = ${trainingId}
        ORDER BY u.name ASC
      `;
      return data;
    } catch (error) {
      console.error('Erro ao buscar inscritos:', error);
      showAlert?.('error', 'Erro', 'Não foi possível carregar a lista de inscritos.');
      return [];
    }
  };

  const createTraining = async (data: {
    title: string;
    description: string;
    dateTime: string;
    spots: number;
    workload: number;
    instructorId: string;
  }): Promise<boolean> => {
    setActionLoading(true);
    try {
      await sql`
        INSERT INTO trainings (title, description, date_time, total_spots, workload_hours, instructor_id, status)
        VALUES (
          ${data.title},
          ${data.description || null},
          ${data.dateTime},
          ${data.spots},
          ${data.workload},
          ${data.instructorId},
          'OPEN'
        )
      `;
      showAlert?.('success', 'Sucesso', 'Treinamento criado com sucesso!');
      await fetchDashboardData();
      return true;
    } catch (error: any) {
      console.error('Erro ao criar treinamento:', error);
      showAlert?.('error', 'Erro', error?.message || 'Não foi possível cadastrar o treinamento.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateTraining = async (id: string, data: {
    title: string;
    description: string;
    dateTime: string;
    spots: number;
    workload: number;
    instructorId: string;
  }): Promise<boolean> => {
    setActionLoading(true);
    try {
      await sql`
        UPDATE trainings
        SET title = ${data.title},
            description = ${data.description || null},
            date_time = ${data.dateTime},
            total_spots = ${data.spots},
            workload_hours = ${data.workload},
            instructor_id = ${data.instructorId},
            updated_at = NOW()
        WHERE id = ${id}
      `;
      showAlert?.('success', 'Sucesso', 'Treinamento atualizado com sucesso!');
      await fetchDashboardData();
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar treinamento:', error);
      showAlert?.('error', 'Erro', error?.message || 'Não foi possível atualizar o treinamento.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteTraining = async (id: string): Promise<boolean> => {
    setActionLoading(true);
    try {
      await sql`DELETE FROM trainings WHERE id = ${id}`;
      showAlert?.('success', 'Sucesso', 'Treinamento excluído com sucesso!');
      await fetchDashboardData();
      return true;
    } catch (error: any) {
      console.error('Erro ao excluir treinamento:', error);
      showAlert?.('error', 'Erro', 'Não foi possível excluir o treinamento.');
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const updateTrainingStatus = async (id: string, newStatus: StoredStatus): Promise<void> => {
    const current = rawTrainings.find((t) => t.id === id);
    if (!current || current.status === newStatus) return;

    setTogglingId(id);
    try {
      await sql`UPDATE trainings SET status = ${newStatus} WHERE id = ${id}`;
      setRawTrainings((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
      showAlert?.('success', 'Status Atualizado', `Treinamento atualizado com sucesso.`);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showAlert?.('error', 'Erro', 'Falha ao alterar o status do treinamento.');
    } finally {
      setTogglingId(null);
    }
  };

  const indicators = useMemo<DashboardIndicators>(() => {
    const open = trainings.filter((t) => t.phase === 'OPEN');
    const concluded = trainings.filter((t) => t.phase === 'COMPLETED');

    const reservations = concluded.reduce((acc, t) => acc + t.enrolledCount, 0);
    const absences = concluded.reduce((acc, t) => acc + Math.max(0, t.enrolledCount - t.presentCount), 0);

    return {
      openTrainings: trainings.filter(t => t.phase === 'OPEN' || t.phase === 'SOLD_OUT').length,
      inProgressTrainings: trainings.filter((t) => t.phase === 'IN_PROGRESS').length,
      availableSpots: open.reduce((acc, t) => acc + Math.max(0, t.capacity - t.enrolledCount), 0),
      absenceRate: reservations > 0 ? Math.round((absences / reservations) * 1000) / 10 : 0,
    };
  }, [trainings]);

  const absenceByTraining = useMemo<AbsenceByTraining[]>(() => {
    return trainings
      .filter((t) => t.phase === 'COMPLETED' && t.enrolledCount > 0)
      .sort((a, b) => b.startDateISO.localeCompare(a.startDateISO))
      .slice(0, ABSENCE_CHART_LIMIT)
      .map((t) => {
        const present = Math.min(t.presentCount, t.enrolledCount);
        const absent = t.enrolledCount - present;
        return {
          id: t.id,
          title: t.title,
          startDate: t.startDate,
          enrolled: t.enrolledCount,
          present,
          absent,
          rate: Math.round((absent / t.enrolledCount) * 1000) / 10,
        };
      });
  }, [trainings]);

  const instructorOptions = useMemo(() => {
    const map = new Map<string, string>();
    trainings.forEach((t) => {
      if (t.instructorId) map.set(t.instructorId, t.instructorName);
    });
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label, 'pt-BR')
    );
  }, [trainings]);

  const filteredTrainings = useMemo(() => {
    const q = normalize(search);

    return trainings.filter((t) => {
      if (statusFilter && t.phase !== statusFilter) return false;
      if (instructorFilter && t.instructorId !== instructorFilter) return false;
      if (!q) return true;
      return normalize(t.title).includes(q) || normalize(t.instructorName).includes(q);
    });
  }, [trainings, search, statusFilter, instructorFilter]);

  return {
    trainings,
    filteredTrainings,
    indicators,
    absenceByTraining,
    instructors,
    instructorOptions,
    statusOptions: PHASE_OPTIONS,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    instructorFilter,
    setInstructorFilter,
    loading,
    actionLoading,
    togglingId,
    fetchDashboardData,
    fetchTrainingEnrollments,
    createTraining,
    updateTraining,
    deleteTraining,
    updateTrainingStatus,
  };
}