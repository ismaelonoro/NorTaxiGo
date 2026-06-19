export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: { templates: number };
}

export interface Template {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  design: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count?: { instances: number };
}

export interface Instance {
  id: string;
  name: string;
  folderId?: string | null;
  folder?: Folder | null;
  templateId?: string;
  design: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Background {
  id: string;
  name: string;
  thumbnail: string;
  image?: string; // only present when fetched individually
  createdAt: string;
  updatedAt: string;
}

// Reusable image library entry (same shape as Background)
export interface Asset {
  id: string;
  name: string;
  thumbnail: string;
  image?: string; // only present when fetched individually
  createdAt: string;
  updatedAt: string;
}

export type DesignerMode = 'template' | 'instance';

export interface DesignerState {
  canvasJSON: string | null;
  thumbnail: string | null;
}
