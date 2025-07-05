import { Injectable } from '@nestjs/common';
import { db } from '../../config/firebase.config';
import { hubspotClient } from '../../config/hubspot.config';
import { CreateHubspotContactDto } from './dto/create-hubspot-contact.dto';
import {
  CreateGuessSupportTicketDto,
  CreateSupportTicketDto,
} from './dto/create-support-ticket.dto';
import { UpdateHubspotContactDto } from './dto/update-hubspot-contact.dto';
import * as moment from 'moment';
import { mappingUserInfoById } from '../../helpers/mapping-user-info';

@Injectable()
export class CrmService {
  async createSupportTicket(
    roleId: string,
    createSupportTicketDto: CreateSupportTicketDto,
  ) {
    const { subject, content, priority } = createSupportTicketDto;
    const properties = {
      hs_pipeline: '0',
      hs_pipeline_stage: '1',
      hs_ticket_priority: priority,
      subject: subject,
      content: content,
    };
    const CreateTicketObjectInput = { properties };

    const createTicketResponse =
      await hubspotClient.crm.tickets.basicApi.create(CreateTicketObjectInput);

    const {
      clubName,
      currentTeams,
      firstName,
      lastName,
      email,
      birthDay,
      type,
      city,
      uid,
    } = await mappingUserInfoById(roleId);
    
    const hubspotContactDto = {
      firstname: firstName,
      lastname: lastName,
      email: email,
      user_id: uid,
      user_type: type,
      date_of_birth: moment.utc(birthDay).format('LL'),
      city: city,
      club: clubName,
      team_name: currentTeams.length ? currentTeams[0] : 'N/A',
    };

    let hubspotContactId: string;
    hubspotContactId = await this.checkOtherRolesIfHubspotIdExists(uid);
    
    const newHubspotContact = await this.createHubspotContact(
      hubspotContactDto,
    );

    hubspotContactId = newHubspotContact.id;
    await this.updateHubspotContactIdToCurrentRole(roleId, hubspotContactId);

    return await this.createHubspotAssociate(
      createTicketResponse.id,
      hubspotContactId,
      createSupportTicketDto,
    );
  }

  async createGuessSupportTicket(
    createGuessSupportTicketDto: CreateGuessSupportTicketDto,
  ) {
    const { subject, content, priority, email, phone, name } =
      createGuessSupportTicketDto;
    const properties = {
      hs_pipeline: '0',
      hs_pipeline_stage: '1',
      hs_ticket_priority: priority,
      subject: subject,
      content: content,
      email,
      phone,
      name,
    };
    const CreateTicketObjectInput = { properties };

    const createTicketResponse =
      await hubspotClient.crm.tickets.basicApi.create(CreateTicketObjectInput);

    return {
      ...createTicketResponse.properties,
    };
  }

  async updateHubspotContactIdToCurrentRole(roleId: string, hubspotId: string) {
    await db.collection('users').doc(roleId).set(
      {
        hubspotId,
      },
      { merge: true },
    );
  }

  async checkOtherRolesIfHubspotIdExists(uid: string): Promise<string> {
    const userRefs = await db.collection('users').where('uid', '==', uid).get();

    let hubspotId: any = null;

    userRefs.forEach((doc) => {
      const data = doc.data();

      if (data.hubspotId) {
        hubspotId = data.hubspotId;
      }
    });

    return hubspotId;
  }

  async updateHubspotContact(
    contactId: string,
    updateHubspotContactDto: UpdateHubspotContactDto,
  ) {
    const properties = {
      ...updateHubspotContactDto,
    };
    try {
      return await hubspotClient.crm.contacts.basicApi.update(
        contactId,
        { properties },
      );
    } 
    catch (error) {
      return await hubspotClient.crm.contacts.basicApi.create( {properties} );
    }
  }

  async createHubspotContact(createHubspotContactDto: CreateHubspotContactDto) {
    const properties = {
      ...createHubspotContactDto,
    };
    
    try {
      return await hubspotClient.crm.contacts.basicApi.create({ properties });
    } 
    catch (error) {
      const hubspotId: string = error.body.message.split('ID: ')[1];
      
      return await hubspotClient.crm.contacts.basicApi.update(hubspotId, {properties} );
    }
  }

  async createHubspotAssociate(
    ticketId: string,
    contactId: string,
    createSupportTicketDto: CreateSupportTicketDto,
  ) {
    try {
      const apiResponse =
        await hubspotClient.crm.tickets.associationsApi.create(
          ticketId,
          'CONTACT',
          contactId,
          'ticket_to_contact',
        );

      return {
        ticketId: apiResponse.id,
        associations: apiResponse.associations,
        ...createSupportTicketDto,
      };
    } catch (e) {
      e.message === 'HTTP request failed'
        ? console.error(JSON.stringify(e.response, null, 2))
        : console.error(e);
    }
  }
}
