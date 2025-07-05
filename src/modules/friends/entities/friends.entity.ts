import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Status, TypeRequest } from '../enum/friend.enum';

@Entity('users_relationships')
export class Friend {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  requestId: string;

  @Column()
  userId: string;

  @Column()
  receiverId: string;

  @Column({
    type: 'enum',
    enum: Status,
    default: Status.ACCEPTED,
  })
  status: Status;

  @Column({
    type: 'enum',
    enum: TypeRequest,
    default: TypeRequest.FRIEND,
  })
  relationshipType: TypeRequest;

  @Column({ type: 'bigint' })
  createdAt: number;

  @Column({ type: 'bigint' })
  updatedAt: number;

  @ManyToOne(() => User, (relationship: User) => relationship.friends, {
    deferrable: 'INITIALLY DEFERRED',
  })
  relationship: User;
}
