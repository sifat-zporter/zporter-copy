// import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { Schema as MongooseSchema } from 'mongoose';
// import { TeamsController } from './teams.controller';
// import { TeamsService } from './teams.service';
// import { TeamsRepository } from './teams.repository';
// import { FixturesModule } from '../fixtures/fixtures.module';

// @Module({
//   imports: [
//     FixturesModule,
//     MongooseModule.forFeature([
//       {
//         name: 'Team',
//         schema: new MongooseSchema(
//           {
//             name: { type: String, required: true, index: true },
//             source: { type: String, enum: ['zporter', 'sportmonks'], default: 'zporter', required: true },
//             sportmonksId: { type: Number, unique: true, sparse: true, index: true },
//             type: { type: String, enum: ['professional', 'youth'], required: true },
//             logoUrl: { type: String },
//             country: { type: String },
//           },
//           { timestamps: true },
//         ),
//       },
//     ]),
//   ],
//   controllers: [TeamsController],
//   providers: [TeamsService, TeamsRepository],
// })
// export class MatchTeamModule {} // <-- Renamed from TeamsModule

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { TeamsRepository } from './teams.repository';
import { SportmonksModule } from '../sportmonks/sportmonks.module'; 

@Module({
  imports: [
    SportmonksModule,
    MongooseModule.forFeature([
      {
        name: 'Team',
        schema: new MongooseSchema(
          {
            name: { type: String, required: true, index: true },
            source: { type: String, enum: ['zporter', 'sportmonks'], default: 'zporter', required: true },
            sportmonksId: { type: Number, unique: true, sparse: true, index: true },
            type: { type: String, enum: ['professional', 'youth'], required: true },
            logoUrl: { type: String },
            country: { type: String },
          },
          { timestamps: true },
        ),
      },
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService, TeamsRepository],
})
export class MatchTeamModule {}