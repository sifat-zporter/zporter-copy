import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SubtypeRepository } from '../tests/repository/subtype/subtype.repository';
import { ISubtypeRepository } from '../tests/repository/subtype/subtype.repository.interface';
import { Subtype } from '../tests/repository/subtype/subtype';
import { transformSubtypeToCategory } from './utils/transform-data';
import { TestsGroupRepository } from './repositories/tests-group.repository';
import { TestsGroup } from './entities/tests-group.entity';
import { TeamsService } from '../teams/teams.service';
import {
  GetAllMembersInTeam,
  TeamTab,
  TeamContactTab,
} from '../teams/dto/teams.req.dto';
import { Member, Test } from './types';
import { UserTypes } from '../users/enum/user-types.enum';
import * as mongoose from 'mongoose';
import { NotificationType } from '../notifications/dto/notifications.req.dto';
import { CreateNotificationDto } from '../notifications/dto/notifications.req.dto';
import { NotificationTitle } from '../notifications/dto/notifications.req.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TestsGroupService {
  constructor(
    @Inject(SubtypeRepository)
    private readonly subtypeRepo: ISubtypeRepository,

    @Inject(TestsGroupRepository)
    private readonly testsGroupRepository: TestsGroupRepository,

    @Inject(TeamsService)
    private readonly teamsService: TeamsService,

    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  async getTestsCategories() {
    const subtypes: Subtype[] = await this.subtypeRepo.get({
      match: {
        isDeleted: false,
      },
    });
    return transformSubtypeToCategory(subtypes);
  }

  private removeDuplicateMembers(members: Member[]): Member[] {
    const uniqueMembers = new Map<string, Member>();
    members.forEach((member) => {
      if (!uniqueMembers.has(member.userId)) {
        uniqueMembers.set(member.userId, member);
      }
    });
    return Array.from(uniqueMembers.values());
  }

  async getMembersFromTeams(
    roleId: string,
    teamIds: Array<{ teamId: string }>,
    tests?: any[],
  ) {
    const memberPromises = teamIds.map((team) =>
      this.teamsService.getAllMemberInTeam(roleId, team.teamId, {
        tab: TeamTab.MEMBER,
        contactTab: TeamContactTab.MEMBER,
      } as GetAllMembersInTeam),
    );
    const membersArrays = await Promise.all(memberPromises);

    const members = membersArrays
      .flat()
      .filter(
        (member: any) =>
          member.type === UserTypes.PLAYER && member.isActive === true,
      )
      .map((member: any) => {
        const baseMember = {
          userId: member.userId,
          fcmToken: member.fcmToken,
          username: `#${member.username}`,
          faceImage: member.faceImage || '',
          fullName: member.fullName,
          favoriteRoles: member.favoriteRoles?.join('/ ') || '',
          location: `${member.birthCountry?.alpha2Code || ''}${
            member.city ? `/${member.city}` : ''
          }`,
          clubName: member.clubName,
        };

        tests?.forEach((test) => {
          baseMember[test.id] = null;
        });

        return baseMember;
      });

    return this.removeDuplicateMembers(members);
  }

  async createTestsGroup(testsGroup: TestsGroup, roleId: string) {
    // Generate new ObjectId for the document
    testsGroup._id = new mongoose.Types.ObjectId();
    testsGroup.createdBy = roleId;

    let members: Member[] = [];
    if (testsGroup.teamIds && testsGroup.teamIds.length > 0) {
      members = await this.getMembersFromTeams(
        roleId,
        testsGroup.teamIds,
        testsGroup.tests,
      );
    }

    if (members.length > 0) {
      this.pushNotificationToMembers(
        members,
        roleId,
        testsGroup.tests,
        testsGroup._id.toString(),
      );
    }

    return await this.testsGroupRepository.createOrUpdate({
      ...testsGroup,
      members,
    } as TestsGroup);
  }

  async findTestsGroupById(id: string) {
    const testsGroup: TestsGroup = await this.testsGroupRepository.getOne({
      _id: id,
    });
    if (!testsGroup) {
      throw new NotFoundException(`Not found id [${id}]`);
    }
    return testsGroup;
  }

  async getTestsGroupsWithPagination(
    page = 1,
    limit = 10,
    createdBy?: string,
    teamId?: string,
    userRoleId?: string,
  ) {
    const matchCondition = {
      isDeleted: false,
      createdBy: createdBy,
      ...(userRoleId && {
        createdBy: userRoleId,
      }),
      ...(teamId && {
        teamIds: {
          $elemMatch: {
            teamId: teamId,
          },
        },
      }),
    };

    const [testsGroups, total] = await Promise.all([
      this.testsGroupRepository.get({
        match: matchCondition,
        page,
        pageSize: limit,
        keySort: {
          createdAt: -1,
        },
      }),
      this.testsGroupRepository.count(matchCondition),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const nextPage = page < totalPages ? page + 1 : null;

    return {
      count: total || 0,
      data: testsGroups || [],
      currentPage: page || 1,
      nextPage: nextPage || null,
      pageSize: limit || 10,
      totalPage: totalPages || 1,
    };
  }

  async deleteTestsGroup(id: string) {
    await this.findTestsGroupById(id);

    return await this.testsGroupRepository.createOrUpdate(
      { isDeleted: true } as TestsGroup,
      { _id: id },
    );
  }

  async updateTestsGroupColumns(
    id: string,
    updateData: { members?: Member[]; tests?: any[] },
  ) {
    await this.findTestsGroupById(id);

    if (updateData.members) {
      updateData.members = this.removeDuplicateMembers(updateData.members);
    }

    return await this.testsGroupRepository.createOrUpdate(
      {
        ...(updateData.members && { members: updateData.members }),
        ...(updateData.tests && { tests: updateData.tests }),
      } as TestsGroup,
      { _id: id },
    );
  }

  pushNotificationToMembers(
    members: Member[],
    userRoleId: string,
    tests: Test[],
    testsGroupId: string,
  ) {
    if (!members || !members.length) return;

    const content = tests.map((test) => test.label).join(', ');
    const domain = process.env.WEB_BASE_URL || 'http://localhost:3001';
    const testGroupUrl = `${domain}/tests-group/${testsGroupId}`;

    members.forEach(async (member: Member) => {
      const payload = new CreateNotificationDto();
      payload.token = member.fcmToken;
      payload.title = NotificationTitle.ZPORTER_TEST_GROUP;
      payload.notificationType = NotificationType.ADDED_TEST_RECORD_BY_COACH;
      payload.senderId = userRoleId;
      payload.receiverId = member.userId;
      payload.username = member.username;
      payload.largeIcon = member.faceImage;
      payload.userType = UserTypes.PLAYER;
      payload.content = `You have been added to a new test group. Test results: ${content}. View details: ${testGroupUrl}`;
      await this.notificationsService.sendMulticastNotification(payload);
    });
  }
}
