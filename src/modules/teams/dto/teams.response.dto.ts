export class TeamsResponseDto {
  teamId: string = '';
  teamName: string = '';

  clubId: string = '';
  teamImage: string = '';
  ipAddress: string = '';

  blackList: string[] = [];

  createdBy: string = '';
  isApproved: boolean = false;
  isPrivate: boolean = false;
  isDeleted: boolean = false;
  createdAt: number = 0;
  updatedAt: number = 0;
  memberIds?: Array<string> = [];
}
