import { ValidateNested } from 'class-validator';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Diary } from '../../diaries/entities/diaries.entity';
import { Friend } from '../../friends/entities/friends.entity';
import { CoachCareerDto } from '../dto/coach/coach-career.dto';
import { CoachSkillsDto } from '../dto/coach/coach-skills.dto';
import { PlayerCareerDto } from '../dto/player/player-career.dto';
import { PlayerSkillsDto } from '../dto/player/player-skills.dto';
import { UserMediaDto } from '../dto/user/user-media.dto';
import { UserProfileDto } from '../dto/user/user-profile.dto';
import { UserSettingsDto } from '../dto/user/user-settings.dto';
import { UserSocialLinksDto } from '../dto/user/user-social-links.dto';
import { UserTypes } from '../enum/user-types.enum';
import { Document } from 'mongoose';
@Entity('users')
export class User {
  @PrimaryColumn({ comment: 'documentId' })
  id: string;

  @Column({ nullable: true })
  uid: string;

  @Column('jsonb', { nullable: true })
  account: {
    email: string;
    isActive: boolean;
    createdAt: number;
    expiredIn: number;
    isVerified: boolean;
    verifyCode: string;
  };

  @Column({ nullable: true })
  fullName: string;

  @Column('jsonb', { nullable: true })
  @ValidateNested()
  profile: UserProfileDto;

  @Column('jsonb', { nullable: true })
  @ValidateNested()
  media: UserMediaDto;

  @Column('jsonb', { nullable: true })
  @ValidateNested()
  settings: UserSettingsDto;

  @Column('jsonb', { nullable: true })
  @ValidateNested()
  socialLinks: UserSocialLinksDto;

  @Column({ default: process.env.DEFAULT_TIMEZONE, nullable: true })
  timezone: string;

  @Column({
    type: 'enum',
    enum: UserTypes,
    default: UserTypes.PLAYER,
    nullable: true,
  })
  type: UserTypes;

  @Column({ nullable: true })
  username: string;

  @Column({ default: 50 })
  circleCompleted: number;

  @Column('jsonb', { nullable: true })
  fcmToken: string[];

  @Column({
    type: 'bigint',
    nullable: true,
  })
  updatedAt: number;

  @Column({ default: false })
  isOnline: boolean;

  @Column('jsonb', { nullable: true })
  career: PlayerCareerDto | CoachCareerDto;

  @Column('jsonb', { nullable: true })
  skills: PlayerSkillsDto | CoachSkillsDto;

  @OneToMany(() => Friend, (friend: Friend) => friend.relationship)
  friends: Friend[];

  @OneToMany(() => Diary, (diaries: Diary) => diaries.userId)
  diaries: Diary[];
}

export class UserForMongo implements User {
  id: string;
  uid: string;
  account: {
    email: string;
    isActive: boolean;
    createdAt: number;
    expiredIn: number;
    isVerified: boolean;
    verifyCode: string;
  };
  fullName: string;
  profile: UserProfileDto;
  media: UserMediaDto;
  settings: UserSettingsDto;
  socialLinks: UserSocialLinksDto;
  timezone: string;
  type: UserTypes;
  username: string;
  circleCompleted: number;
  fcmToken: string[];
  isOnline: boolean;
  career: PlayerCareerDto | CoachCareerDto;
  skills: PlayerSkillsDto | CoachSkillsDto;
  friends: Friend[];
  diaries: Diary[];
  teamIds: string[];
  roleId: string;
  userId: string;
  totalPoint: number;
  timeoutTotalPoint: number;

  updatedAt: number;
  isDeleted: boolean;
}
