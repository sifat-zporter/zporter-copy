import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from './interfaces/team.interface';
import { CreateTeamReqDto } from './dto/create-team.req.dto';

@Injectable()
export class TeamsRepository {
  constructor(@InjectModel('Team') private readonly teamModel: Model<Team>) {}

  async createYouthTeam(createTeamDto: CreateTeamReqDto): Promise<Team> {
    const newTeam = new this.teamModel({
      ...createTeamDto,
      source: 'zporter',
      type: 'youth',
    });
    return newTeam.save();
  }

  async findByName(name: string): Promise<Team[]> {
    return this.teamModel.find({ name: new RegExp(name, 'i') }).exec();
  }

  async findById(id: string): Promise<Team> {
    return this.teamModel.findById(id).exec();
  }
}