/**
 * Utilitários e formatadores gerais da aplicação Lins Agroindustrial
 */

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export const formatHours = (hours: number): string => {
  return `${hours}h`;
};

export const formatDocument = (doc: string): string => {
  return doc || '';
};
