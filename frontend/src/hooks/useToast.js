import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext';

const useToast = () => useContext(ToastContext);

export { useToast };
export default useToast;
