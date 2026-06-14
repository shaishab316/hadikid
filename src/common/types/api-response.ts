import { Pagination } from './pagination';

export type ApiResponse<T = any> = Partial<{
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  pagination: Pagination;
  meta: Record<string, any>;
}>;
