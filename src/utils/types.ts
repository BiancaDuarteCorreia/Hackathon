export interface AlertState {
    type: 'success' | 'error';
    title: string;
    message: string;
}