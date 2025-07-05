export enum Status {
  NON_FRIEND = 'no_relationship',
  REQUESTED = 'requested',
  RESPONSE = 'response',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  FOLLOW_BACK = 'follow_back',
  OWN_REQUESTED = 'own_requested',
}

export enum TypeRequest {
  FOLLOW = 'follows',
  FRIEND = 'friends',
  FAN = 'fans',
  HEAD_2_HEAD = 'head_2_head',
}
