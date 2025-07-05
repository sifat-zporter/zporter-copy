import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ResponseMessage } from '../../common/constants/common.constant';
import { db } from '../../config/firebase.config';
import { sendEmail } from '../../utils/email-service';
import { GenerateCodeDto } from './dto/generate-code.dto';
import { SendInvitationCodeDto } from './dto/send-invitation-code.dto';
import { OutputUserInfoDto } from './dto/user-info.dto';

@Injectable()
export class InvitationService {
  async generateInvitationCodeService(
    generateCode: GenerateCodeDto,
    currentUserId: string,
  ): Promise<string> {
    const userRef = await db
      .collection('users')
      .doc(generateCode?.userId)
      .get();

    const userInfo = userRef.data();

    if (!userInfo) {
      throw new HttpException(
        ResponseMessage.User.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    await db.collection('invitation').add({
      invitationCode: generateCode.inviteCode,
      userId: generateCode?.userId ? generateCode?.userId : currentUserId,
    });
    return ResponseMessage.Invitation.GENERATE_INVITATION_CODE;
  }

  async sendInvitationCodeThroughEmailService(
    sendInvitationCodeDto: SendInvitationCodeDto,
  ): Promise<string> {
    if (sendInvitationCodeDto.emails.length === 0) {
      throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
    }
    const data = await this.getInviterByInvitationCodeService(
      sendInvitationCodeDto.inviteCode,
    );
    const subject = 'Invitation code';
    const content = `<div>
        username: ${data.username}<br>
        firstName: ${data.firstName}<br>
        lastName: ${data.lastName}<br>
        inviteCode: ${sendInvitationCodeDto.inviteCode}<br>
      </div>`;
    await sendEmail(sendInvitationCodeDto.emails, content, subject);
    return ResponseMessage.Invitation.SEND_EMAIL_INVITATION_CODE;
  }

  async getInviterByInvitationCodeService(
    inviteCode: string,
  ): Promise<OutputUserInfoDto> {
    let userId: string;

    const result = new OutputUserInfoDto();

    const invitationRef = await db
      .collection('invitation')
      .where('invitationCode', '==', inviteCode)
      .get();

    invitationRef.forEach((doc) => (userId = doc.data().userId));

    if (!userId) {
      throw new HttpException(
        ResponseMessage.Invitation.NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    const userRef = await db.collection('users').doc(userId).get();

    const userInfo = userRef.data();

    result.inviterId = userId;
    result.username = userInfo?.username;
    result.firstName = userInfo?.profile?.firstName;
    result.lastName = userInfo?.profile?.lastName;
    result.faceImage = userInfo?.media?.faceImage
      ? userInfo?.media?.faceImage
      : process.env.DEFAULT_IMAGE;
    result.type = userInfo?.type;

    return result;
  }
}
