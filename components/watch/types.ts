export interface MyChannel {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  category: string;
  customCategory: string;
  coverUrl: string;
}

export interface CommentDto {
  id: string;
  text: string;
  timecodeSec: number | null;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    avatarEmoji: string;
    avatarColor: string;
  };
}
