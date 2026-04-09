export interface UserAccountView {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl: string | null;
  usedStorageBytes: number;
  maxStorageBytes: number;
  createdAt: string;
}
