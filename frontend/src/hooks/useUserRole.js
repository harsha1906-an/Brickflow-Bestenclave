import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

export function useUserRole() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const role = currentAdmin?.role?.toUpperCase() || '';
  return { role };
}
