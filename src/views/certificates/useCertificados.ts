import { useState, useCallback, useMemo } from 'react';
import { sql } from '../../lib/neon';

export interface Certificate {
  id: string;
  code: string;
  employeeName: string;
  department: string;
  trainingTitle: string;
  workloadHours: number;
  issueDate: string;
  instructorName: string;
  attendancePhotoUrl: string | null;
  isValid: boolean;
}

// Remove acentos e ignora maiúsculas/minúsculas para as buscas por texto
const normalize = (value: string) =>
  (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Alfabeto sem caracteres ambíguos (sem 0/O e 1/I), para o código ser fácil de ler e digitar
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

// Gera um código de validação no formato CERT-2026-X89B4K
// (32 símbolos dividem 256 igualmente, então não há viés no sorteio)
export const generateCertificateCode = (year: number = new Date().getFullYear()): string => {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `CERT-${year}-${suffix}`;
};

export function useCertificados(showAlert?: (type: 'success' | 'error', title: string, msg: string) => void) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  // Emite o código de validação para toda presença confirmada que ainda não tem um.
  // O código é único (constraint no banco): se houver colisão, sorteia outro.
  const issueMissingCodes = useCallback(async (): Promise<number> => {
    const pending = await sql`
      SELECT id::text as id
      FROM enrollments
      WHERE status = 'PRESENT'
        AND (certificate_code IS NULL OR TRIM(certificate_code) = '')
    `;

    let issued = 0;

    for (const row of pending) {
      for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
        try {
          // A condição no WHERE evita sobrescrever um código emitido por outra sessão ao mesmo tempo
          const updated = await sql`
            UPDATE enrollments
            SET certificate_code = ${generateCertificateCode()}, updated_at = now()
            WHERE id = ${row.id}
              AND (certificate_code IS NULL OR TRIM(certificate_code) = '')
            RETURNING id
          `;
          if (updated.length > 0) issued += 1;
          break;
        } catch (error: any) {
          // 23505 = código já existe (unique_violation): tenta com outro código
          if (error?.code !== '23505') throw error;
        }
      }
    }

    return issued;
  }, []);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    try {
      // Garante que toda presença confirmada tenha código antes de listar
      try {
        const issued = await issueMissingCodes();
        if (issued > 0) {
          showAlert?.('success', 'Sucesso', `${issued} código(s) de validação gerado(s).`);
        }
      } catch (error) {
        console.error('Erro ao gerar códigos de validação:', error);
        showAlert?.('error', 'Erro', 'Não foi possível gerar alguns códigos de validação.');
      }

      // Busca todos os certificados emitidos unindo os dados do colaborador, treinamento e instrutor
      const result = await sql`
        SELECT
          e.id,
          e.certificate_code as code,
          u.name as "employeeName",
          COALESCE(NULLIF(TRIM(u.department), ''), 'Geral') as department,
          t.title as "trainingTitle",
          t.workload_hours as "workloadHours",
          t.date_time as "issueDate",
          COALESCE(i.name, 'Não Informado') as "instructorName",
          e.attendance_photo_url as "attendancePhotoUrl"
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN trainings t ON e.training_id = t.id
        LEFT JOIN users i ON t.instructor_id = i.id
        WHERE e.certificate_code IS NOT NULL
          AND TRIM(e.certificate_code) <> ''
          AND e.status = 'PRESENT'
        ORDER BY t.date_time DESC, u.name ASC
      `;

      const mappedCertificates = result.map((row: any) => ({
        ...row,
        isValid: true, // Se tem o código de certificado e presença confirmada, é válido
      }));

      setCertificates(mappedCertificates as Certificate[]);
    } catch (error) {
      console.error('Erro ao carregar certificados:', error);
      showAlert?.('error', 'Erro', 'Não foi possível carregar a lista de certificados.');
    } finally {
      setLoading(false);
    }
  }, [showAlert, issueMissingCodes]);

  // Busca por colaborador, treinamento, setor ou código
  const filteredCertificates = useMemo(() => {
    const q = normalize(search);
    if (!q) return certificates;
    return certificates.filter(
      (c) =>
        normalize(c.employeeName).includes(q) ||
        normalize(c.trainingTitle).includes(q) ||
        normalize(c.department).includes(q) ||
        normalize(c.code).includes(q)
    );
  }, [certificates, search]);

  return { certificates, filteredCertificates, search, setSearch, loading, fetchCertificates };
}
