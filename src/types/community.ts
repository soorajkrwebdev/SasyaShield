export type CommunityCategory =
  | 'Pest & Diseases'
  | 'Organic Farming'
  | 'Fertilizers & Manure'
  | 'Pesticide Safety'
  | 'Crop Management'
  | 'Irrigation & Soil Health'
  | 'Market & Pricing'
  | 'General Farming';

export interface CommunityAuthor {
  id: string;
  full_name: string;
  state?: string;
  district?: string;
  village?: string;
  farming_type?: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: CommunityCategory;
  crop?: string | null;
  location?: string | null;
  image_urls: string[];
  is_best_answer_selected: boolean;
  created_at: string;
  updated_at: string;
  author?: CommunityAuthor;
  like_count?: number;
  user_liked?: boolean;
}

export interface CommunityAnswer {
  id: string;
  post_id: string;
  parent_answer_id?: string | null;
  user_id: string;
  content: string;
  image_urls: string[];
  is_best: boolean;
  created_at: string;
  updated_at: string;
  author?: CommunityAuthor;
  like_count?: number;
  user_liked?: boolean;
  replies?: CommunityAnswer[];
}

export interface CommunityLike {
  id: string;
  user_id: string;
  post_id?: string | null;
  answer_id?: string | null;
  created_at: string;
}

export interface CommunityReport {
  id: string;
  reporter_id: string;
  post_id?: string | null;
  answer_id?: string | null;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface ImageFile {
  file: File;
  path?: string;
  signedUrl?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
}
