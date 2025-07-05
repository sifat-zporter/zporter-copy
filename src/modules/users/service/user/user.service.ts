import { Inject, Injectable } from '@nestjs/common';
import { AbstractService } from '../../../abstract/abstract.service';
import { UserRepository } from '../../repositories/user/user.repository';
import { IUserRepository } from '../../repositories/user/user.repository.interface';
import { IUserService } from './user.service.interface';

@Injectable()
export class UserService
  extends AbstractService<IUserRepository>
  implements IUserService
{
  constructor(
    @Inject(UserRepository)
    private readonly userRepository: IUserRepository,
  ) {
    super(userRepository);
  }
}
