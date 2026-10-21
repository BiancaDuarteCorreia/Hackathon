import { useState, useCallback } from 'react';
import { sql } from '../../lib/neon';

export interface VerifiedCertificate {
  code: string;
  employeeName: string;
  department: string;
  trainingTitle: string;
  workloadHours: number;
  completionDate: string;
  instructorName: string;
  attendancePhotoUrl: string | null;
}

export function useValidacaoPublica(showAlert?: (type: 'success' | 'error' | 'warning', title: string, msg: string) => void) {
  const [verifiedCert, setVerifiedCert] = useState<VerifiedCertificate | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const validateCertificate = useCallback(async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    
    if (!cleanCode) {
      showAlert?.('warning', 'Atenção', 'Por favor, insira o código do certificado.');
      return;
    }

    setLoading(true);
    setSearched(true);
    setVerifiedCert(null);

    try {
      // Consulta pública por código de verificação para atestar autenticidade[cite: 31]
      const result = await sql`
        SELECT 
          e.certificate_code as code,
          e.attendance_photo_url as "attendancePhotoUrl",
          u.name as "employeeName",
          u.department,
          t.title as "trainingTitle",
          t.workload_hours as "workloadHours",
          TO_CHAR(t.date_time, 'DD/MM/YYYY') as "completionDate",
          COALESCE(i.name, 'Não Informado') as "instructorName"
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN trainings t ON e.training_id = t.id
        LEFT JOIN users i ON t.instructor_id = i.id
        WHERE e.certificate_code = ${cleanCode}
          AND e.status = 'PRESENT'
        LIMIT 1
      `;

      if (result && result.length > 0) {
        setVerifiedCert(result[0] as VerifiedCertificate);
      } else {
        setVerifiedCert(null);
      }
    } catch (error) {
      console.error("Erro ao validar certificado:", error);
      showAlert?.('error', 'Erro', 'Falha ao conectar com o validador. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  return { verifiedCert, loading, searched, validateCertificate };
}