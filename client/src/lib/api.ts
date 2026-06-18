import axios from 'axios';
import type { Category, Template, Folder, Instance, Background } from '@/types';

const api = axios.create({ baseURL: '/api', withCredentials: true });

// Categories
export const getCategories = () => api.get<Category[]>('/categories').then((r) => r.data);
export const createCategory = (data: Partial<Category>) =>
  api.post<Category>('/categories', data).then((r) => r.data);
export const updateCategory = (id: string, data: Partial<Category>) =>
  api.put<Category>(`/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id: string) => api.delete(`/categories/${id}`);

// Templates
export const getTemplates = (categoryId?: string) =>
  api
    .get<Template[]>('/templates', { params: categoryId ? { categoryId } : undefined })
    .then((r) => r.data);
export const getTemplate = (id: string) =>
  api.get<Template>(`/templates/${id}`).then((r) => r.data);
export const createTemplate = (data: Partial<Template>) =>
  api.post<Template>('/templates', data).then((r) => r.data);
export const updateTemplate = (id: string, data: Partial<Template>) =>
  api.put<Template>(`/templates/${id}`, data).then((r) => r.data);
export const deleteTemplate = (id: string) => api.delete(`/templates/${id}`);

// Folders
export const getFolders = () => api.get<Folder[]>('/folders').then((r) => r.data);
export const createFolder = (data: Partial<Folder>) =>
  api.post<Folder>('/folders', data).then((r) => r.data);
export const updateFolder = (id: string, data: Partial<Folder>) =>
  api.put<Folder>(`/folders/${id}`, data).then((r) => r.data);
export const deleteFolder = (id: string) => api.delete(`/folders/${id}`);

// Instances
export const getInstances = (folderId?: string) =>
  api
    .get<Instance[]>('/instances', { params: folderId ? { folderId } : undefined })
    .then((r) => r.data);
export const getInstance = (id: string) =>
  api.get<Instance>(`/instances/${id}`).then((r) => r.data);
export const createInstance = (data: Partial<Instance>) =>
  api.post<Instance>('/instances', data).then((r) => r.data);
export const updateInstance = (id: string, data: Partial<Instance>) =>
  api.put<Instance>(`/instances/${id}`, data).then((r) => r.data);
export const deleteInstance = (id: string) => api.delete(`/instances/${id}`);

// Backgrounds (gallery)
export const getBackgrounds = () => api.get<Background[]>('/backgrounds').then((r) => r.data);
export const getBackground = (id: string) =>
  api.get<Background>(`/backgrounds/${id}`).then((r) => r.data);
export const createBackground = (data: { name: string; image: string; thumbnail: string }) =>
  api.post<Background>('/backgrounds', data).then((r) => r.data);
export const deleteBackground = (id: string) => api.delete(`/backgrounds/${id}`);

// AI
export const generateBackground = (prompt: string, style?: string) =>
  api
    .post<{ image: string }>('/ai/generate-background', { prompt, style })
    .then((r) => r.data.image);
