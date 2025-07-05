import { ValidateNested } from 'class-validator';
import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import {
  CoachCreateDiaryMatchDto,
  CoachCreateDiaryTrainingDto,
  PlayerCreateDiaryMatchDto,
  PlayerCreateDiaryTrainingDto,
} from '../dto/diaries.req.dto';
import {
  EatAndDrink,
  EnergyLevel,
  Sleep,
  TypeOfDiary,
} from '../enum/diaries.enum';

@Entity('diaries')
export class Diary {
  @PrimaryColumn({ comment: 'documentId' })
  id: string;

  @Column({
    type: 'enum',
    enum: EnergyLevel,
    default: EnergyLevel.BAD,
    nullable: true,
  })
  energyLevel: EnergyLevel;

  @Column({
    type: 'enum',
    enum: EatAndDrink,
    default: EatAndDrink.GOOD,
    nullable: true,
  })
  eatAndDrink: EatAndDrink;

  @Column({
    type: 'enum',
    enum: Sleep,
    default: Sleep.BAD,
    nullable: true,
  })
  sleep: Sleep;

  @Column('jsonb', { nullable: true })
  @ValidateNested()
  training: PlayerCreateDiaryTrainingDto | CoachCreateDiaryTrainingDto;

  @Column('jsonb', { nullable: true })
  @ValidateNested()
  match: PlayerCreateDiaryMatchDto | CoachCreateDiaryMatchDto;

  @Column({
    type: 'enum',
    enum: TypeOfDiary,
    default: TypeOfDiary.TRAINING,
    nullable: true,
  })
  typeOfDiary: TypeOfDiary;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  createdAt: number;

  @Column({
    type: 'bigint',
    nullable: true,
  })
  updatedAt: number;

  @ManyToOne(() => User, (userId: User) => userId.diaries, {
    deferrable: 'INITIALLY DEFERRED',
  })
  userId: User;
}
