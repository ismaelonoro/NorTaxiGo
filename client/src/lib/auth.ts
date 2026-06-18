import axios from 'axios';

export async function login(username: string, password: string) {
  await axios.post('/api/auth/login', { username, password }, { withCredentials: true });
}

export async function logout() {
  await axios.post('/api/auth/logout', {}, { withCredentials: true });
}

export async function checkAuth(): Promise<boolean> {
  try {
    const { data } = await axios.get('/api/auth/me', { withCredentials: true });
    return data.authenticated;
  } catch {
    return false;
  }
}
