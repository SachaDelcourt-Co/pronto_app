import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  authInitialized: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  authInitialized: false,
});

export const useAuth = () => useContext(AuthContext); 