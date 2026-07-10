export interface MyChannel {
  id: string;
  name: string;
  emoji: string;
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
