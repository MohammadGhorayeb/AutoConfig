export interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  role_context: string | null;
  created_at: string;
  updated_at: string;
}