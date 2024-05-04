import { PropsWithChildren, createContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { User } from '../lib/model';
import { repo } from '../lib/repo';

export const AuthContext = createContext<User | undefined>(undefined);

const AuthProvider = ({ children }: PropsWithChildren<any>) => {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    repo
      .getUser()
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => toast.error('Failed to fetch user.'));
  }, []);

  return (
    <AuthContext.Provider value={user}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
